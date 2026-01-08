/**
 * ArcaWsfeClient - Cliente SOAP para WSFEv1 (Web Service de Facturación Electrónica)
 * 
 * Responsabilidades:
 * - Realizar llamadas SOAP a WSFEv1 con autenticación (Token, Sign, Cuit)
 * - Manejar métodos de parámetros (FEParamGetPtosVenta, FEParamGetTiposCbte, etc.)
 * - Manejar métodos de consulta (FECompUltimoAutorizado, FECompConsultar)
 * - Manejar emisión de comprobantes (FECAESolicitar)
 * - Logs seguros (nunca exponer Token/Sign completos)
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { env } from '../../config/env.js'
import { ArcaTokenManager } from './ArcaTokenManager.js'
import { FiscalConfigService } from './FiscalConfigService.js'

// Endpoints WSFEv1 según entorno
const WSFEv1_URLS = {
  homo: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  prod: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
}

interface WsfeAuth {
  token: string
  sign: string
  cuit: string
}

interface WsfeResponse<T = any> {
  success: boolean
  data?: T
  errors: Array<{ code: number; msg: string }> // Siempre presente (puede estar vacío)
  events: Array<{ code: number; msg: string }> // Siempre presente (puede estar vacío)
  observations?: Array<{ code: number; msg: string }> // Observaciones adicionales
}

export class ArcaWsfeClient {
  private tokenManager: ArcaTokenManager
  private wsfeUrl: string
  private parser: XMLParser
  private builder: XMLBuilder

  constructor(environment?: 'homo' | 'prod') {
    this.tokenManager = ArcaTokenManager.getInstance()
    // Permitir especificar ambiente para diagnóstico
    const envToUse = environment || (env.AFIP_ENV || 'homo')
    this.wsfeUrl = WSFEv1_URLS[envToUse]
    this.parser = new XMLParser({ 
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    })
    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      suppressEmptyNode: false,
      textNodeName: '#text',
      // IMPORTANTE: Preservar nombres de elementos exactos (case-sensitive para WSFE)
      preserveOrder: false
      // arrayNodeName no se especifica (usa default)
    })
  }

  /**
   * Obtener autenticación (Token, Sign, Cuit) desde TokenManager
   * Usa cuitRepresentado si está configurado (delegación WSASS), sino usa CUIT del certificado
   */
  private async getAuth(): Promise<WsfeAuth> {
    const { token, sign } = await this.tokenManager.getTokenAndSign()
    
    // Obtener CUIT representado (si está configurado) o usar CUIT del certificado
    const cuitRepresentado = await FiscalConfigService.getCuitRepresentado()
    const cuitUsedInAuth = cuitRepresentado || env.AFIP_CUIT!
    
    // Log del CUIT usado en Auth (para diagnóstico)
    if (cuitRepresentado) {
      console.log(`🔑 [WSFE] Using CUIT representado in Auth: ${cuitRepresentado} (certificado: ${env.AFIP_CUIT})`)
    } else {
      console.log(`🔑 [WSFE] Using CUIT del certificado in Auth: ${cuitUsedInAuth}`)
    }
    
    return {
      token,
      sign,
      cuit: cuitUsedInAuth
    }
  }

  /**
   * Construir SOAP request para WSFEv1
   * WSFEv1 usa SOAP 1.1 (no SOAP 1.2)
   */
  private buildSoapRequest(method: string, params: Record<string, any>): string {
    // Log del payload recibido (para diagnóstico)
    console.log(`🔍 [WSFE] buildSoapRequest recibió para ${method}:`)
    console.log(`   Parámetros recibidos:`, Object.keys(params).filter(k => !['Token', 'Sign', 'Cuit'].includes(k)))
    console.log(`   Token presente: ${!!params.Token}`)
    console.log(`   Sign presente: ${!!params.Sign}`)
    console.log(`   Cuit presente: ${!!params.Cuit}`)
    
    // IMPORTANTE: CUIT debe ser solo dígitos (long) para WSFE
    // Asegurar que Cuit sea string de solo dígitos (sin guiones)
    const cuitNormalized = (params.Cuit || '').toString().replace(/-/g, '')
    
    // Validar que Cuit sea válido (11 dígitos)
    if (!cuitNormalized || !/^\d{11}$/.test(cuitNormalized)) {
      throw new Error(`CUIT inválido para WSFE: debe ser 11 dígitos. Recibido: ${cuitNormalized}`)
    }
    
    // Construir objeto Auth con Token, Sign, Cuit
    // IMPORTANTE: Estos valores deben venir de params (pasados por callSoapMethod)
    const auth = {
      Token: params.Token || '',
      Sign: params.Sign || '',
      Cuit: cuitNormalized
    }
    
    // Validar que Auth tenga todos los campos
    if (!auth.Token || !auth.Sign || !auth.Cuit) {
      console.error(`❌ [WSFE] Auth incompleto recibido:`, {
        hasToken: !!auth.Token,
        hasSign: !!auth.Sign,
        hasCuit: !!auth.Cuit
      })
      throw new Error(`Auth incompleto para ${method}: faltan Token, Sign o Cuit`)
    }

    // Construir el contenido del método
    // IMPORTANTE: WSFEv1 requiere que Auth esté dentro del método con namespace explícito
    // CRÍTICO: Eliminar TODOS los campos de autenticación fuera de Auth (token, sign, Token, Sign, Cuit, cuit)
    // Para métodos de parámetros (FEParamGetPtosVenta, FEParamGetTiposCbte), solo se envía Auth
    const methodParams = Object.fromEntries(
      Object.entries(params).filter(([key]) => {
        const keyLower = key.toLowerCase()
        // Eliminar cualquier campo relacionado con autenticación (en cualquier casing)
        return !['Token', 'Sign', 'Cuit', 'token', 'sign', 'cuit'].includes(key) &&
               !['Token', 'Sign', 'Cuit', 'token', 'sign', 'cuit'].includes(keyLower)
      })
    )
    
    // Construir Auth con namespace explícito (ar:Auth, ar:Token, ar:Sign, ar:Cuit)
    // IMPORTANTE: WSFEv1 requiere elementos calificados con namespace para Auth
    const authWithNamespace = {
      'ar:Auth': {
        '@_xmlns:ar': 'http://ar.gov.afip.dif.FEV1/',
        'ar:Token': auth.Token,
        'ar:Sign': auth.Sign,
        'ar:Cuit': auth.Cuit
      }
    }
    
    // Construir parámetros del método con namespace explícito (ar:PtoVta, ar:CbteTipo, etc.)
    // CRÍTICO: Los parámetros del método (como PtoVta, CbteTipo) también deben tener el namespace ar:
    // y ser hermanos de Auth dentro del método, no dentro de Auth
    // EXCEPCIÓN: Para FECAESolicitar, FeCAEReq debe tener namespace ar: y sus hijos también
    const methodParamsWithNamespace: Record<string, any> = {}
    for (const [key, value] of Object.entries(methodParams)) {
      if (method === 'FECAESolicitar' && key === 'FeCAEReq') {
        // Para FECAESolicitar, FeCAEReq y todos sus elementos deben tener namespace ar:
        const feCabReq = value.FeCabReq || {}
        const feDetReq = value.FeDetReq || {}
        
        methodParamsWithNamespace['ar:FeCAEReq'] = {
          'ar:FeCabReq': {
            'ar:CantReg': feCabReq.CantReg,
            'ar:PtoVta': feCabReq.PtoVta,
            'ar:CbteTipo': feCabReq.CbteTipo
          },
          'ar:FeDetReq': {
            'ar:FECAEDetRequest': {
              'ar:Concepto': feDetReq.FECAEDetRequest?.Concepto,
              'ar:DocTipo': feDetReq.FECAEDetRequest?.DocTipo,
              'ar:DocNro': feDetReq.FECAEDetRequest?.DocNro,
              'ar:CondicionIVAReceptorId': feDetReq.FECAEDetRequest?.CondicionIVAReceptorId, // OBLIGATORIO desde 2025
              'ar:CbteDesde': feDetReq.FECAEDetRequest?.CbteDesde,
              'ar:CbteHasta': feDetReq.FECAEDetRequest?.CbteHasta,
              'ar:CbteFch': feDetReq.FECAEDetRequest?.CbteFch,
              'ar:ImpTotal': feDetReq.FECAEDetRequest?.ImpTotal,
              'ar:ImpTotConc': feDetReq.FECAEDetRequest?.ImpTotConc,
              'ar:ImpNeto': feDetReq.FECAEDetRequest?.ImpNeto,
              'ar:ImpOpEx': feDetReq.FECAEDetRequest?.ImpOpEx,
              'ar:ImpIVA': feDetReq.FECAEDetRequest?.ImpIVA,
              'ar:ImpTrib': feDetReq.FECAEDetRequest?.ImpTrib,
              'ar:MonId': feDetReq.FECAEDetRequest?.MonId,
              'ar:MonCotiz': feDetReq.FECAEDetRequest?.MonCotiz,
              ...(feDetReq.FECAEDetRequest?.FchServDesde ? { 'ar:FchServDesde': feDetReq.FECAEDetRequest.FchServDesde } : {}),
              ...(feDetReq.FECAEDetRequest?.FchServHasta ? { 'ar:FchServHasta': feDetReq.FECAEDetRequest.FchServHasta } : {}),
              ...(feDetReq.FECAEDetRequest?.FchVtoPago ? { 'ar:FchVtoPago': feDetReq.FECAEDetRequest.FchVtoPago } : {})
            }
          }
        }
      } else {
        // Aplicar namespace ar: a todos los demás parámetros del método
        methodParamsWithNamespace[`ar:${key}`] = value
      }
    }
    
    // Construir el contenido del método
    // Para métodos de parámetros, solo Auth. Para otros métodos, Auth + parámetros específicos con namespace
    const methodContent: Record<string, any> = {
      ...authWithNamespace,
      ...methodParamsWithNamespace
    }

    // Construir SOAP Envelope (SOAP 1.1)
    // IMPORTANTE: Namespace correcto según WSDL: http://ar.gov.afip.dif.FEV1/
    const soapBody = {
      'soap:Envelope': {
        '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@_xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
        'soap:Body': {
          [`ar:${method}`]: {
            '@_xmlns:ar': 'http://ar.gov.afip.dif.FEV1/',
            ...methodContent
          }
        }
      }
    }

    const soapXml = this.builder.build(soapBody)
    
    // Loguear el XML generado ANTES de validar (para diagnóstico)
    const sanitizedForLog = soapXml
      .replace(/<ar:Token>.*?<\/ar:Token>/g, '<ar:Token>***</ar:Token>')
      .replace(/<ar:Sign>.*?<\/ar:Sign>/g, '<ar:Sign>***</ar:Sign>')
      .replace(/<Token>.*?<\/Token>/g, '<Token>***</Token>')
      .replace(/<Sign>.*?<\/Sign>/g, '<Sign>***</Sign>')
    
    // Extraer fragmento del método para logging
    const methodMatch = sanitizedForLog.match(new RegExp(`<ar:${method}[^>]*>([\\s\\S]*?)</ar:${method}>`))
    if (methodMatch && methodMatch[1]) {
      console.log(`📋 [WSFE] XML generado para ${method} (ANTES de validar, sanitizado):`)
      console.log(methodMatch[1].substring(0, 800))
    } else {
      console.warn(`⚠️ [WSFE] No se pudo extraer el método ${method} del XML generado`)
      console.log(`📋 [WSFE] XML completo (primeros 1000 chars):`)
      console.log(sanitizedForLog.substring(0, 1000))
    }
    
    // Validar que el XML generado contenga Auth correctamente
    // IMPORTANTE: Buscar con prefijo opcional (ar:Auth o Auth)
    // Usar regex más tolerante que acepte prefijos de namespace
    const hasAuth = /<(\w+:)?Auth[^>]*>/.test(soapXml)
    const hasToken = /<(\w+:)?Token[^>]*>/.test(soapXml)
    const hasSign = /<(\w+:)?Sign[^>]*>/.test(soapXml)
    const hasCuit = /<(\w+:)?Cuit[^>]*>/.test(soapXml)
    
    // Validar que NO existan nodos inválidos (token/sign en minúscula fuera de Auth)
    // Solo detectar si están fuera de un bloque Auth válido
    const hasInvalidToken = /<token[^>]*>/.test(soapXml) && !/<(\w+:)?Token[^>]*>/.test(soapXml)
    const hasInvalidSign = /<sign[^>]*>/.test(soapXml) && !/<(\w+:)?Sign[^>]*>/.test(soapXml)
    
    // Log de validación
    console.log(`🔍 [WSFE] Validación del SOAP generado para ${method}:`)
    console.log(`   Auth presente: ${hasAuth ? '✅' : '❌'}`)
    console.log(`   Token presente: ${hasToken ? '✅' : '❌'}`)
    console.log(`   Sign presente: ${hasSign ? '✅' : '❌'}`)
    console.log(`   Cuit presente: ${hasCuit ? '✅' : '❌'}`)
    if (hasInvalidToken || hasInvalidSign) {
      console.error(`   ⚠️ Nodos inválidos detectados: <token>=${hasInvalidToken}, <sign>=${hasInvalidSign}`)
    }
    
    // Log del SOAP body para debugging (sin exponer token/sign)
    // IMPORTANTE: Reemplazar el CONTENIDO pero mantener los tags
    // Buscar tanto con prefijo ar: como sin prefijo
    const sanitizedSoap = soapXml
      .replace(/<ar:Token>.*?<\/ar:Token>/g, '<ar:Token>***</ar:Token>')
      .replace(/<ar:Sign>.*?<\/ar:Sign>/g, '<ar:Sign>***</ar:Sign>')
      .replace(/<Token>.*?<\/Token>/g, '<Token>***</Token>')
      .replace(/<Sign>.*?<\/Sign>/g, '<Sign>***</Sign>')
      // También eliminar cualquier nodo <token> o <sign> en minúscula que no debería estar
      .replace(/<token>.*?<\/token>/g, '')
      .replace(/<sign>.*?<\/sign>/g, '')
    
    console.log(`📤 [WSFE] SOAP Body (sanitizado, primeros 1200 chars):`)
    console.log(sanitizedSoap.substring(0, 1200))
    
    // Validar que NO existan nodos <token> o <sign> fuera de Auth en el método
    if (methodMatch && methodMatch[1]) {
      const methodContentFromSoap = methodMatch[1]
      const hasInvalidTokenInMethod = /<token[^>]*>/.test(methodContentFromSoap)
      const hasInvalidSignInMethod = /<sign[^>]*>/.test(methodContentFromSoap)
      if (hasInvalidTokenInMethod || hasInvalidSignInMethod) {
        console.error(`❌ [WSFE] ADVERTENCIA: El método contiene nodos <token> o <sign> inválidos fuera de Auth`)
        console.error(`   <token> presente: ${hasInvalidTokenInMethod ? '❌' : '✅'}`)
        console.error(`   <sign> presente: ${hasInvalidSignInMethod ? '❌' : '✅'}`)
      }
    }
    
    if (!hasAuth || !hasToken || !hasSign || !hasCuit) {
      console.error(`❌ [WSFE] SOAP generado NO contiene Auth correctamente`)
      console.error(`❌ [WSFE] SOAP completo (primeros 2500 chars):`)
      console.error(sanitizedSoap.substring(0, 2500))
      throw new Error(`SOAP request para ${method} no contiene Auth correctamente formado`)
    }
    
    // Validar que NO existan nodos inválidos (token/sign en minúscula fuera de Auth)
    if (hasInvalidToken || hasInvalidSign) {
      console.error(`❌ [WSFE] SOAP generado contiene nodos inválidos <token> o <sign> fuera de Auth`)
      console.error(`❌ [WSFE] SOAP completo (primeros 2500 chars):`)
      console.error(sanitizedSoap.substring(0, 2500))
      throw new Error(`SOAP request para ${method} contiene nodos inválidos fuera de Auth`)
    }
    
    // Validación específica para FECompUltimoAutorizado: verificar que PtoVta y CbteTipo estén presentes
    if (method === 'FECompUltimoAutorizado') {
      const hasPtoVta = /<(\w+:)?PtoVta[^>]*>/.test(soapXml)
      const hasCbteTipo = /<(\w+:)?CbteTipo[^>]*>/.test(soapXml)
      
      console.log(`🔍 [WSFE] Validación específica para ${method}:`)
      console.log(`   PtoVta presente: ${hasPtoVta ? '✅' : '❌'}`)
      console.log(`   CbteTipo presente: ${hasCbteTipo ? '✅' : '❌'}`)
      
      if (!hasPtoVta || !hasCbteTipo) {
        console.error(`❌ [WSFE] ${method} requiere PtoVta y CbteTipo como parámetros`)
        console.error(`❌ [WSFE] SOAP completo (primeros 2500 chars):`)
        console.error(sanitizedSoap.substring(0, 2500))
        throw new Error(`SOAP request para ${method} no contiene PtoVta y/o CbteTipo correctamente formados`)
      }
      
      // Verificar que PtoVta y CbteTipo tengan namespace ar:
      const hasArPtoVta = /<ar:PtoVta[^>]*>/.test(soapXml)
      const hasArCbteTipo = /<ar:CbteTipo[^>]*>/.test(soapXml)
      
      if (!hasArPtoVta || !hasArCbteTipo) {
        console.warn(`⚠️ [WSFE] ${method}: PtoVta y/o CbteTipo no tienen namespace ar:. Esto puede causar errores 11000/11001.`)
        console.warn(`   PtoVta con ar:: ${hasArPtoVta ? '✅' : '❌'}`)
        console.warn(`   CbteTipo con ar:: ${hasArCbteTipo ? '✅' : '❌'}`)
      }
    }
    
    return soapXml
  }

  /**
   * Realizar llamada SOAP a WSFEv1
   */
  private async callSoapMethod<T = any>(method: string, params: Record<string, any>): Promise<WsfeResponse<T>> {
    const auth = await this.getAuth()
    
    // IMPORTANTE: CUIT debe ser solo dígitos (long) para WSFE
    // env.AFIP_CUIT ya está normalizado sin guiones en env.ts, pero asegurar aquí también
    const cuitNormalized = (auth.cuit || '').toString().replace(/-/g, '')
    
    // CRÍTICO: Solo pasar Token, Sign, Cuit en MAYÚSCULA
    // NO pasar token/sign en minúscula (vienen de getAuth() pero no deben ir al SOAP)
    const allParams = { 
      ...params, 
      Token: auth.token,  // Convertir a mayúscula para el SOAP
      Sign: auth.sign,    // Convertir a mayúscula para el SOAP
      Cuit: cuitNormalized
      // NO incluir: auth.token, auth.sign, auth.cuit (en minúscula)
    }

    const soapBody = this.buildSoapRequest(method, allParams)

    // Headers SOAP 1.1
    // IMPORTANTE: WSFEv1 requiere SOAPAction con comillas dobles
    // Namespace correcto según WSDL: http://ar.gov.afip.dif.FEV1/
    // Formato: "http://ar.gov.afip.dif.FEV1/MethodName"
    const soapAction = `"http://ar.gov.afip.dif.FEV1/${method}"`
    const headers = {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': soapAction
    }
    
    console.log(`📤 [WSFE] SOAPAction header: ${soapAction}`)

    try {
      console.log(`📤 [WSFE] Llamando ${method} a ${this.wsfeUrl}`)
      console.log(`📤 [WSFE] SOAP Body length: ${soapBody.length} caracteres`)
      
      // Timeout de 15 segundos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch(this.wsfeUrl, {
        method: 'POST',
        headers,
        body: soapBody,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const responseText = await response.text()
      console.log(`📥 [WSFE] ${method} respondió con status ${response.status}`)
      console.log(`📥 [WSFE] Response length: ${responseText.length} caracteres`)

      if (!response.ok) {
        console.error(`❌ [WSFE] ${method} respondió con status ${response.status}`)
        console.error(`❌ [WSFE] Response (primeros 1000 chars):`, responseText.substring(0, 1000))
        throw new Error(`WSFEv1 ${method} respondió con status ${response.status}: ${response.statusText}`)
      }

      // Parsear respuesta SOAP
      let parsed: any
      try {
        parsed = this.parser.parse(responseText) as any
      } catch (parseError) {
        console.error(`❌ [WSFE] Error al parsear XML de ${method}`)
        console.error(`❌ [WSFE] Response (primeros 1000 chars):`, responseText.substring(0, 1000))
        throw new Error(`Error al parsear respuesta XML de WSFEv1 ${method}: ${parseError instanceof Error ? parseError.message : 'Error desconocido'}`)
      }
      
      // Extraer resultado del método (intentar diferentes estructuras)
      const methodResponse = parsed['soap:Envelope']?.['soap:Body']?.[`${method}Response`] ||
                            parsed['soapenv:Envelope']?.['soapenv:Body']?.[`${method}Response`] ||
                            parsed['Envelope']?.['Body']?.[`${method}Response`] ||
                            parsed[`${method}Response`]

      if (!methodResponse) {
        console.error(`❌ [WSFE] No se pudo encontrar ${method}Response en la respuesta`)
        console.error(`❌ [WSFE] Estructura parseada:`, JSON.stringify(Object.keys(parsed), null, 2))
        console.error(`❌ [WSFE] Response (primeros 1000 chars):`, responseText.substring(0, 1000))
        throw new Error(`No se pudo encontrar ${method}Response en la respuesta de WSFEv1`)
      }
      
      console.log(`✅ [WSFE] ${method}Response encontrado`)

      // Guardar SOAP response para diagnóstico
      try {
        const fs = await import('fs')
        const path = await import('path')
        const logsDir = path.join(process.cwd(), 'backend', 'logs')
        // Crear directorio si no existe
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const responseLogPath = path.join(logsDir, `wsfe-${method}-response-${timestamp}.xml`)
        fs.writeFileSync(responseLogPath, responseText, 'utf8')
        console.log(`📝 [WSFE] Response guardado en: ${responseLogPath}`)
      } catch (logError) {
        console.warn('⚠️ [WSFE] No se pudo guardar el log del response:', logError)
      }

      // Guardar SOAP request para diagnóstico
      try {
        const fs = await import('fs')
        const path = await import('path')
        const logsDir = path.join(process.cwd(), 'backend', 'logs')
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const requestLogPath = path.join(logsDir, `wsfe-${method}-request-${timestamp}.xml`)
        // Sanitizar request (remover token/sign)
        const sanitizedRequest = soapBody.replace(/<Token>.*?<\/Token>/g, '<Token>***</Token>')
                                         .replace(/<Sign>.*?<\/Sign>/g, '<Sign>***</Sign>')
        fs.writeFileSync(requestLogPath, sanitizedRequest, 'utf8')
        console.log(`📝 [WSFE] Request guardado en: ${requestLogPath}`)
      } catch (logError) {
        console.warn('⚠️ [WSFE] No se pudo guardar el log del request:', logError)
      }

      // Extraer resultado y errores
      // IMPORTANTE: WSFEv1 devuelve el resultado en ${method}Result
      const result = methodResponse[`${method}Result`] || methodResponse
      
      // Extraer errores (puede ser array o objeto único)
      let errors: any[] = []
      if (result.Errors) {
        if (result.Errors.Err) {
          errors = Array.isArray(result.Errors.Err) ? result.Errors.Err : [result.Errors.Err]
        } else if (Array.isArray(result.Errors)) {
          errors = result.Errors
        }
      }
      
      // Extraer observaciones/eventos (puede ser array o objeto único)
      let events: any[] = []
      if (result.Events) {
        if (result.Events.Evt) {
          events = Array.isArray(result.Events.Evt) ? result.Events.Evt : [result.Events.Evt]
        } else if (Array.isArray(result.Events)) {
          events = result.Events
        }
      }

      // Normalizar errores
      const normalizedErrors = errors.map((e: any) => ({
        code: parseInt(e.Code || e['@_Code'] || e.code || '0'),
        msg: e.Msg || e['#text'] || e.msg || 'Error desconocido'
      }))

      // Normalizar eventos
      const normalizedEvents = events.map((e: any) => ({
        code: parseInt(e.Code || e['@_Code'] || e.code || '0'),
        msg: e.Msg || e['#text'] || e.msg || ''
      }))

      // Si hay errores, devolverlos con toda la información
      if (normalizedErrors.length > 0) {
        console.log(`⚠️ [WSFE] ${method} devolvió errores:`, normalizedErrors)
        
        // Diagnosticar error 500 "Auth mal formado"
        const authError = normalizedErrors.find((e: any) => 
          e && e.code === 500 && 
          (e.msg?.toLowerCase().includes('auth') || 
           e.msg?.toLowerCase().includes('campo') ||
           e.msg?.toLowerCase().includes('ingresado') ||
           e.msg?.toLowerCase().includes('formado'))
        )
        
        if (authError) {
          console.error(`❌ [WSFE] Error 500 Auth mal formado detectado`)
          console.error(`❌ [WSFE] Diagnosticando estructura del request...`)
          
          // Verificar estructura del request que se envió (usar soapBody original)
          const requestHasAuth = soapBody.includes('<Auth>') || soapBody.includes('<ar:Auth>')
          const requestHasToken = soapBody.includes('<Token>')
          const requestHasSign = soapBody.includes('<Sign>')
          const requestHasCuit = soapBody.includes('<Cuit>')
          
          console.error(`   Request contiene <Auth>: ${requestHasAuth ? '✅' : '❌'}`)
          console.error(`   Request contiene <Token>: ${requestHasToken ? '✅' : '❌'}`)
          console.error(`   Request contiene <Sign>: ${requestHasSign ? '✅' : '❌'}`)
          console.error(`   Request contiene <Cuit>: ${requestHasCuit ? '✅' : '❌'}`)
          
          // Extraer fragmento del método del request para diagnóstico
          const methodMatch = soapBody.match(new RegExp(`<ar:${method}[^>]*>([\\s\\S]*?)</ar:${method}>`))
          if (methodMatch && methodMatch[1]) {
            console.error(`   Fragmento del método ${method} en request:`)
            console.error(methodMatch[1].substring(0, 300))
          }
        }
        
        return {
          success: false,
          errors: normalizedErrors,
          events: normalizedEvents,
          data: result // Incluir data completo para diagnóstico
        }
      }

      // Log del resultado para diagnóstico
      console.log(`✅ [WSFE] ${method} exitoso. Resultado:`, JSON.stringify(result, null, 2).substring(0, 500))

      // Mejora de parsing para FEParamGetTiposCbte: intentar más estructuras
      if (method === 'FEParamGetTiposCbte' && !result.CbteTipo) {
        console.log(`🔍 [WSFE] FEParamGetTiposCbte: intentando estructuras alternativas...`)
        console.log(`   Estructura actual:`, JSON.stringify(Object.keys(result), null, 2))
        
        // Intentar diferentes estructuras posibles
        let cbteTipoFound = null
        if (result.ResultGet?.CbteTipo) {
          cbteTipoFound = result.ResultGet.CbteTipo
          console.log(`   ✅ Encontrado en result.ResultGet.CbteTipo`)
        } else if (result.FEParamGetTiposCbteResult?.ResultGet?.CbteTipo) {
          cbteTipoFound = result.FEParamGetTiposCbteResult.ResultGet.CbteTipo
          console.log(`   ✅ Encontrado en result.FEParamGetTiposCbteResult.ResultGet.CbteTipo`)
        } else if (result.FEParamGetTiposCbteResult?.CbteTipo) {
          cbteTipoFound = result.FEParamGetTiposCbteResult.CbteTipo
          console.log(`   ✅ Encontrado en result.FEParamGetTiposCbteResult.CbteTipo`)
        }
        
        if (cbteTipoFound) {
          result.CbteTipo = cbteTipoFound
          console.log(`   ✅ CbteTipo extraído correctamente`)
        } else {
          console.warn(`   ⚠️ No se pudo extraer CbteTipo. Estructura completa:`, JSON.stringify(result, null, 2).substring(0, 1000))
        }
      }

      // Mejora de parsing para FEParamGetCondicionIvaReceptor: intentar más estructuras
      // IMPORTANTE: El JSON real tiene CondicionIvaReceptor (camelCase) en ResultGet
      if (method === 'FEParamGetCondicionIvaReceptor') {
        console.log(`🔍 [WSFE] FEParamGetCondicionIvaReceptor: extrayendo datos...`)
        console.log(`   Estructura actual:`, JSON.stringify(Object.keys(result), null, 2))
        
        // Intentar diferentes estructuras posibles (camelCase y mayúsculas)
        let condicionIvaFound = null
        let pathUsed = ''
        
        // Primero intentar la estructura real: ResultGet.CondicionIvaReceptor (camelCase)
        if (result.ResultGet?.CondicionIvaReceptor) {
          condicionIvaFound = result.ResultGet.CondicionIvaReceptor
          pathUsed = 'result.ResultGet.CondicionIvaReceptor'
          console.log(`   ✅ Encontrado en result.ResultGet.CondicionIvaReceptor`)
        } else if (result.ResultGet?.CondicionIVAReceptor) {
          condicionIvaFound = result.ResultGet.CondicionIVAReceptor
          pathUsed = 'result.ResultGet.CondicionIVAReceptor'
          console.log(`   ✅ Encontrado en result.ResultGet.CondicionIVAReceptor`)
        } else if (result.FEParamGetCondicionIvaReceptorResult?.ResultGet?.CondicionIvaReceptor) {
          condicionIvaFound = result.FEParamGetCondicionIvaReceptorResult.ResultGet.CondicionIvaReceptor
          pathUsed = 'result.FEParamGetCondicionIvaReceptorResult.ResultGet.CondicionIvaReceptor'
          console.log(`   ✅ Encontrado en result.FEParamGetCondicionIvaReceptorResult.ResultGet.CondicionIvaReceptor`)
        } else if (result.FEParamGetCondicionIvaReceptorResult?.ResultGet?.CondicionIVAReceptor) {
          condicionIvaFound = result.FEParamGetCondicionIvaReceptorResult.ResultGet.CondicionIVAReceptor
          pathUsed = 'result.FEParamGetCondicionIvaReceptorResult.ResultGet.CondicionIVAReceptor'
          console.log(`   ✅ Encontrado en result.FEParamGetCondicionIvaReceptorResult.ResultGet.CondicionIVAReceptor`)
        } else if (result.FEParamGetCondicionIvaReceptorResult?.CondicionIvaReceptor) {
          condicionIvaFound = result.FEParamGetCondicionIvaReceptorResult.CondicionIvaReceptor
          pathUsed = 'result.FEParamGetCondicionIvaReceptorResult.CondicionIvaReceptor'
          console.log(`   ✅ Encontrado en result.FEParamGetCondicionIvaReceptorResult.CondicionIvaReceptor`)
        } else if (result.FEParamGetCondicionIvaReceptorResult?.CondicionIVAReceptor) {
          condicionIvaFound = result.FEParamGetCondicionIvaReceptorResult.CondicionIVAReceptor
          pathUsed = 'result.FEParamGetCondicionIvaReceptorResult.CondicionIVAReceptor'
          console.log(`   ✅ Encontrado en result.FEParamGetCondicionIvaReceptorResult.CondicionIVAReceptor`)
        } else if (result.CondicionIvaReceptor) {
          condicionIvaFound = result.CondicionIvaReceptor
          pathUsed = 'result.CondicionIvaReceptor'
          console.log(`   ✅ Encontrado en result.CondicionIvaReceptor`)
        } else if (result.CondicionIVAReceptor) {
          condicionIvaFound = result.CondicionIVAReceptor
          pathUsed = 'result.CondicionIVAReceptor'
          console.log(`   ✅ Encontrado en result.CondicionIVAReceptor`)
        }
        
        if (condicionIvaFound) {
          // Normalizar: asegurar que sea array
          const arrayData = Array.isArray(condicionIvaFound) ? condicionIvaFound : [condicionIvaFound]
          result.CondicionIvaReceptor = arrayData
          result.CondicionIVAReceptor = arrayData // Mantener ambos nombres para compatibilidad
          console.log(`   ✅ CondicionIvaReceptor extraído correctamente (${arrayData.length} items) desde ${pathUsed}`)
        } else {
          console.warn(`   ⚠️ No se pudo extraer CondicionIvaReceptor. Estructura completa:`, JSON.stringify(result, null, 2).substring(0, 1000))
          // Guardar rawData en logs para diagnóstico
          try {
            const fs = await import('fs')
            const path = await import('path')
            const logsDir = path.join(process.cwd(), 'backend', 'logs')
            if (!fs.existsSync(logsDir)) {
              fs.mkdirSync(logsDir, { recursive: true })
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const rawDataPath = path.join(logsDir, `wsfe-FEParamGetCondicionIvaReceptor-rawData-${timestamp}.json`)
            fs.writeFileSync(rawDataPath, JSON.stringify(result, null, 2), 'utf8')
            console.log(`📝 [WSFE] RawData guardado en: ${rawDataPath}`)
          } catch (logError) {
            console.warn('⚠️ [WSFE] No se pudo guardar rawData:', logError)
          }
        }
      }

      return {
        success: true,
        data: result,
        errors: normalizedErrors, // Siempre incluir (puede estar vacío)
        events: normalizedEvents
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏱️ [WSFE] ${method} timeout después de 15 segundos`)
        throw new Error(`WSFEv1 ${method} timeout: La solicitud tardó más de 15 segundos`)
      }
      
      console.error(`❌ [WSFE] Error al llamar ${method}:`, error instanceof Error ? error.message : 'Error desconocido')
      if (error instanceof Error && error.stack) {
        console.error(`📚 [WSFE] Stack:`, error.stack)
      }
      throw error
    }
  }

  /**
   * FEParamGetPtosVenta - Obtener puntos de venta habilitados
   */
  async getPtosVenta(): Promise<WsfeResponse<{ PtoVta: Array<{ Nro: number; EmisionTipo: string; Bloqueado: string }> }>> {
    return this.callSoapMethod('FEParamGetPtosVenta', {})
  }

  /**
   * FEParamGetTiposCbte - Obtener tipos de comprobante
   */
  async getTiposCbte(): Promise<WsfeResponse<{ CbteTipo: Array<{ Id: number; Desc: string; FchDesde: string; FchHasta: string }> }>> {
    return this.callSoapMethod('FEParamGetTiposCbte', {})
  }

  /**
   * FECompUltimoAutorizado - Obtener último comprobante autorizado
   */
  async getUltimoAutorizado(ptovta: number, cbteTipo: number): Promise<WsfeResponse<{ CbteNro: number; PtoVta: number; CbteTipo: number }>> {
    return this.callSoapMethod('FECompUltimoAutorizado', {
      PtoVta: ptovta,
      CbteTipo: cbteTipo
    })
  }

  /**
   * FEParamGetTiposDoc - Obtener tipos de documento
   */
  async getTiposDoc(): Promise<WsfeResponse<{ DocTipo: Array<{ Id: number; Desc: string; FchDesde: string; FchHasta: string }> }>> {
    return this.callSoapMethod('FEParamGetTiposDoc', {})
  }

  /**
   * FEParamGetTiposIva - Obtener tipos de IVA
   */
  async getTiposIva(): Promise<WsfeResponse<{ IvaTipo: Array<{ Id: number; Desc: string; FchDesde: string; FchHasta: string }> }>> {
    return this.callSoapMethod('FEParamGetTiposIva', {})
  }

  /**
   * FEParamGetTiposMonedas - Obtener tipos de monedas
   */
  async getTiposMonedas(): Promise<WsfeResponse<{ Moneda: Array<{ Id: string; Desc: string; FchDesde: string; FchHasta: string }> }>> {
    return this.callSoapMethod('FEParamGetTiposMonedas', {})
  }

  /**
   * FEParamGetTiposTributos - Obtener tipos de tributos
   */
  async getTiposTributos(): Promise<WsfeResponse<{ TributoTipo: Array<{ Id: number; Desc: string; FchDesde: string; FchHasta: string }> }>> {
    return this.callSoapMethod('FEParamGetTiposTributos', {})
  }

  /**
   * FEParamGetCondicionIvaReceptor - Obtener condiciones IVA del receptor
   * IMPORTANTE: Este campo es obligatorio en FECAEDetRequest desde 2025
   */
  async getCondicionIvaReceptor(): Promise<WsfeResponse<{ CondicionIVAReceptor: Array<{ Id: number; Desc: string; FchDesde: string; FchHasta: string }> }>> {
    return this.callSoapMethod('FEParamGetCondicionIvaReceptor', {})
  }

  /**
   * FECAESolicitar - Emitir comprobante electrónico
   * IMPORTANTE: Este método EMITE realmente el comprobante en AFIP
   */
  async solicitarCAE(feCAEReq: {
    FeCabReq: {
      CantReg: number
      PtoVta: number
      CbteTipo: number
    }
    FeDetReq: {
      FECAEDetRequest: {
        Concepto: number
        DocTipo: number
        DocNro: number
        CbteDesde: number
        CbteHasta: number
        CbteFch: string
        ImpTotal: number
        ImpTotConc: number
        ImpNeto: number
        ImpOpEx: number
        ImpIVA: number
        ImpTrib: number
        MonId: string
        MonCotiz: number
        FchServDesde?: string
        FchServHasta?: string
        FchVtoPago?: string
      }
    }
  }): Promise<WsfeResponse<{
    FeCabResp: {
      CantReg: number
      Resultado: string // 'A' = Aprobado, 'R' = Rechazado
      Reproceso?: string
    }
    FeDetResp: {
      FECAEDetResponse: {
        Concepto: number
        DocTipo: number
        DocNro: number
        CbteDesde: number
        CbteHasta: number
        CbteFch: string
        Resultado: string // 'A' = Aprobado, 'R' = Rechazado
        CAE?: string
        CAEFchVto?: string
        Observaciones?: Array<{ Code: number; Msg: string }>
      }
    }
  }>> {
    // IMPORTANTE: FECAESolicitar requiere que FeCAEReq esté en el nivel superior del método
    // No dentro de un wrapper adicional
    return this.callSoapMethod('FECAESolicitar', {
      FeCAEReq: feCAEReq
    })
  }

  /**
   * MÉTODOS DE DIAGNÓSTICO
   * Estos métodos permiten exportar SOAP requests y ejecutar en ambientes específicos
   * para validar externamente (SoapUI, Postman, etc.)
   */

  /**
   * Generar SOAP request sin ejecutarlo (para exportar y probar externamente)
   * @param method Nombre del método WSFE (ej: 'FEParamGetPtosVenta')
   * @param params Parámetros del método (sin Auth, se agrega automáticamente)
   * @returns SOAP request completo sanitizado (Token/Sign enmascarados) + headers
   */
  async generateSoapRequest(method: string, params: Record<string, any> = {}): Promise<{
    soapRequest: string
    soapRequestSanitized: string
    headers: Record<string, string>
    url: string
    method: string
    cuitUsedInAuth: string
  }> {
    const auth = await this.getAuth()
    const cuitNormalized = (auth.cuit || '').toString().replace(/-/g, '')
    
    const allParams = { 
      ...params, 
      Token: auth.token,
      Sign: auth.sign,
      Cuit: cuitNormalized
    }

    const soapRequest = this.buildSoapRequest(method, allParams)
    
    // Sanitizar para exportar (enmascarar Token/Sign)
    const soapRequestSanitized = soapRequest
      .replace(/<ar:Token>.*?<\/ar:Token>/g, '<ar:Token>***</ar:Token>')
      .replace(/<ar:Sign>.*?<\/ar:Sign>/g, '<ar:Sign>***</ar:Sign>')
      .replace(/<Token>.*?<\/Token>/g, '<Token>***</Token>')
      .replace(/<Sign>.*?<\/Sign>/g, '<Sign>***</Sign>')

    const soapAction = `"http://ar.gov.afip.dif.FEV1/${method}"`
    const headers = {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': soapAction
    }

    return {
      soapRequest: soapRequest,
      soapRequestSanitized: soapRequestSanitized,
      headers,
      url: this.wsfeUrl,
      method: 'POST',
      cuitUsedInAuth: cuitNormalized
    }
  }

  /**
   * Ejecutar método WSFE en un ambiente específico (homo/prod)
   * Útil para comparar resultados entre ambientes
   * @param method Nombre del método WSFE
   * @param params Parámetros del método
   * @param environment Ambiente a usar ('homo' | 'prod')
   * @returns Respuesta WSFE
   */
  async callSoapMethodInEnvironment<T = any>(
    method: string, 
    params: Record<string, any>,
    environment: 'homo' | 'prod'
  ): Promise<WsfeResponse<T> & { environment: 'homo' | 'prod'; url: string }> {
    // Crear cliente temporal para el ambiente específico
    const originalUrl = this.wsfeUrl
    this.wsfeUrl = WSFEv1_URLS[environment]
    
    try {
      const result = await this.callSoapMethod<T>(method, params)
      return {
        ...result,
        environment,
        url: this.wsfeUrl
      }
    } finally {
      // Restaurar URL original
      this.wsfeUrl = originalUrl
    }
  }

  /**
   * Obtener último comprobante autorizado en ambiente específico
   * Útil para verificar si WSFE "conoce" un PV aunque GetPtosVenta no lo liste
   */
  async getUltimoAutorizadoInEnvironment(
    ptovta: number, 
    cbteTipo: number,
    environment: 'homo' | 'prod'
  ): Promise<WsfeResponse<{ CbteNro: number; PtoVta: number; CbteTipo: number }> & { environment: 'homo' | 'prod'; url: string }> {
    return this.callSoapMethodInEnvironment('FECompUltimoAutorizado', {
      PtoVta: ptovta,
      CbteTipo: cbteTipo
    }, environment)
  }

  /**
   * Obtener puntos de venta en ambiente específico
   */
  async getPtosVentaInEnvironment(
    environment: 'homo' | 'prod'
  ): Promise<WsfeResponse<{ PtoVta: Array<{ Nro: number; EmisionTipo: string; Bloqueado: string }> }> & { environment: 'homo' | 'prod'; url: string }> {
    return this.callSoapMethodInEnvironment('FEParamGetPtosVenta', {}, environment)
  }
}
