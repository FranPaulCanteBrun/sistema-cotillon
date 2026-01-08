/**
 * ArcaTokenManager - Gestor de Tokens de Acceso AFIP (WSAA)
 * 
 * Responsabilidades:
 * - Construir TRA (Ticket de Requerimiento de Acceso)
 * - Firmar TRA con CMS usando certificado P12
 * - Obtener Token + Sign desde WSAA
 * - Cachear Token/Sign con expiración (~12h)
 * - Renovar automáticamente cuando expire
 * - Logs seguros (nunca exponer Token/Sign)
 */

import { XMLParser } from 'fast-xml-parser'
import { env, isFiscalEnabled } from '../../config/env.js'
import { prisma } from '../../config/database.js'

// node-forge no tiene soporte nativo para ES modules
// Usamos importación dinámica para cargarlo correctamente
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let forge: any

interface TokenCache {
  token: string
  sign: string
  expirationTime: number // Timestamp en milisegundos
  obtainedAt: number // Timestamp cuando se obtuvo
}


export class ArcaTokenManager {
  private static instance: ArcaTokenManager | null = null
  private tokenCache: TokenCache | null = null
  private refreshPromise: Promise<{ token: string; sign: string }> | null = null

  // Endpoints WSAA según entorno
  // IMPORTANTE: WSAA es un servicio DIFERENTE de WSFEv1
  // WSAA = Web Service de Autenticación y Autorización (obtener Token + Sign)
  // WSFEv1 = Web Service de Facturación Electrónica (usar Token + Sign para emitir comprobantes)
  // Nota: WSAA usa SOAP 1.1, no SOAP 1.2
  // Según WSAA Manual del Desarrollador (Pub. 20.2.19)
  // Nota: ARCA puede no estar disponible, usar AFIP como fallback
  // El manual menciona ARCA pero AFIP también funciona y es más accesible
  private readonly WSAA_URLS = {
    homo: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    prod: 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
  }

  // Service para WSFE
  private readonly SERVICE = 'wsfe'

  // Margen de seguridad para renovar antes de expirar (5 minutos)
  private readonly REFRESH_MARGIN_MS = 5 * 60 * 1000

  private constructor() {
    if (!isFiscalEnabled()) {
      throw new Error('Facturación electrónica no está configurada. Verifica las variables de entorno AFIP_*')
    }
    // Cargar TA desde DB al inicializar (si existe y está vigente)
    // No esperamos a que termine, se carga en background
    this.loadTokenFromDB().catch((error) => {
      console.warn('⚠️ No se pudo cargar TA desde DB al iniciar:', error instanceof Error ? error.message : 'Error desconocido')
      // No es crítico, simplemente no habrá cache inicial
    })
  }

  /**
   * Singleton pattern - una sola instancia del TokenManager
   */
  static getInstance(): ArcaTokenManager {
    if (!ArcaTokenManager.instance) {
      ArcaTokenManager.instance = new ArcaTokenManager()
    }
    return ArcaTokenManager.instance
  }

  /**
   * Obtener Token y Sign válido (NO fuerza refresh si hay cache válido)
   * Este es el método que deben usar los consumidores normales (WSFE, poller, etc.)
   * Solo solicita a WSAA si no hay cache válido o está vencido
   * 
   * Flujo optimizado:
   * 1. Verificar cache en memoria
   * 2. Si no hay en memoria, cargar desde DB
   * 3. Evaluar si está vencido
   * 4. Solo entonces llamar a WSAA si es necesario
   */
  async getTokenAndSign(): Promise<{ token: string; sign: string }> {
    // 1. Verificar si el cache en memoria es válido
    if (this.isCacheValid() && this.tokenCache) {
      const expiresInMinutes = Math.floor((this.tokenCache.expirationTime - Date.now()) / 60000)
      console.log(`✅ [TA] Using cached TA (memory), expiresInMinutes=${expiresInMinutes}`)
      return {
        token: this.tokenCache.token,
        sign: this.tokenCache.sign
      }
    }

    // 2. Si no hay cache en memoria válido, intentar cargar desde DB
    if (!this.tokenCache || !this.isCacheValid()) {
      console.log('🔄 [TA] No valid cache in memory, loading from DB...')
      await this.loadTokenFromDB()
      
      // 3. Verificar si el cache cargado desde DB es válido
      if (this.isCacheValid() && this.tokenCache) {
        const expiresInMinutes = Math.floor((this.tokenCache.expirationTime - Date.now()) / 60000)
        console.log(`✅ [TA] Using cached TA (DB), expiresInMinutes=${expiresInMinutes}`)
        return {
          token: this.tokenCache.token,
          sign: this.tokenCache.sign
        }
      }
    }

    // 4. Si hay un refresh en progreso, esperar a que termine
    if (this.refreshPromise) {
      console.log('⏳ [TA] Waiting for ongoing refresh...')
      return this.refreshPromise
    }

    // 5. No hay cache válido (ni memoria ni DB), necesitamos obtener uno nuevo de WSAA
    console.log('🔄 [TA] No valid cache (memory or DB), requesting from WSAA...')
    this.refreshPromise = this.refreshToken()
    
    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Forzar renovación del TA (solo para administración/debug)
   * Este método SIEMPRE llama a WSAA, incluso si hay cache válido
   */
  async forceRefreshToken(): Promise<{ token: string; sign: string }> {
    console.log('🔄 [TA] Force refreshing token (ignoring cache)...')
    // Invalidar cache primero
    this.tokenCache = null
    this.refreshPromise = this.refreshToken()
    
    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Verificar si el cache es válido
   */
  private isCacheValid(): boolean {
    if (!this.tokenCache) {
      return false
    }

    const now = Date.now()
    const timeUntilExpiration = this.tokenCache.expirationTime - now

    // Cache válido si no ha expirado y tiene margen de seguridad
    return timeUntilExpiration > this.REFRESH_MARGIN_MS
  }

  /**
   * Renovar token desde WSAA
   * PRIVADO: Solo se llama desde getTokenAndSign() o forceRefreshToken()
   */
  private async refreshToken(): Promise<{ token: string; sign: string }> {
    try {
      // Verificar si hay cache válido ANTES de llamar a WSAA
      // Si hay cache válido, no deberíamos estar aquí (getTokenAndSign debería haberlo devuelto)
      // Pero por seguridad, verificamos de nuevo
      if (this.isCacheValid() && this.tokenCache) {
        console.log('✅ [TA] Valid cache found during refresh, returning cached TA')
        return {
          token: this.tokenCache.token,
          sign: this.tokenCache.sign
        }
      }

      // 1. Construir TRA
      const tra = await this.buildTRA()
      console.log('📝 [TA] TRA generado completo:')
      console.log(tra)

      // 2. Firmar TRA con CMS
      const signedTra = await this.signTRA(tra)
      console.log('✅ [TA] TRA firmado correctamente. Longitud del CMS:', signedTra.length)

      // 3. Obtener Token + Sign desde WSAA
      const { token, sign, expirationTime } = await this.requestTokenFromWSAA(signedTra)

      // 4. Actualizar cache en memoria
      this.tokenCache = {
        token,
        sign,
        expirationTime,
        obtainedAt: Date.now()
      }

      // 5. Persistir en DB (async, no bloquea)
      this.saveTokenToDB(token, sign, expirationTime).catch((error) => {
        console.warn('⚠️ No se pudo persistir TA en DB:', error instanceof Error ? error.message : 'Error desconocido')
        // No es crítico, el cache en memoria funciona
      })

      // Log seguro (sin exponer token/sign)
      const expiresInMinutes = Math.floor((expirationTime - Date.now()) / 60000)
      console.log(`✅ Token WSAA obtenido exitosamente. Expira en ${expiresInMinutes} minutos`)

      return { token, sign }
    } catch (error) {
      console.error('❌ Error al renovar token WSAA:', error instanceof Error ? error.message : 'Error desconocido')
      throw error
    }
  }

  /**
   * Construir TRA (Ticket de Requerimiento de Acceso)
   * Según WSAA Manual del Desarrollador v20.2.19:
   * - source y destination son OPCIONALES y el manual RECOMIENDA NO incluirlos
   * - Fechas: formato xsd:dateTime con timezone GMT-3
   * - Clock-skew: generationTime = now - 60s para evitar desfasajes
   * - Encoding: UTF-8 (como en el ejemplo del manual)
   * - Case-sensitive: todo en minúsculas
   */
  private async buildTRA(): Promise<string> {
    const now = new Date()
    // Clock-skew: restar 60s al generationTime según recomendación del manual
    const generationTimeDate = new Date(now.getTime() - 60 * 1000)
    const expiration = new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12 horas

    // Formato de fecha xsd:dateTime con timezone (ejemplo: 2018-01-29T13:52:57.467-03:00)
    const formatDateTime = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      const milliseconds = String(date.getMilliseconds()).padStart(3, '0')
      
      // Obtener timezone offset en formato -03:00 (GMT-3 para Argentina)
      const offset = -date.getTimezoneOffset() // minutos desde UTC
      const offsetHours = Math.floor(Math.abs(offset) / 60)
      const offsetMinutes = Math.abs(offset) % 60
      const offsetSign = offset >= 0 ? '+' : '-'
      const timezone = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`
      
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezone}`
    }

    const generationTime = formatDateTime(generationTimeDate)
    const expirationTime = formatDateTime(expiration)

    // Construir XML del TRA SIN source/destination (recomendación explícita del manual)
    // El manual dice que son opcionales y recomienda NO incluirlos para evitar problemas
    // IMPORTANTE: uniqueId debe ser en SEGUNDOS (Unix timestamp), no milisegundos
    // El manual usa date('U') que devuelve segundos (10 dígitos), no milisegundos (13 dígitos)
    // Valores de 13 dígitos pueden violar el XSD y causar xml.bad
    const uniqueId = Math.floor(Date.now() / 1000) // Unix timestamp en segundos
    
    const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${generationTime}</generationTime>
    <expirationTime>${expirationTime}</expirationTime>
  </header>
  <service>${this.SERVICE}</service>
</loginTicketRequest>`

    // Logging para validación
    console.log('🔍 Validación del TRA:')
    console.log(`   uniqueId: ${uniqueId} (${String(uniqueId).length} dígitos - debe ser 10)`)
    console.log(`   generationTime: ${generationTime}`)
    console.log(`   expirationTime: ${expirationTime}`)
    console.log(`   service: ${this.SERVICE}\n`)

    return tra
  }

  // NOTA: getCertificateDN() fue eliminado porque ya no se usa
  // El TRA ahora se genera sin source/destination según recomendación del manual WSAA

  /**
   * Firmar TRA con CMS usando certificado P12
   */
  private async signTRA(tra: string): Promise<string> {
    try {
      // Cargar node-forge dinámicamente si no está cargado
      if (!forge) {
        const forgeModule = await import('node-forge') as any
        // node-forge se exporta como default en ES modules
        forge = forgeModule.default || forgeModule
        // Verificar que se cargó correctamente
        if (!forge || !forge.asn1) {
          throw new Error('No se pudo cargar node-forge correctamente. Verifica la instalación.')
        }
      }

      // Decodificar certificado desde Base64
      const certBuffer = Buffer.from(env.AFIP_CERT_P12_BASE64!, 'base64')

      // Cargar certificado P12
      const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'))
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, env.AFIP_CERT_P12_PASSWORD!)

      // Obtener clave privada y certificado
      const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
      const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
      
      if (!keyBag || !keyBag.key) {
        throw new Error('No se pudo extraer la clave privada del certificado P12')
      }

      const privateKey = keyBag.key

      // Obtener certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
      const certBag = certBags[forge.pki.oids.certBag]?.[0]
      
      if (!certBag || !certBag.cert) {
        throw new Error('No se pudo extraer el certificado del archivo P12')
      }

      const certificate = certBag.cert

      // Crear mensaje CMS firmado
      const p7 = forge.pkcs7.createSignedData()
      p7.content = forge.util.createBuffer(tra, 'utf8')
      
      // Calcular message-digest del contenido (requerido por PKCS #7)
      const md = forge.md.sha256.create()
      md.update(tra, 'utf8')
      const messageDigest = md.digest().bytes()
      
      // IMPORTANTE: Agregar el certificado ANTES de agregar el signer
      // WSAA requiere que el certificado esté incluido en el CMS
      p7.addCertificate(certificate)

      p7.addSigner({
        key: privateKey,
        certificate,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data
          },
          {
            type: forge.pki.oids.messageDigest,
            value: messageDigest
          },
          {
            type: forge.pki.oids.signingTime,
            value: new Date()
          }
        ]
      })

      // Firmar con detached: false (incluye el contenido en el CMS)
      // Según manual WSAA: usar !PKCS7_DETACHED (NO detached)
      p7.sign({ detached: false })

      // Convertir a Base64
      const signedData = forge.asn1.toDer(p7.toAsn1()).getBytes()
      let signedBase64 = Buffer.from(signedData, 'binary').toString('base64')

      // IMPORTANTE: Según manual WSAA, lo que se envía a loginCms(in0) debe ser
      // SOLO el CMS en Base64 (como el texto entre BEGIN CMS y END CMS, sin incluir marcadores)
      // - Sin headers MIME
      // - Sin marcadores BEGIN/END CMS
      // - Solo caracteres Base64: [A-Za-z0-9+/=] y saltos de línea opcionales
      
      // Limpiar cualquier header MIME o marcador que pueda haber
      signedBase64 = signedBase64
        .replace(/-----BEGIN CMS-----/g, '')
        .replace(/-----END CMS-----/g, '')
        .replace(/Content-Type:.*?\n/gi, '')
        .replace(/MIME-Version:.*?\n/gi, '')
        .replace(/Content-Transfer-Encoding:.*?\n/gi, '')
        .trim()

      // Validar que sea solo Base64 válido
      const base64Regex = /^[A-Za-z0-9+/=\s\n]*$/
      if (!base64Regex.test(signedBase64)) {
        throw new Error('El CMS generado contiene caracteres inválidos (no es Base64 puro)')
      }

      // Remover saltos de línea opcionales (el manual dice que son opcionales)
      signedBase64 = signedBase64.replace(/\s+/g, '')

      // Logging para diagnóstico
      console.log('🔍 Validación del CMS:')
      console.log(`   Longitud: ${signedBase64.length} caracteres`)
      console.log(`   Primeros 80 chars: ${signedBase64.substring(0, 80)}`)
      console.log(`   Últimos 80 chars: ${signedBase64.substring(signedBase64.length - 80)}`)
      console.log(`   ¿Tiene headers MIME?: ${signedBase64.includes('Content-Type') || signedBase64.includes('MIME-Version') ? 'SÍ ❌' : 'NO ✅'}`)
      console.log(`   ¿Tiene marcadores BEGIN/END?: ${signedBase64.includes('BEGIN') || signedBase64.includes('END') ? 'SÍ ❌' : 'NO ✅'}`)
      console.log(`   ¿Es Base64 válido?: ${base64Regex.test(signedBase64) ? 'SÍ ✅' : 'NO ❌'}\n`)
      
      return signedBase64
    } catch (error) {
      if (error instanceof Error && error.message.includes('password')) {
        throw new Error('Contraseña del certificado P12 incorrecta')
      }
      throw new Error(`Error al firmar TRA: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Solicitar Token + Sign desde WSAA
   */
  private async requestTokenFromWSAA(signedTra: string): Promise<{
    token: string
    sign: string
    expirationTime: number
  }> {
    const wsaaUrl = this.WSAA_URLS[env.AFIP_ENV]

    // Construir SOAP request según WSAA Manual del Desarrollador 20.2.19
    // IMPORTANTE: WSAA requiere SOAP 1.1 (no SOAP 1.2) con namespaces exactos
    // - Envelope: http://schemas.xmlsoap.org/soap/envelope/ (SOAP 1.1)
    // - Namespace wsaa: http://wsaa.view.sua.dvadac.desein.afip.gov
    // - Body: <wsaa:loginCms><wsaa:in0>...CMS...</wsaa:in0></wsaa:loginCms>
    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <wsaa:loginCms xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
      <wsaa:in0>${this.escapeXml(signedTra)}</wsaa:in0>
    </wsaa:loginCms>
  </soap:Body>
</soap:Envelope>`

    // Validar que el CMS en el SOAP sea solo Base64
    const in0Match = soapBody.match(/<wsaa:in0>([^<]+)<\/wsaa:in0>/) || soapBody.match(/<in0>([^<]+)<\/in0>/)
    const in0Content = in0Match?.[1] || ''
    const in0Decoded = in0Content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📤 Enviando request SOAP a WSAA:')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('URL:', wsaaUrl)
    console.log('CMS Length:', signedTra.length, 'caracteres Base64')
    console.log('Validación del contenido de <in0>:')
    console.log(`   Primeros 120 chars: ${in0Decoded.substring(0, 120)}`)
    console.log(`   Últimos 120 chars: ${in0Decoded.substring(Math.max(0, in0Decoded.length - 120))}`)
    console.log(`   ¿Contiene headers MIME?: ${in0Decoded.includes('Content-Type') || in0Decoded.includes('MIME-Version') ? 'SÍ ❌' : 'NO ✅'}`)
    console.log(`   ¿Contiene marcadores BEGIN/END?: ${in0Decoded.includes('BEGIN') || in0Decoded.includes('END') ? 'SÍ ❌' : 'NO ✅'}`)
    console.log('SOAP Body (sin CMS completo):')
    // Mostrar el SOAP sin el CMS completo (solo preview)
    const cmsStart = soapBody.indexOf(signedTra.substring(0, 20))
    if (cmsStart > 0) {
      console.log(soapBody.substring(0, cmsStart) + '...[CMS firmado de ' + signedTra.length + ' caracteres]...')
    } else {
      console.log(soapBody.substring(0, 500) + '...')
    }
    console.log('═══════════════════════════════════════════════════════════\n')

    try {
      const response = await fetch(wsaaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '"http://wsaa.view.sua.dvadac.desein.afip.gov/loginCms"'
        },
        body: soapBody
      })

      const responseText = await response.text()

      // Guardar response según recomendación del manual
      try {
        const fs = await import('fs')
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const responseLogPath = `backend/logs/response-loginCms-${timestamp}.xml`
        fs.writeFileSync(responseLogPath, responseText, 'utf8')
        console.log('📝 Response guardado en:', responseLogPath)
      } catch (logError) {
        console.warn('⚠️ No se pudo guardar el log del response:', logError)
      }

      if (!response.ok) {
        // Verificar primero si es el error "alreadyAuthenticated" (buscar directamente en el texto)
        // Este es un caso especial: el request fue correcto, pero WSAA tiene un TA activo
        // Significa que WSAA ya emitió un TA válido recientemente para este service (wsfe) y certificado
        if (responseText.includes('alreadyAuthenticated') || responseText.includes('ya posee un TA valido')) {
          console.log('\n✅ [TA] WSAA indica que ya hay un TA válido (alreadyAuthenticated)')
          
          // Intentar cargar desde DB si no está en memoria
          if (!this.tokenCache) {
            console.log('   🔄 [TA] No hay TA en memoria, intentando cargar desde DB...')
            await this.loadTokenFromDB()
          }
          
          // Si tenemos un TA en cache (memoria o DB), devolverlo
          if (this.tokenCache && this.isCacheValid()) {
            const expiresInMinutes = Math.floor((this.tokenCache.expirationTime - Date.now()) / 60000)
            console.log(`   ✅ [TA] TA válido encontrado en cache, devolviéndolo (expira en ${expiresInMinutes} minutos)`)
            return {
              token: this.tokenCache.token,
              sign: this.tokenCache.sign,
              expirationTime: this.tokenCache.expirationTime
            }
          }
          
          // Si hay cache pero está vencido, intentar cargar desde DB de nuevo
          if (this.tokenCache && !this.isCacheValid()) {
            console.log('   ⚠️ [TA] TA en cache está vencido, intentando cargar desde DB...')
            await this.loadTokenFromDB()
            if (this.tokenCache && this.isCacheValid()) {
              const expiresInMinutes = Math.floor((this.tokenCache.expirationTime - Date.now()) / 60000)
              console.log(`   ✅ [TA] TA válido cargado desde DB, devolviéndolo (expira en ${expiresInMinutes} minutos)`)
              return {
                token: this.tokenCache.token,
                sign: this.tokenCache.sign,
                expirationTime: this.tokenCache.expirationTime
              }
            }
          }
          
          // Si NO hay TA válido en cache/DB, esto es un problema
          console.log('   ❌ [TA] NO hay TA válido en cache/DB (desincronización con WSAA)')
          console.log('   💡 [TA] WSAA tiene un TA válido pero local no. Esto puede pasar si:')
          console.log('      - El TA fue obtenido en otro proceso/servidor')
          console.log('      - El TA fue eliminado de DB pero WSAA aún lo tiene')
          console.log('   💡 [TA] Solución: Esperar a que expire el TA en WSAA o invalidar cache y reintentar\n')
          throw new Error('WSAA_ALREADY_AUTHENTICATED_NO_CACHE: WSAA tiene un TA válido pero no está disponible localmente. Esperar expiración o invalidar cache.')
        }
        
        // Log completo de la respuesta para debugging
        console.error('=== WSAA Error Response ===')
        console.error('Status:', response.status, response.statusText)
        console.error('URL:', wsaaUrl)
        console.error('Response Body:', responseText)
        console.error('==========================')
        
        // Intentar parsear si es un error SOAP
        try {
          const parser = new XMLParser({ ignoreAttributes: false })
          const parsed = parser.parse(responseText) as any
          const fault = parsed['soap:Envelope']?.['soap:Body']?.['soap:Fault'] || 
                       parsed['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault'] ||
                       parsed['Envelope']?.['Body']?.['Fault']
          if (fault) {
            const faultString = fault.faultstring || fault.faultString || fault.detail?.message || 'Error desconocido'
            throw new Error(`Error SOAP de WSAA: ${faultString}`)
          }
        } catch (parseError) {
          // Si no se puede parsear, continuar con el error original
        }
        
        throw new Error(`WSAA respondió con status ${response.status}: ${response.statusText}. URL: ${wsaaUrl}`)
      }

      // Parsear respuesta SOAP
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_'
      })

      const parsed = parser.parse(responseText) as any

      // Extraer loginCmsReturn - WSAA usa SOAP 1.1
      // La respuesta puede tener diferentes estructuras según el parser
      let loginCmsReturn: string | undefined
      
      // Intentar diferentes estructuras de respuesta SOAP 1.1
      if (parsed['soap:Envelope']?.['soap:Body']?.['loginCmsResponse']?.['loginCmsReturn']) {
        loginCmsReturn = parsed['soap:Envelope']['soap:Body']['loginCmsResponse']['loginCmsReturn']
      } else if (parsed['soapenv:Envelope']?.['soapenv:Body']?.['loginCmsResponse']?.['loginCmsReturn']) {
        loginCmsReturn = parsed['soapenv:Envelope']['soapenv:Body']['loginCmsResponse']['loginCmsReturn']
      } else if (parsed['Envelope']?.['Body']?.['loginCmsResponse']?.['loginCmsReturn']) {
        loginCmsReturn = parsed['Envelope']['Body']['loginCmsResponse']['loginCmsReturn']
      } else if (parsed['soap:Envelope']?.['soap:Body']?.['soap:Fault']) {
        // Error SOAP
        const fault = parsed['soap:Envelope']['soap:Body']['soap:Fault']
        throw new Error(`Error SOAP de WSAA: ${fault.faultstring || fault.faultString || 'Error desconocido'}`)
      } else if (parsed['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault']) {
        // Error SOAP (con namespace soapenv)
        const fault = parsed['soapenv:Envelope']['soapenv:Body']['soapenv:Fault']
        throw new Error(`Error SOAP de WSAA: ${fault.faultstring || fault.faultString || 'Error desconocido'}`)
      }

      if (!loginCmsReturn || typeof loginCmsReturn !== 'string') {
        console.error('⚠️ No se pudo extraer loginCmsReturn de la estructura esperada')
        console.error('Estructura recibida:', JSON.stringify(parsed, null, 2).substring(0, 1000))
        console.error('Respuesta WSAA completa (primeros 1000 chars):', responseText.substring(0, 1000))
        throw new Error('Respuesta de WSAA no contiene loginCmsReturn válido')
      }
      
      console.log('✅ loginCmsReturn extraído correctamente')
      console.log(`   Longitud: ${loginCmsReturn.length} caracteres`)
      console.log(`   Primeros 200 chars: ${loginCmsReturn.substring(0, 200)}\n`)

      // Parsear el XML dentro de loginCmsReturn (puede estar escapado)
      const unescapedXml = loginCmsReturn
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")

      const ticketXml = parser.parse(unescapedXml)

      // Buscar token y sign en diferentes estructuras posibles
      const ticket = ticketXml['loginTicketResponse'] || ticketXml['credentials'] || ticketXml

      const token = ticket?.token || ticket?.credentials?.token
      const sign = ticket?.sign || ticket?.credentials?.sign

      if (!token || !sign) {
        console.error('Estructura del ticket recibido:', JSON.stringify(ticket, null, 2))
        throw new Error('Token o Sign no encontrados en la respuesta de WSAA')
      }

      // Calcular expiración (12 horas desde ahora, o usar la del ticket si está disponible)
      const expirationTime = ticket.expirationTime
        ? this.parseAFIPDate(ticket.expirationTime)
        : Date.now() + 12 * 60 * 60 * 1000

      return { token, sign, expirationTime }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error al solicitar token desde WSAA: ${error.message}`)
      }
      throw new Error('Error desconocido al solicitar token desde WSAA')
    }
  }

  /**
   * Escapar XML para evitar inyección
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Parsear fecha en formato AFIP (YYYYMMDDHHmmss) a timestamp
   */
  private parseAFIPDate(dateStr: string): number {
    const year = parseInt(dateStr.substring(0, 4))
    const month = parseInt(dateStr.substring(4, 6)) - 1
    const day = parseInt(dateStr.substring(6, 8))
    const hours = parseInt(dateStr.substring(8, 10))
    const minutes = parseInt(dateStr.substring(10, 12))
    const seconds = parseInt(dateStr.substring(12, 14))

    return new Date(year, month, day, hours, minutes, seconds).getTime()
  }

  /**
   * Cargar TA desde DB al iniciar (si existe y está vigente)
   */
  private async loadTokenFromDB(): Promise<void> {
    try {
      const cached = await prisma.fiscalTokenCache.findUnique({
        where: {
          env_cuit_service: {
            env: env.AFIP_ENV || 'homo',
            cuit: env.AFIP_CUIT!,
            service: this.SERVICE
          }
        }
      })

      if (!cached) {
        return // No hay TA en DB
      }

      // Verificar si el TA está vigente
      const now = Date.now()
      const expirationTime = cached.expirationTime.getTime()
      
      if (expirationTime <= now) {
        // TA expirado, eliminarlo de DB
        await prisma.fiscalTokenCache.delete({
          where: { id: cached.id }
        })
        return
      }

      // TA vigente, cargar en cache en memoria
      this.tokenCache = {
        token: cached.token,
        sign: cached.sign,
        expirationTime: expirationTime,
        obtainedAt: cached.obtainedAt.getTime()
      }

      const expiresInMinutes = Math.floor((expirationTime - now) / 60000)
      console.log(`✅ TA WSAA cargado desde DB. Expira en ${expiresInMinutes} minutos`)
    } catch (error) {
      // No es crítico, simplemente no habrá cache inicial
      console.warn('⚠️ Error al cargar TA desde DB:', error instanceof Error ? error.message : 'Error desconocido')
    }
  }

  /**
   * Guardar TA en DB (upsert)
   */
  private async saveTokenToDB(token: string, sign: string, expirationTime: number): Promise<void> {
    try {
      await prisma.fiscalTokenCache.upsert({
        where: {
          env_cuit_service: {
            env: env.AFIP_ENV || 'homo',
            cuit: env.AFIP_CUIT!,
            service: this.SERVICE
          }
        },
        create: {
          env: env.AFIP_ENV || 'homo',
          cuit: env.AFIP_CUIT!,
          service: this.SERVICE,
          token,
          sign,
          expirationTime: new Date(expirationTime),
          obtainedAt: new Date()
        },
        update: {
          token,
          sign,
          expirationTime: new Date(expirationTime),
          obtainedAt: new Date()
        }
      })
    } catch (error) {
      // No relanzar el error, solo loguear
      throw error
    }
  }

  /**
   * Invalidar cache (útil para testing o forzar renovación)
   */
  async invalidateCache(): Promise<void> {
    this.tokenCache = null
    this.refreshPromise = null
    
    // También eliminar de DB
    try {
      await prisma.fiscalTokenCache.deleteMany({
        where: {
          env: env.AFIP_ENV || 'homo',
          cuit: env.AFIP_CUIT!,
          service: this.SERVICE
        }
      })
    } catch (error) {
      console.warn('⚠️ Error al eliminar TA de DB:', error instanceof Error ? error.message : 'Error desconocido')
    }
    
    console.log('🔄 Cache de TA WSAA invalidado (memoria y DB)')
  }

  /**
   * Verificar si hay un TA válido en cache (público para diagnóstico)
   * IMPORTANTE: Este es el TA (Ticket de Acceso) de WSAA, NO el JWT interno
   */
  hasValidCache(): boolean {
    return this.isCacheValid()
  }

  /**
   * Obtener información del cache (público para diagnóstico)
   * Devuelve null si no hay cache o el cache no es válido
   * IMPORTANTE: Este es el TA (Ticket de Acceso) de WSAA, NO el JWT interno
   */
  getCacheInfo(): TokenCache | null {
    if (this.isCacheValid() && this.tokenCache) {
      return { ...this.tokenCache } // Copia para no exponer la referencia
    }
    return null
  }
}

