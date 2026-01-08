/**
 * Ruta de prueba para verificar la configuración AFIP/ARCA
 * 
 * Este endpoint permite probar:
 * - Configuración de variables de entorno
 * - Carga y validación del certificado
 * - Obtención de Token + Sign desde WSAA
 * 
 * ⚠️ SOLO PARA DESARROLLO/TESTING - No exponer en producción
 */

import { FastifyPluginAsync } from 'fastify'
import { authenticate, authorize } from '../middleware/auth.js'
import { isFiscalEnabled, env } from '../config/env.js'
import crypto from 'crypto'
import { ArcaTokenManager } from '../services/arca/index.js'
import { ArcaWsfeClient } from '../services/arca/ArcaWsfeClient.js'
import { FiscalConfigService } from '../services/arca/FiscalConfigService.js'
import { prisma } from '../config/database.js'

export const fiscalTestRoutes: FastifyPluginAsync = async (app) => {
  // Test de configuración y obtención de token
  app.get('/test/token', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      // Verificar que la facturación esté configurada
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada. Verifica las variables de entorno AFIP_*',
          config: {
            hasCuit: !!env.AFIP_CUIT,
            hasCert: !!env.AFIP_CERT_P12_BASE64,
            hasPassword: !!env.AFIP_CERT_P12_PASSWORD,
            env: env.AFIP_ENV || 'homo'
          }
        })
      }

      // Obtener instancia del TokenManager
      const tokenManager = ArcaTokenManager.getInstance()

      // IMPORTANTE: Este endpoint devuelve el TA (Ticket de Acceso) de WSAA, NO el JWT interno
      // - JWT interno: se obtiene con POST /api/auth/login (autenticación en la app)
      // - TA WSAA: token+sign para llamar a WSFE (facturación electrónica)
      
      // Verificar si hay TA en cache antes de llamar a WSAA
      const hasCache = tokenManager.hasValidCache()
      const cacheInfo = tokenManager.getCacheInfo()
      
      // Intentar obtener Token + Sign
      const startTime = Date.now()
      let token: string
      let sign: string
      let source: 'cache' | 'wsaa' = 'cache'
      
      try {
        const result = await tokenManager.getTokenAndSign()
        token = result.token
        sign = result.sign
        // Si el elapsedTime es muy bajo (< 100ms), probablemente vino del cache
        source = Date.now() - startTime < 100 ? 'cache' : 'wsaa'
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        
        // Si el error es "alreadyAuthenticated" y hay cache, intentar usar el cache
        if (errorMessage.includes('ya tiene un TA válido') && hasCache && cacheInfo) {
          console.log('⚠️ WSAA dice que hay TA válido, usando cache local')
          token = cacheInfo.token
          sign = cacheInfo.sign
          source = 'cache'
        } else {
          throw error
        }
      }
      
      const elapsedTime = Date.now() - startTime

      // Respuesta segura (no exponer token/sign completos)
      const tokenPreview = token.substring(0, 20) + '...' + token.substring(token.length - 10)
      const signPreview = sign.substring(0, 20) + '...' + sign.substring(sign.length - 10)

      return {
        success: true,
        message: `TA WSAA obtenido exitosamente desde ${source === 'cache' ? 'cache' : 'WSAA'}`,
        data: {
          tokenPreview,
          signPreview,
          tokenLength: token.length,
          signLength: sign.length,
          elapsedTimeMs: elapsedTime,
          environment: env.AFIP_ENV || 'homo',
          source, // 'cache' o 'wsaa'
          fromCache: source === 'cache'
        },
        // Información adicional útil
        info: {
          cuit: env.AFIP_CUIT?.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3'), // Formatear CUIT
          env: env.AFIP_ENV || 'homo',
          hasPtoVta: !!(await FiscalConfigService.getPtoVta()),
          ptoVta: (await FiscalConfigService.getPtoVta()) || 'auto-detect',
          service: 'wsfe'
        },
        // Información del cache
        cache: cacheInfo ? {
          hasCache: true,
          expirationTime: new Date(cacheInfo.expirationTime).toISOString(),
          obtainedAt: new Date(cacheInfo.obtainedAt).toISOString(),
          isValid: hasCache
        } : {
          hasCache: false,
          message: 'No hay TA en cache. Se obtuvo desde WSAA.'
        },
        // Aclaración importante
        note: 'Este es el TA (Ticket de Acceso) de WSAA para facturación electrónica, NO el JWT interno de la app. El JWT se obtiene con POST /api/auth/login.'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error en test de token:', errorMessage)
      
      // Mensajes de error más descriptivos
      let userMessage = errorMessage
      if (errorMessage.includes('password')) {
        userMessage = 'Contraseña del certificado incorrecta. Verifica AFIP_CERT_P12_PASSWORD'
      } else if (errorMessage.includes('No se pudo extraer')) {
        userMessage = 'Error al leer el certificado. Verifica que AFIP_CERT_P12_BASE64 sea válido'
      } else if (errorMessage.includes('loginCmsReturn')) {
        userMessage = 'Error en la respuesta de WSAA. Verifica que el certificado esté autorizado y el CUIT sea correcto'
      }

      return reply.status(500).send({
        error: true,
        message: userMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      })
    }
  })

  // Test de configuración (sin autenticación, solo verifica envs)
  app.get('/test/config', {}, async () => {
    const isEnabled = isFiscalEnabled()
    const ptoVta = await FiscalConfigService.getPtoVta()
    
    return {
      fiscalEnabled: isEnabled,
      config: {
        env: env.AFIP_ENV || 'homo',
        hasCuit: !!env.AFIP_CUIT,
        cuit: env.AFIP_CUIT 
          ? env.AFIP_CUIT.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3')
          : null,
        hasCert: !!env.AFIP_CERT_P12_BASE64,
        certLength: env.AFIP_CERT_P12_BASE64?.length || 0,
        hasPassword: !!env.AFIP_CERT_P12_PASSWORD,
        hasPtoVta: !!ptoVta,
        ptoVta: ptoVta || null
      },
      status: isEnabled 
        ? '✅ Configuración completa - Listo para usar'
        : '⚠️ Configuración incompleta - Faltan variables de entorno'
    }
  })

  // Health-check de WSFEv1
  app.get('/test/wsfe', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    console.log('🔍 [WSFE Health-Check] Iniciando health-check...')
    
    try {
      // Verificar que la facturación esté configurada
      if (!isFiscalEnabled()) {
        console.log('❌ [WSFE Health-Check] Facturación no configurada')
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada. Verifica las variables de entorno AFIP_*'
        })
      }

      console.log('✅ [WSFE Health-Check] Facturación configurada')
      const tokenManager = ArcaTokenManager.getInstance()
      const wsfeClient = new ArcaWsfeClient()
      
      console.log('✅ [WSFE Health-Check] Cliente WSFE creado')

      // 1. Información del TA
      console.log('📋 [WSFE Health-Check] Verificando TA...')
      const hasCache = tokenManager.hasValidCache()
      const cacheInfo = tokenManager.getCacheInfo()
      console.log(`📋 [WSFE Health-Check] TA en cache: ${hasCache ? 'Sí' : 'No'}`)
      
      // 2. Obtener puntos de venta
      console.log('📞 [WSFE Health-Check] Llamando FEParamGetPtosVenta...')
      const ptosVentaStartTime = Date.now()
      const ptosVentaResult = await wsfeClient.getPtosVenta()
      const ptosVentaElapsed = Date.now() - ptosVentaStartTime
      console.log(`⏱️ [WSFE Health-Check] FEParamGetPtosVenta completado en ${ptosVentaElapsed}ms`)
      
      // Extraer datos de puntos de venta (puede estar en diferentes estructuras)
      const ptosVentaData = ptosVentaResult.data
      let ptosVenta: any[] = []
      
      // Intentar diferentes estructuras posibles del resultado
      if (ptosVentaData?.PtoVta) {
        ptosVenta = Array.isArray(ptosVentaData.PtoVta) ? ptosVentaData.PtoVta : [ptosVentaData.PtoVta]
      } else if (ptosVentaData?.ResultGet?.PtoVta) {
        ptosVenta = Array.isArray(ptosVentaData.ResultGet.PtoVta) 
          ? ptosVentaData.ResultGet.PtoVta 
          : [ptosVentaData.ResultGet.PtoVta]
      } else if (Array.isArray(ptosVentaData)) {
        ptosVenta = ptosVentaData
      }
      
      // 3. Obtener tipos de comprobante
      console.log('📞 [WSFE Health-Check] Llamando FEParamGetTiposCbte...')
      const tiposCbteStartTime = Date.now()
      const tiposCbteResult = await wsfeClient.getTiposCbte()
      const tiposCbteElapsed = Date.now() - tiposCbteStartTime
      console.log(`⏱️ [WSFE Health-Check] FEParamGetTiposCbte completado en ${tiposCbteElapsed}ms`)
      
      // Extraer datos de tipos de comprobante
      const tiposCbteData = tiposCbteResult.data
      let tiposCbte: any[] = []
      
      // Intentar diferentes estructuras posibles del resultado
      if (tiposCbteData?.CbteTipo) {
        tiposCbte = Array.isArray(tiposCbteData.CbteTipo) ? tiposCbteData.CbteTipo : [tiposCbteData.CbteTipo]
      } else if (tiposCbteData?.ResultGet?.CbteTipo) {
        tiposCbte = Array.isArray(tiposCbteData.ResultGet.CbteTipo)
          ? tiposCbteData.ResultGet.CbteTipo
          : [tiposCbteData.ResultGet.CbteTipo]
      } else if (Array.isArray(tiposCbteData)) {
        tiposCbte = tiposCbteData
      }

      // 4. Validar punto de venta configurado
      const ptoVtaConfig = await FiscalConfigService.getPtoVta()
      const ptoVtaExists = ptoVtaConfig ? ptosVenta.some((pv: any) => {
        const pvNum = typeof pv.Nro === 'number' ? pv.Nro : parseInt(pv.Nro || pv.numero || '0')
        return pvNum === ptoVtaConfig
      }) : false
      
      // 5. Diagnosticar errores específicos
      const ptosVentaErrors = ptosVentaResult.errors || []
      const tiposCbteErrors = tiposCbteResult.errors || []
      
      // Error 602 = "Sin Resultados" (PV no habilitado aún)
      const ptoVtaError602 = ptosVentaErrors.find((e: any) => e.code === 602)
      // Error 11002 = "No hay puntos de venta habilitados" o "PV no impactado"
      const ptoVtaError11002 = ptosVentaErrors.find((e: any) => e.code === 11002)
      const ptoVtaNotImpacted = ptoVtaError602 !== undefined || ptoVtaError11002 !== undefined

      // Obtener estado persistido desde DB
      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = env.AFIP_CUIT!
      const statusRecord = await prisma.fiscalPtoVtaStatus.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        }
      })

      // Determinar wsfeAuthOk: si FEParamGetTiposCbte funciona, la autenticación está OK
      const wsfeAuthOk = tiposCbteResult.success && tiposCbte.length > 0
      
      // NUEVO CRITERIO: Usar FECompUltimoAutorizado como verificación operativa del PV
      // Este es el método que realmente prueba que WSFE conoce el PV configurado
      let pvStatus: 'READY' | 'PENDING' | 'ERROR' = 'PENDING'
      let ultimoAutorizadoCbteNro: number | null = null
      let ultimoAutorizadoError: any = null
      
      if (ptoVtaConfig) {
        try {
          console.log(`📞 [WSFE Health-Check] Verificando PV con FECompUltimoAutorizado(ptoVta=${ptoVtaConfig}, cbteTipo=11)...`)
          const ultimoAutorizadoResult = await wsfeClient.getUltimoAutorizado(ptoVtaConfig, 11)
          
          if (ultimoAutorizadoResult.success && ultimoAutorizadoResult.data) {
            // WSFE conoce el PV y devuelve datos (aunque CbteNro sea 0)
            pvStatus = 'READY'
            ultimoAutorizadoCbteNro = ultimoAutorizadoResult.data.CbteNro || 0
            console.log(`✅ [WSFE Health-Check] PV ${ptoVtaConfig} está READY. Último autorizado: ${ultimoAutorizadoCbteNro}`)
          } else {
            const error11002 = ultimoAutorizadoResult.errors?.find((e: any) => e.code === 11002)
            const error11000 = ultimoAutorizadoResult.errors?.find((e: any) => e.code === 11000)
            const error11001 = ultimoAutorizadoResult.errors?.find((e: any) => e.code === 11001)
            
            if (error11002) {
              // Error 11002: PV no impactado/no habilitado
              pvStatus = 'PENDING'
              ultimoAutorizadoError = error11002
              console.log(`⏳ [WSFE Health-Check] PV ${ptoVtaConfig} no impactado (error 11002)`)
            } else if (error11000 || error11001) {
              // Errores de parámetros inválidos (no deberían pasar si el SOAP está correcto)
              pvStatus = 'ERROR'
              ultimoAutorizadoError = ultimoAutorizadoResult.errors?.[0]
              console.warn(`⚠️ [WSFE Health-Check] Error de parámetros inválidos: ${ultimoAutorizadoError?.code} - ${ultimoAutorizadoError?.msg}`)
            } else if (ultimoAutorizadoResult.errors && ultimoAutorizadoResult.errors.length > 0) {
              // Otro error
              pvStatus = 'ERROR'
              ultimoAutorizadoError = ultimoAutorizadoResult.errors[0]
              console.warn(`⚠️ [WSFE Health-Check] Error en FECompUltimoAutorizado: ${ultimoAutorizadoError.code} - ${ultimoAutorizadoError.msg}`)
            } else {
              // Sin errores pero sin datos (caso raro)
              pvStatus = 'PENDING'
              console.log(`⏳ [WSFE Health-Check] FECompUltimoAutorizado no devolvió errores ni datos`)
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
          console.error(`❌ [WSFE Health-Check] Error al llamar FECompUltimoAutorizado:`, errorMsg)
          pvStatus = 'ERROR'
          ultimoAutorizadoError = { code: 0, msg: errorMsg }
        }
      } else {
        console.warn('⚠️ [WSFE Health-Check] No hay ptoVta configurado, no se puede verificar con FECompUltimoAutorizado')
        // Fallback al criterio anterior si no hay ptoVta configurado
        if (ptoVtaError602) {
          pvStatus = 'PENDING'
        } else if (!ptosVentaResult.success && ptosVentaErrors.length > 0) {
          pvStatus = 'ERROR'
        } else if (ptosVenta.length > 0) {
          pvStatus = 'READY'
        }
      }

      // Usar estado persistido si está disponible y es más reciente
      const lastPtosVentaErrorCode = statusRecord?.lastErrorCode || ptoVtaError602?.code || null
      const lastPtosVentaMsg = statusRecord?.lastErrorMsg || ptoVtaError602?.msg || null

      console.log('✅ [WSFE Health-Check] Health-check exitoso')
      // Construir respuesta con diagnóstico completo
      const response: any = {
        // success general: true si auth OK (aunque PV esté pendiente)
        success: wsfeAuthOk,
        message: wsfeAuthOk
          ? (pvStatus === 'READY' ? 'WSFEv1 health-check exitoso' : 'WSFEv1 auth OK, PV pendiente')
          : 'WSFEv1 health-check con errores',
        // Separar autenticación de PV
        wsfeAuthOk,
        pvStatus,
        // Información del método usado para verificar PV
        pvCheckMethod: ptoVtaConfig ? 'FECompUltimoAutorizado' : 'FEParamGetPtosVenta',
        ultimoAutorizadoCbteNro,
        ultimoAutorizadoError,
        lastPtosVentaErrorCode,
        lastPtosVentaMsg,
        pvStatusRecord: statusRecord ? {
          status: statusRecord.status,
          attemptCount: statusRecord.attemptCount,
          firstSeenAt: statusRecord.firstSeenAt?.toISOString() || null,
          lastCheckedAt: statusRecord.lastCheckedAt.toISOString()
        } : null,
        ta: cacheInfo ? {
          hasCache: true,
          expirationTime: new Date(cacheInfo.expirationTime).toISOString(),
          obtainedAt: new Date(cacheInfo.obtainedAt).toISOString(),
          isValid: hasCache,
          source: 'DB/memory',
          expiresInMinutes: Math.floor((cacheInfo.expirationTime - Date.now()) / 60000)
        } : {
          hasCache: false,
          message: 'No hay TA en cache. Se obtuvo desde WSAA.'
        },
        ptosVenta: {
          success: ptosVentaResult.success,
          count: ptosVenta.length,
          list: ptosVenta.map((pv: any) => ({
            numero: pv.Nro || pv.numero || pv['@_Nro'],
            emisionTipo: pv.EmisionTipo || pv.emisionTipo || pv['@_EmisionTipo'],
            bloqueado: pv.Bloqueado || pv.bloqueado || pv['@_Bloqueado']
          })),
          configured: ptoVtaConfig || null,
          configuredExists: ptoVtaExists,
          errors: ptosVentaErrors,
          events: ptosVentaResult.events || [],
          rawData: ptosVentaResult.data, // Para diagnóstico
          diagnostic: ptoVtaError602
            ? {
                code: 602,
                message: 'WSFE no tiene puntos de venta habilitados aún (propagación/config)',
                action: 'Reintentar. El PV puede tardar en aparecer desde ARCA a WSFE.'
              }
            : ptoVtaError11002
            ? {
                code: 11002,
                message: 'Punto de venta no impactado aún en WSFE',
                action: 'Esperar propagación del punto de venta desde ARCA a WSFE (puede tardar horas)'
              }
            : ptosVenta.length === 0 && ptosVentaErrors.length === 0
            ? {
                message: 'Lista vacía sin errores - verificar estructura del XML response',
                action: 'Revisar logs de SOAP response en backend/logs/'
              }
            : null,
          message: ptoVtaError602
            ? 'WSFE no tiene PV habilitados aún (propagación/config). Reintentar.'
            : ptoVtaError11002
            ? 'PV no impactado aún en WSFE. Esperar propagación desde ARCA.'
            : null
        },
        tiposCbte: {
          success: tiposCbteResult.success,
          count: tiposCbte.length,
          list: tiposCbte.slice(0, 10).map((tc: any) => ({
            id: tc.Id || tc.id || tc['@_Id'],
            descripcion: tc.Desc || tc.desc || tc['#text'],
            fechaDesde: tc.FchDesde || tc.fchDesde,
            fechaHasta: tc.FchHasta || tc.fchHasta
          })),
          errors: tiposCbteErrors,
          events: tiposCbteResult.events || [],
          rawData: tiposCbteResult.data, // Para diagnóstico
          diagnostic: tiposCbte.length === 0 && tiposCbteErrors.length === 0
            ? {
                message: 'Lista vacía sin errores - verificar estructura del XML response',
                action: 'Revisar logs de SOAP response en backend/logs/'
              }
            : null
        },
        environment: env.AFIP_ENV || 'homo',
        cuit: env.AFIP_CUIT ? env.AFIP_CUIT.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3') : null,
        cuitNormalized: env.AFIP_CUIT, // CUIT del certificado sin guiones
        cuitUsedInAuth: (await FiscalConfigService.getCuitRepresentado()) || env.AFIP_CUIT || null, // CUIT efectivamente usado en Auth (puede ser representado)
        cuitRepresentado: await FiscalConfigService.getCuitRepresentado(), // CUIT representado configurado (null si no está configurado)
        timings: {
          ptosVentaMs: ptosVentaElapsed,
          tiposCbteMs: tiposCbteElapsed
        },
        suggestion: pvStatus === 'PENDING' && statusRecord && statusRecord.attemptCount > 48
          ? `⚠️ ERROR: El error 602 persiste después de ${statusRecord.firstPendingAt ? Math.floor((Date.now() - statusRecord.firstPendingAt.getTime()) / 3600000) : 'muchas'} horas (${statusRecord.attemptCount} intentos). Crear PV nuevo desde "Administración de Puntos de Venta y Domicilios" o abrir ticket ARCA con evidencia técnica (GET /api/fiscal/debug/export-wsfe-evidence).`
          : null,
        pvPendingMetrics: statusRecord && pvStatus === 'PENDING' ? {
          firstPendingAt: statusRecord.firstPendingAt?.toISOString() || null,
          lastPendingAt: statusRecord.lastPendingAt?.toISOString() || null,
          totalPendingMinutes: statusRecord.firstPendingAt 
            ? Math.floor((Date.now() - statusRecord.firstPendingAt.getTime()) / 60000)
            : null,
          pendingHours: statusRecord.firstPendingAt 
            ? Math.floor((Date.now() - statusRecord.firstPendingAt.getTime()) / 3600000)
            : null,
          isPersistent: statusRecord.attemptCount > 48
        } : null,
          importantNote: pvStatus === 'PENDING' && ptoVtaError602
          ? 'FEParamGetPtosVenta NO recibe ptoVta; devuelve TODOS los PV habilitados para WSFE del CUIT usado en Auth. Si devuelve 602, la lista está vacía desde WSFE para ese CUIT (no es un problema de configuración de ptoVta). Si persiste > 24h, probar con otro CUIT representado (delegación WSASS).'
          : null,
        checklist: pvStatus === 'PENDING' && statusRecord && statusRecord.attemptCount > 48
          ? {
              title: 'Checklist de diagnóstico (602 persistente > 24h)',
              items: [
                {
                  check: 'Verificar en ARCA que el PV fue creado para el MISMO CUIT',
                  action: 'Ingresar a ARCA y confirmar que el CUIT coincide exactamente'
                },
                {
                  check: 'Verificar que el PV figura como "Activo" en ARCA',
                  action: 'Revisar estado del PV en ARCA (no debe estar bloqueado o inactivo)'
                },
                {
                  check: 'Verificar que el sistema sea "Factura Electrónica - Monotributo - Web Services"',
                  action: 'Confirmar que el PV está habilitado para WSFE, no solo para otros sistemas'
                },
                {
                  check: 'Crear un PV nuevo (ej: PV 4) si PV 3 no impacta',
                  action: 'A veces un PV queda "colgado" y el siguiente sí replica. Crear PV nuevo y reintentar.'
                },
                {
                  check: 'Si tras 24h adicionales sigue 602, contactar soporte ARCA',
                  action: 'Puede haber inconsistencia de replicación en el lado de AFIP/ARCA'
                }
              ]
            }
          : null
      }

      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      const errorStack = error instanceof Error ? error.stack : undefined
      
      console.error('❌ [WSFE Health-Check] Error:', errorMessage)
      if (errorStack) {
        console.error('📚 [WSFE Health-Check] Stack:', errorStack)
      }
      
      return reply.status(500).send({
        error: true,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: errorStack
        } : undefined
      })
    }
  })

  // Endpoint de polling para puntos de venta (con backoff y tracking)
  app.get('/test/wsfe/ptos-venta', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = env.AFIP_CUIT!

      // Obtener estado actual desde DB
      let statusRecord = await prisma.fiscalPtoVtaStatus.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        }
      })

      const wsfeClient = new ArcaWsfeClient()
      const result = await wsfeClient.getPtosVenta()

      // Extraer datos de puntos de venta
      const ptosVentaData = result.data
      let ptosVenta: any[] = []
      
      if (ptosVentaData?.PtoVta) {
        ptosVenta = Array.isArray(ptosVentaData.PtoVta) ? ptosVentaData.PtoVta : [ptosVentaData.PtoVta]
      } else if (ptosVentaData?.ResultGet?.PtoVta) {
        ptosVenta = Array.isArray(ptosVentaData.ResultGet.PtoVta) 
          ? ptosVentaData.ResultGet.PtoVta 
          : [ptosVentaData.ResultGet.PtoVta]
      }

      // Detectar error 602 "Sin Resultados" u otros errores
      const error602 = result.errors?.find((e: any) => e.code === 602)
      const firstError = result.errors?.[0]
      const ptoVtaConfig = await FiscalConfigService.getPtoVta()

      // Determinar nuevo estado
      let newStatus: 'PENDING' | 'READY' | 'ERROR' = 'READY'
      let firstSeenAt: Date | null = null
      let wasPending = statusRecord?.status === 'PENDING'

      if (error602) {
        newStatus = 'PENDING'
      } else if (!result.success && firstError) {
        newStatus = 'ERROR'
      } else if (ptosVenta.length === 0) {
        newStatus = 'PENDING'
      }

      // Si pasó de PENDING a READY, registrar firstSeenAt
      if (newStatus === 'READY' && wasPending && ptosVenta.length > 0) {
        firstSeenAt = new Date()
        console.log(`🎉 [PV Status] PV detectado por primera vez: ${ptosVenta.map((pv: any) => pv.Nro || pv.numero).join(', ')}`)
      } else if (statusRecord?.firstSeenAt) {
        firstSeenAt = statusRecord.firstSeenAt
      }

      // Actualizar o crear registro de estado
      const attemptCount = (statusRecord?.attemptCount || 0) + 1
      
      statusRecord = await prisma.fiscalPtoVtaStatus.upsert({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        },
        create: {
          env: envKey,
          cuit: cuitNormalized,
          status: newStatus,
          lastErrorCode: firstError?.code || null,
          lastErrorMsg: firstError?.msg || null,
          ptosVentaList: ptosVenta.length > 0 ? ptosVenta as any : null,
          firstSeenAt,
          attemptCount: 1,
          lastCheckedAt: new Date()
        },
        update: {
          status: newStatus,
          lastErrorCode: firstError?.code || null,
          lastErrorMsg: firstError?.msg || null,
          ptosVentaList: ptosVenta.length > 0 ? ptosVenta as any : null,
          firstSeenAt: firstSeenAt || undefined,
          attemptCount,
          lastCheckedAt: new Date()
        }
      })

      // Calcular métricas de PENDING persistente
      const totalPendingMinutes = statusRecord.firstPendingAt 
        ? Math.floor((Date.now() - statusRecord.firstPendingAt.getTime()) / 60000)
        : null
      const pendingHours = totalPendingMinutes ? Math.floor(totalPendingMinutes / 60) : null

      // Construir respuesta
      if (newStatus === 'PENDING') {
        const suggestedRetrySeconds = 300 // 5 minutos
        const attemptCount = statusRecord.attemptCount
        const isPersistent = attemptCount > 48 && totalPendingMinutes && totalPendingMinutes > 1440 // > 24 horas
        
        // Elevar severity si es PENDING persistente
        const severity = isPersistent ? 'error' : attemptCount > 48 ? 'warning' : 'info'
        
        // Checklist accionable si lleva más de 48 intentos (24 horas con polling cada 5 min)
        const checklist = attemptCount > 48 ? {
          title: 'Checklist de diagnóstico (602 persistente > 24h)',
          items: [
            {
              check: 'Verificar en ARCA que el PV fue creado para el MISMO CUIT',
              action: 'Ingresar a ARCA y confirmar que el CUIT coincide exactamente'
            },
            {
              check: 'Verificar que el PV figura como "Activo" en ARCA',
              action: 'Revisar estado del PV en ARCA (no debe estar bloqueado o inactivo)'
            },
            {
              check: 'Verificar que el sistema sea "Factura Electrónica - Monotributo - Web Services"',
              action: 'Confirmar que el PV está habilitado para WSFE, no solo para otros sistemas'
            },
            {
              check: 'Crear un PV nuevo (ej: PV 4) si PV 3 no impacta',
              action: 'A veces un PV queda "colgado" y el siguiente sí replica. Crear PV nuevo y reintentar.'
            },
            {
              check: 'Si tras 24h adicionales sigue 602, contactar soporte ARCA',
              action: 'Puede haber inconsistencia de replicación en el lado de AFIP/ARCA'
            }
          ]
        } : null

        return {
          pvStatus: 'PENDING',
          pending: true,
          message: 'WSFE no tiene puntos de venta habilitados aún',
          error: error602 ? {
            code: error602.code,
            msg: error602.msg
          } : firstError ? {
            code: firstError.code,
            msg: firstError.msg
          } : null,
          nextRetrySeconds: suggestedRetrySeconds,
          attemptCount,
          lastCheckedAt: statusRecord.lastCheckedAt.toISOString(),
          firstPendingAt: statusRecord.firstPendingAt?.toISOString() || null,
          lastPendingAt: statusRecord.lastPendingAt?.toISOString() || null,
          totalPendingMinutes,
          pendingHours,
          severity,
          environment: envKey,
          cuit: env.AFIP_CUIT?.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3'),
          cuitNormalized,
          cuitUsedInAuth: (await FiscalConfigService.getCuitRepresentado()) || cuitNormalized,
          cuitRepresentado: await FiscalConfigService.getCuitRepresentado(),
          configured: ptoVtaConfig || null,
          importantNote: 'FEParamGetPtosVenta NO recibe ptoVta; devuelve TODOS los PV habilitados para WSFE del CUIT usado en Auth. Si devuelve 602, la lista está vacía desde WSFE para ese CUIT. Si persiste > 24h, probar con otro CUIT representado (PUT /api/fiscal/config/cuit-representado).',
          suggestion: attemptCount <= 48 
            ? 'Esperando propagación de PV desde ARCA a WSFE. El polling automático verificará cada 5 minutos.'
            : isPersistent
            ? `⚠️ ERROR: El error 602 persiste después de ${pendingHours}h (${attemptCount} intentos). Crear PV nuevo desde "Administración de Puntos de Venta y Domicilios" o abrir ticket ARCA con evidencia técnica.`
            : 'El error 602 persiste después de 24 horas. Revisar el checklist de diagnóstico.',
          checklist,
          recommendation: isPersistent
            ? {
                action: 'Crear PV nuevo desde "Administración de Puntos de Venta y Domicilios"',
                alternative: 'Abrir ticket ARCA con evidencia técnica (usar GET /api/fiscal/debug/export-wsfe-evidence)',
                note: 'Con 167+ intentos ya no es propagación razonable. Esto apunta a PV no habilitado para WSFE o desfasaje en ARCA/AFIP.'
              }
            : null
        }
      }

      // PV disponible: devolver lista
      const ptoVtaExists = ptoVtaConfig ? ptosVenta.some((pv: any) => {
        const pvNum = typeof pv.Nro === 'number' ? pv.Nro : parseInt(pv.Nro || pv.numero || '0')
        return pvNum === ptoVtaConfig
      }) : false

      return {
        pvStatus: 'READY',
        pending: false,
        success: true,
        count: ptosVenta.length,
        list: ptosVenta.map((pv: any) => ({
          numero: pv.Nro || pv.numero || pv['@_Nro'],
          emisionTipo: pv.EmisionTipo || pv.emisionTipo || pv['@_EmisionTipo'],
          bloqueado: pv.Bloqueado || pv.bloqueado || pv['@_Bloqueado']
        })),
        configured: ptoVtaConfig || null,
        configuredExists: ptoVtaExists,
        firstSeenAt: statusRecord.firstSeenAt?.toISOString() || null,
        attemptCount: statusRecord.attemptCount,
        lastCheckedAt: statusRecord.lastCheckedAt.toISOString(),
        environment: envKey,
        cuit: env.AFIP_CUIT?.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3'),
        cuitNormalized,
        errors: result.errors || [],
        events: result.events || []
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para listar puntos de venta (legacy, mantener compatibilidad)
  app.get('/wsfe/ptos-venta', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const wsfeClient = new ArcaWsfeClient()
      const result = await wsfeClient.getPtosVenta()

      if (!result.success) {
        return reply.status(500).send({
          error: true,
          message: 'Error al obtener puntos de venta desde WSFEv1',
          wsfeErrors: result.errors
        })
      }

      const ptosVenta = result.data?.PtoVta || []
      const ptoVtaConfig = await FiscalConfigService.getPtoVta()

      return {
        success: true,
        ptosVenta: ptosVenta.map((pv: any) => ({
          numero: pv.Nro,
          emisionTipo: pv.EmisionTipo,
          bloqueado: pv.Bloqueado,
          isConfigured: pv.Nro === ptoVtaConfig
        })),
        configured: ptoVtaConfig || null,
        recommendation: ptoVtaConfig 
          ? `Punto de venta ${ptoVtaConfig} está configurado.`
          : ptosVenta.length > 0
          ? `Recomendación: Configura ptoVta=${ptosVenta[0].Nro} usando PUT /api/fiscal/config/pto-vta (primer punto disponible)`
          : 'No hay puntos de venta disponibles.'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Helper para obtener master data con cache
  async function getMasterDataWithCache(
    dataType: 'tiposDoc' | 'tiposIva' | 'tiposMonedas' | 'tiposTributos' | 'tiposCbte' | 'condicionIvaReceptor',
    wsfeMethod: () => Promise<any>
  ) {
    const envKey = env.AFIP_ENV || 'homo'
    const cacheKey = `${envKey}_${dataType}`
    
    // Verificar cache en DB
    const cached = await prisma.fiscalMasterDataCache.findUnique({
      where: {
        env_dataType: {
          env: envKey,
          dataType
        }
      }
    })

    // Si hay cache válido (no expirado), devolverlo
    if (cached && cached.expiresAt > new Date()) {
      console.log(`✅ [Master Data] ${dataType} desde cache (expira: ${cached.expiresAt.toISOString()})`)
      return {
        success: true,
        data: cached.data as any,
        fromCache: true,
        cachedAt: cached.cachedAt.toISOString(),
        expiresAt: cached.expiresAt.toISOString()
      }
    }

    // Cache expirado o no existe: obtener desde WSFE
    console.log(`📞 [Master Data] Obteniendo ${dataType} desde WSFE...`)
    const wsfeClient = new ArcaWsfeClient()
    const result = await wsfeMethod(wsfeClient)

    if (!result.success) {
      // Si falla pero hay cache (aunque expirado), devolverlo como fallback
      if (cached) {
        console.warn(`⚠️ [Master Data] ${dataType} falló en WSFE, usando cache expirado como fallback`)
        return {
          success: true,
          data: cached.data as any,
          fromCache: true,
          expired: true,
          cachedAt: cached.cachedAt.toISOString(),
          errors: result.errors
        }
      }
      return result
    }

    // Extraer datos según el tipo
    let dataArray: any[] = []
    const resultData = result.data
    
    if (dataType === 'tiposDoc' && resultData?.DocTipo) {
      dataArray = Array.isArray(resultData.DocTipo) ? resultData.DocTipo : [resultData.DocTipo]
    } else if (dataType === 'tiposIva' && resultData?.IvaTipo) {
      dataArray = Array.isArray(resultData.IvaTipo) ? resultData.IvaTipo : [resultData.IvaTipo]
    } else if (dataType === 'tiposMonedas' && resultData?.Moneda) {
      dataArray = Array.isArray(resultData.Moneda) ? resultData.Moneda : [resultData.Moneda]
    } else if (dataType === 'tiposTributos' && resultData?.TributoTipo) {
      dataArray = Array.isArray(resultData.TributoTipo) ? resultData.TributoTipo : [resultData.TributoTipo]
    } else if (dataType === 'tiposCbte' && resultData?.CbteTipo) {
      dataArray = Array.isArray(resultData.CbteTipo) ? resultData.CbteTipo : [resultData.CbteTipo]
    } else if (dataType === 'condicionIvaReceptor') {
      // Buscar CondicionIvaReceptor (camelCase) o CondicionIVAReceptor (mayúsculas)
      if (resultData?.CondicionIvaReceptor) {
        dataArray = Array.isArray(resultData.CondicionIvaReceptor) ? resultData.CondicionIvaReceptor : [resultData.CondicionIvaReceptor]
      } else if (resultData?.CondicionIVAReceptor) {
        dataArray = Array.isArray(resultData.CondicionIVAReceptor) ? resultData.CondicionIVAReceptor : [resultData.CondicionIVAReceptor]
      }
    } else if (resultData?.ResultGet) {
      // Intentar extraer desde ResultGet
      const resultGet = resultData.ResultGet
      if (resultGet.DocTipo) dataArray = Array.isArray(resultGet.DocTipo) ? resultGet.DocTipo : [resultGet.DocTipo]
      else if (resultGet.IvaTipo) dataArray = Array.isArray(resultGet.IvaTipo) ? resultGet.IvaTipo : [resultGet.IvaTipo]
      else if (resultGet.Moneda) dataArray = Array.isArray(resultGet.Moneda) ? resultGet.Moneda : [resultGet.Moneda]
      else if (resultGet.TributoTipo) dataArray = Array.isArray(resultGet.TributoTipo) ? resultGet.TributoTipo : [resultGet.TributoTipo]
      else if (resultGet.CbteTipo) dataArray = Array.isArray(resultGet.CbteTipo) ? resultGet.CbteTipo : [resultGet.CbteTipo]
      else if (resultGet.CondicionIvaReceptor) {
        // Priorizar camelCase (estructura real)
        dataArray = Array.isArray(resultGet.CondicionIvaReceptor) ? resultGet.CondicionIvaReceptor : [resultGet.CondicionIvaReceptor]
      } else if (resultGet.CondicionIVAReceptor) {
        dataArray = Array.isArray(resultGet.CondicionIVAReceptor) ? resultGet.CondicionIVAReceptor : [resultGet.CondicionIVAReceptor]
      }
    }

    // NO cachear si está vacío (evitar cachear errores de parsing)
    if (dataArray.length === 0) {
      console.warn(`⚠️ [Master Data] ${dataType} está vacío. NO se guardará en cache.`)
      console.warn(`   RawData keys:`, Object.keys(resultData || {}))
      return {
        success: false,
        error: 'No se pudieron extraer datos',
        data: [],
        diagnostic: {
          rawDataKeys: Object.keys(resultData || {}),
          pathsTried: dataType === 'condicionIvaReceptor' ? [
            'result.data.ResultGet.CondicionIvaReceptor',
            'result.data.ResultGet.CondicionIVAReceptor',
            'result.data.CondicionIvaReceptor',
            'result.data.CondicionIVAReceptor'
          ] : []
        }
      }
    }

    // Guardar en cache (válido por 24 horas)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    await prisma.fiscalMasterDataCache.upsert({
      where: {
        env_dataType: {
          env: envKey,
          dataType
        }
      },
      create: {
        env: envKey,
        dataType,
        data: dataArray as any,
        expiresAt
      },
      update: {
        data: dataArray as any,
        expiresAt,
        cachedAt: new Date()
      }
    })

    console.log(`✅ [Master Data] ${dataType} guardado en cache (expira: ${expiresAt.toISOString()})`)

    return {
      success: true,
      data: dataArray,
      fromCache: false,
      cachedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      errors: result.errors || [],
      events: result.events || []
    }
  }

  // Endpoint para tipos de documento
  app.get('/wsfe/tipos-doc', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const result = await getMasterDataWithCache('tiposDoc', (client) => client.getTiposDoc())
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para tipos de IVA
  app.get('/wsfe/tipos-iva', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const result = await getMasterDataWithCache('tiposIva', (client) => client.getTiposIva())
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para tipos de monedas
  app.get('/wsfe/tipos-monedas', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const result = await getMasterDataWithCache('tiposMonedas', (client) => client.getTiposMonedas())
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para tipos de tributos
  app.get('/wsfe/tipos-tributos', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const result = await getMasterDataWithCache('tiposTributos', (client) => client.getTiposTributos())
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para tipos de comprobante (con cache)
  app.get('/wsfe/tipos-cbte', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const result = await getMasterDataWithCache('tiposCbte', (client) => client.getTiposCbte())
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para condiciones IVA del receptor (con cache)
  app.get('/wsfe/condicion-iva-receptor', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const result = await getMasterDataWithCache('condicionIvaReceptor', (client) => client.getCondicionIvaReceptor())
      
      // Extraer CondicionIvaReceptor de la estructura real: ResultGet.CondicionIvaReceptor
      let rawData = result.data
      let condicionIvaArray: any[] = []
      
      // Intentar diferentes estructuras posibles
      if (rawData?.ResultGet?.CondicionIvaReceptor) {
        condicionIvaArray = Array.isArray(rawData.ResultGet.CondicionIvaReceptor) 
          ? rawData.ResultGet.CondicionIvaReceptor 
          : [rawData.ResultGet.CondicionIvaReceptor]
      } else if (rawData?.ResultGet?.CondicionIVAReceptor) {
        condicionIvaArray = Array.isArray(rawData.ResultGet.CondicionIVAReceptor) 
          ? rawData.ResultGet.CondicionIVAReceptor 
          : [rawData.ResultGet.CondicionIVAReceptor]
      } else if (rawData?.CondicionIvaReceptor) {
        condicionIvaArray = Array.isArray(rawData.CondicionIvaReceptor) 
          ? rawData.CondicionIvaReceptor 
          : [rawData.CondicionIvaReceptor]
      } else if (rawData?.CondicionIVAReceptor) {
        condicionIvaArray = Array.isArray(rawData.CondicionIVAReceptor) 
          ? rawData.CondicionIVAReceptor 
          : [rawData.CondicionIVAReceptor]
      } else if (Array.isArray(rawData)) {
        condicionIvaArray = rawData
      }
      
      // Normalizar respuesta para facilitar uso
      const normalized = condicionIvaArray.map((item: any) => ({
        id: Number(item.Id || item.id || item['@_Id'] || 0),
        descripcion: String(item.Desc || item.desc || item['#text'] || item.descripcion || ''),
        cmpClase: item.Cmp_Clase || item.cmpClase || item.cmp_clase || '',
        fechaDesde: item.FchDesde || item.fchDesde || item.fechaDesde || null,
        fechaHasta: item.FchHasta || item.fchHasta || item.fechaHasta || null
      })).filter(item => item.id > 0) // Filtrar items inválidos

      // Si no hay datos normalizados, no devolver éxito
      if (normalized.length === 0) {
        console.error('❌ [Condicion IVA Receptor] No se pudieron extraer datos. RawData keys:', Object.keys(rawData || {}))
        return reply.status(500).send({
          error: true,
          message: 'No se pudieron extraer condiciones IVA del receptor. Ver logs para diagnóstico.',
          diagnostic: {
            rawDataKeys: Object.keys(rawData || {}),
            pathsTried: [
              'result.data.ResultGet.CondicionIvaReceptor',
              'result.data.ResultGet.CondicionIVAReceptor',
              'result.data.CondicionIvaReceptor',
              'result.data.CondicionIVAReceptor',
              'result.data (array)'
            ]
          }
        })
      }

      return {
        ...result,
        data: normalized,
        normalized: normalized
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ [Condicion IVA Receptor] Error:', errorMessage)
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para invalidar cache de master data (admin)
  app.post('/cache/invalidate', {
    preHandler: [authenticate, authorize('ADMIN')],
    schema: {
      description: 'Invalidar cache de master data fiscal',
      tags: ['Fiscal', 'Admin'],
      body: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['tiposDoc', 'tiposIva', 'tiposMonedas', 'tiposTributos', 'tiposCbte', 'condicionIvaReceptor', 'all'],
            description: 'Tipo de master data a invalidar, o "all" para invalidar todo'
          },
          env: {
            type: 'string',
            enum: ['homo', 'prod'],
            description: 'Ambiente (opcional, por defecto usa el configurado)'
          }
        },
        required: ['type']
      }
    }
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const { type, env: envParam } = request.body as { type: string; env?: string }
      const envKey = envParam || env.AFIP_ENV || 'homo'

      if (type === 'all') {
        // Invalidar todos los tipos
        const deleted = await prisma.fiscalMasterDataCache.deleteMany({
          where: {
            env: envKey
          }
        })
        return {
          success: true,
          message: `Cache invalidado para todos los tipos en ${envKey}`,
          deletedCount: deleted.count
        }
      } else {
        // Invalidar un tipo específico
        const deleted = await prisma.fiscalMasterDataCache.deleteMany({
          where: {
            env: envKey,
            dataType: type
          }
        })
        return {
          success: true,
          message: `Cache invalidado para ${type} en ${envKey}`,
          deletedCount: deleted.count
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ [Cache Invalidate] Error:', errorMessage)
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para último comprobante autorizado (solo si PV está listo)
  app.get('/wsfe/ultimo-autorizado', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const { ptoVta, cbteTipo } = request.query as { ptoVta?: string; cbteTipo?: string }
      
      if (!ptoVta || !cbteTipo) {
        return reply.status(400).send({
          error: true,
          message: 'Se requieren ptoVta y cbteTipo como query parameters'
        })
      }

      const wsfeClient = new ArcaWsfeClient()
      const result = await wsfeClient.getUltimoAutorizado(
        parseInt(ptoVta),
        parseInt(cbteTipo)
      )

      if (!result.success) {
        return reply.status(500).send({
          error: true,
          message: 'Error al obtener último comprobante autorizado',
          wsfeErrors: result.errors
        })
      }

      return {
        success: true,
        data: result.data,
        errors: result.errors || [],
        events: result.events || []
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para validar si se puede emitir
  app.get('/wsfe/can-issue', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const { cbteTipo } = request.query as { cbteTipo?: string }
      const tipo = cbteTipo ? parseInt(cbteTipo) : 11 // Default: Factura C

      const { FiscalIssueValidator } = await import('../services/arca/FiscalIssueValidator.js')
      const validator = new FiscalIssueValidator()
      const result = await validator.canIssue(tipo)

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  /**
   * Endpoint de dry-run para FECAESolicitar (sin emitir)
   * Construye el SOAP request que se enviaría pero NO lo ejecuta
   */
  app.post('/wsfe/issue-dry-run', {
    preHandler: [authenticate],
    schema: {
      description: 'Preparar request de FECAESolicitar sin ejecutar (dry-run)',
      tags: ['Fiscal', 'Issue'],
      body: {
        type: 'object',
        properties: {
        importeTotal: { type: 'number', minimum: 0.01 },
        importeNeto: { type: 'number', minimum: 0 },
        importeIva: { type: 'number', minimum: 0 },
        cbteTipo: { type: 'number', default: 11 },
        fechaEmision: { type: 'string', format: 'date' },
        condicionIvaReceptorId: { type: 'number', description: 'ID de condición IVA del receptor (si no se proporciona, se resuelve automáticamente para Consumidor Final)' }
        },
        required: ['importeTotal']
      }
    }
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const { FiscalIssueValidator } = await import('../services/arca/FiscalIssueValidator.js')
      const validator = new FiscalIssueValidator()

      // 1. Validar que se puede emitir
      const canIssueResult = await validator.canIssue()
      if (!canIssueResult.canIssue) {
        return reply.status(400).send({
          error: true,
          message: canIssueResult.reason || 'No se puede emitir comprobante',
          canIssueResult
        })
      }

      // 2. Obtener ptoVta configurado
      const ptoVtaConfig = await FiscalConfigService.getPtoVta()
      if (!ptoVtaConfig) {
        return reply.status(400).send({
          error: true,
          message: 'No hay punto de venta configurado'
        })
      }

      // 3. Preparar DTO
      const body = request.body as {
        importeTotal: number
        importeNeto?: number
        importeIva?: number
        cbteTipo?: number
        fechaEmision?: string
        condicionIvaReceptorId?: number
      }

      const fechaEmision = body.fechaEmision ? new Date(body.fechaEmision) : new Date()
      const dto = await validator.prepareFECAESolicitarDTO({
        ptoVta: ptoVtaConfig,
        cbteTipo: body.cbteTipo || 11,
        importeTotal: body.importeTotal,
        importeNeto: body.importeNeto,
        importeIva: body.importeIva,
        fechaEmision,
        condicionIvaReceptorId: body.condicionIvaReceptorId
      })

      // 4. Generar SOAP request (sin ejecutar)
      const wsfeClient = new ArcaWsfeClient()
      const soapExport = await wsfeClient.generateSoapRequest('FECAESolicitar', dto.FeCAEReq)

      // 5. Validaciones
      const validations = {
        ptoVta: {
          configured: ptoVtaConfig,
          valid: ptoVtaConfig >= 1 && ptoVtaConfig <= 99998
        },
        cbteTipo: {
          value: dto.FeCAEReq.FeCabReq.CbteTipo,
          valid: dto.FeCAEReq.FeCabReq.CbteTipo === 11 || dto.FeCAEReq.FeCabReq.CbteTipo > 0
        },
        numeracion: {
          cbteDesde: dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteDesde,
          cbteHasta: dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteHasta,
          valid: dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteDesde > 0 && 
                 dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteHasta >= dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteDesde
        },
        importes: {
          impTotal: dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpTotal,
          impNeto: dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpNeto,
          impIVA: dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpIVA,
          impTotConc: dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpTotConc,
          impOpEx: dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpOpEx,
          impTrib: dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpTrib,
          valid: dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpTotal > 0 &&
                 (dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpNeto + 
                  dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpTotConc + 
                  dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpOpEx + 
                  dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpIVA + 
                  dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpTrib) === dto.FeCAEReq.FeDetReq.FECAEDetRequest.ImpTotal
        },
        fecha: {
          value: dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteFch,
          format: 'YYYYMMDD',
          valid: /^\d{8}$/.test(dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteFch)
        },
        condicionIvaReceptor: {
          id: dto.FeCAEReq.FeDetReq.FECAEDetRequest.CondicionIVAReceptorId,
          valid: dto.FeCAEReq.FeDetReq.FECAEDetRequest.CondicionIVAReceptorId > 0,
          note: 'CondicionIVAReceptorId es obligatorio desde 2025 (Obs 10246)'
        },
        moneda: {
          id: dto.FeCAEReq.FeDetReq.FECAEDetRequest.MonId,
          cotiz: dto.FeCAEReq.FeDetReq.FECAEDetRequest.MonCotiz,
          valid: dto.FeCAEReq.FeDetReq.FECAEDetRequest.MonId === 'PES' && 
                 dto.FeCAEReq.FeDetReq.FECAEDetRequest.MonCotiz === 1
        }
      }

      const allValid = Object.values(validations).every(v => v.valid !== false)

      return {
        success: true,
        dryRun: true,
        message: 'Request preparado correctamente (NO ejecutado)',
        dto,
        soapRequest: {
          sanitized: soapExport.soapRequestSanitized,
          headers: soapExport.headers,
          url: soapExport.url,
          method: soapExport.method
        },
        validations,
        allValid,
        readyToIssue: allValid && canIssueResult.canIssue,
        note: 'Este endpoint NO ejecuta FECAESolicitar. Para emitir realmente, usar POST /api/fiscal/wsfe/issue (cuando esté habilitado).'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ [Dry-Run] Error:', errorMessage)
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  /**
   * Endpoint de emisión REAL de comprobantes (FECAESolicitar)
   * Requiere FISCAL_ISSUE_ENABLED=true y rol ADMIN
   */
  app.post('/wsfe/issue', {
    preHandler: [authenticate, authorize('ADMIN')],
    schema: {
      description: 'Emitir comprobante electrónico real (FECAESolicitar)',
      tags: ['Fiscal', 'Issue'],
      body: {
        type: 'object',
        properties: {
        importeTotal: { type: 'number', minimum: 0.01 },
        importeNeto: { type: 'number', minimum: 0 },
        importeIva: { type: 'number', minimum: 0 },
        ptoVta: { type: 'number', minimum: 1, maximum: 99998 },
        cbteTipo: { type: 'number', default: 11 },
        docTipo: { type: 'number', default: 99 },
        docNro: { type: 'number', default: 0 },
        fechaEmision: { type: 'string', format: 'date' },
        idempotencyKey: { type: 'string' },
        condicionIvaReceptorId: { type: 'number', description: 'ID de condición IVA del receptor (si no se proporciona, se resuelve automáticamente para Consumidor Final)' }
        },
        required: ['importeTotal']
      }
    }
  }, async (request, reply) => {
    try {
      // 1. Verificar flag de habilitación
      if (process.env.FISCAL_ISSUE_ENABLED !== 'true') {
        return reply.status(403).send({
          error: true,
          message: 'Emisión de comprobantes no está habilitada. Requiere FISCAL_ISSUE_ENABLED=true en .env'
        })
      }

      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const body = request.body as {
        importeTotal: number
        importeNeto?: number
        importeIva?: number
        ptoVta?: number
        cbteTipo?: number
        docTipo?: number
        docNro?: number
        fechaEmision?: string
        idempotencyKey?: string
        condicionIvaReceptorId?: number
      }

      // 2. Generar o usar idempotency key
      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = (await FiscalConfigService.getCuitRepresentado()) || env.AFIP_CUIT!
      const ptoVtaConfig = body.ptoVta || await FiscalConfigService.getPtoVta()
      
      if (!ptoVtaConfig) {
        return reply.status(400).send({
          error: true,
          message: 'No hay punto de venta configurado'
        })
      }

      const fechaEmision = body.fechaEmision ? new Date(body.fechaEmision) : new Date()
      const cbteTipo = body.cbteTipo || 11

      // Generar idempotency key si no se proporciona
      let idempotencyKey = body.idempotencyKey
      if (!idempotencyKey) {
        const hashInput = `${envKey}:${cuitNormalized}:${ptoVtaConfig}:${cbteTipo}:${body.importeTotal}:${fechaEmision.toISOString().split('T')[0]}`
        idempotencyKey = crypto.createHash('sha256').update(hashInput).digest('hex')
      }

      // 3. Verificar idempotencia
      const existingDoc = await prisma.fiscalIssuedDocument.findUnique({
        where: { idempotencyKey }
      })

      if (existingDoc) {
        console.log(`ℹ️ [Issue] Documento ya emitido con idempotencyKey: ${idempotencyKey}`)
        
        // Si el documento existente fue rechazado, permitir nueva emisión con nueva key
        // pero informar al usuario
        if (existingDoc.estado === 'REJECTED') {
          console.log(`⚠️ [Issue] Documento previo fue REJECTED. Permitir nueva emisión con nueva idempotencyKey.`)
          // No retornar aquí, continuar con la emisión (pero usar nueva key si se proporciona)
        } else {
          // Si fue aprobado, devolver el resultado existente
          return reply.status(200).send({
            success: true,
            idempotent: true,
            message: 'Este comprobante ya fue emitido anteriormente',
            document: {
              id: existingDoc.id,
              ptoVta: existingDoc.ptoVta,
              cbteTipo: existingDoc.cbteTipo,
              cbteNro: existingDoc.cbteNro,
              cae: existingDoc.cae,
              caeVto: existingDoc.caeVto.toISOString(),
              estado: existingDoc.estado,
              condicionIvaReceptorId: existingDoc.condicionIvaReceptorId,
              createdAt: existingDoc.createdAt.toISOString()
            }
          })
        }
      }

      // 4. Validar pvStatus READY usando FECompUltimoAutorizado
      const { FiscalIssueValidator } = await import('../services/arca/FiscalIssueValidator.js')
      const validator = new FiscalIssueValidator()
      const canIssueResult = await validator.canIssue(cbteTipo)
      
      if (!canIssueResult.canIssue) {
        return reply.status(400).send({
          error: true,
          message: canIssueResult.reason || 'No se puede emitir comprobante',
          canIssueResult
        })
      }

      // 5. Preparar DTO (incluye resolución automática de CondicionIVAReceptorId si no se proporciona)
      const dto = await validator.prepareFECAESolicitarDTO({
        ptoVta: ptoVtaConfig,
        cbteTipo,
        importeTotal: body.importeTotal,
        importeNeto: body.importeNeto,
        importeIva: body.importeIva,
        fechaEmision,
        condicionIvaReceptorId: body.condicionIvaReceptorId
      })

      // Log del CondicionIVAReceptorId usado (para diagnóstico si hay rechazo)
      const condicionIvaReceptorIdUsed = dto.FeCAEReq.FeDetReq.FECAEDetRequest.CondicionIVAReceptorId
      console.log(`📋 [Issue] CondicionIVAReceptorId usado: ${condicionIvaReceptorIdUsed}`)

      // 6. Ejecutar FECAESolicitar
      console.log(`📤 [Issue] Emitiendo comprobante: ptoVta=${ptoVtaConfig}, cbteTipo=${cbteTipo}, cbteDesde=${dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteDesde}`)
      const wsfeClient = new ArcaWsfeClient()
      const result = await wsfeClient.solicitarCAE(dto.FeCAEReq)

      // 7. Parsear respuesta
      const responseData = result.data as any
      const feCabResp = responseData.FeCabResp || responseData.feCabResp
      const feDetResp = responseData.FeDetResp || responseData.feDetResp
      const detResponse = feDetResp?.FECAEDetResponse || feDetResp?.fecaedetResponse

      const resultado = feCabResp?.Resultado || detResponse?.Resultado || 'R'
      // Normalizar CAE a string (puede venir como número o string)
      const caeRaw = detResponse?.CAE || detResponse?.cae || detResponse?.CAE?.['#text'] || detResponse?.cae?.['#text']
      const cae = caeRaw ? String(caeRaw) : null
      // Normalizar caeFchVto a string (puede venir como objeto, número o string)
      const caeFchVtoRaw = detResponse?.CAEFchVto || detResponse?.caeFchVto || detResponse?.CAEFchVto?.['#text'] || detResponse?.caeFchVto?.['#text']
      const caeFchVto = caeFchVtoRaw ? String(caeFchVtoRaw) : null
      const cbteNro = detResponse?.CbteDesde || detResponse?.cbteDesde || dto.FeCAEReq.FeDetReq.FECAEDetRequest.CbteDesde

      const estado = resultado === 'A' ? 'APPROVED' : 'REJECTED'
      
      // Log para diagnóstico
      if (caeFchVtoRaw && typeof caeFchVtoRaw !== 'string') {
        console.log(`⚠️ [Issue] caeFchVtoRaw tipo inesperado: ${typeof caeFchVtoRaw}, valor:`, caeFchVtoRaw)
      }

      // 8. Guardar request/response en logs
      try {
        const fs = await import('fs')
        const path = await import('path')
        const logsDir = path.join(process.cwd(), 'backend', 'logs')
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true })
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        
        // Guardar request sanitizado
        const soapExport = await wsfeClient.generateSoapRequest('FECAESolicitar', dto.FeCAEReq)
        const requestLogPath = path.join(logsDir, `wsfe-FECAESolicitar-request-${timestamp}.xml`)
        fs.writeFileSync(requestLogPath, soapExport.soapRequestSanitized, 'utf8')
        
        // Guardar response completo
        const responseLogPath = path.join(logsDir, `wsfe-FECAESolicitar-response-${timestamp}.xml`)
        // El response ya está en result, pero necesitamos el XML crudo
        // Por ahora guardamos el JSON parseado
        fs.writeFileSync(responseLogPath, JSON.stringify(result, null, 2), 'utf8')
        
        console.log(`📝 [Issue] Logs guardados: ${requestLogPath}, ${responseLogPath}`)
      } catch (logError) {
        console.warn('⚠️ [Issue] No se pudieron guardar logs:', logError)
      }

      // 9. Persistir en DB
      let issuedDoc
      if (estado === 'APPROVED' && cae && caeFchVto) {
        // Parsear fecha de vencimiento del CAE (formato YYYYMMDD)
        let caeVtoDate: Date
        try {
          if (caeFchVto.length >= 8) {
            caeVtoDate = new Date(
              parseInt(caeFchVto.substring(0, 4)),
              parseInt(caeFchVto.substring(4, 6)) - 1,
              parseInt(caeFchVto.substring(6, 8))
            )
          } else {
            console.warn(`⚠️ [Issue] caeFchVto tiene formato inesperado: "${caeFchVto}" (longitud: ${caeFchVto.length})`)
            caeVtoDate = new Date() // Fallback a fecha actual
          }
        } catch (dateError) {
          console.error(`❌ [Issue] Error al parsear caeFchVto "${caeFchVto}":`, dateError)
          caeVtoDate = new Date() // Fallback a fecha actual
        }

        issuedDoc = await prisma.fiscalIssuedDocument.create({
          data: {
            env: envKey,
            cuit: cuitNormalized,
            ptoVta: ptoVtaConfig,
            cbteTipo,
            cbteNro,
            cae,
            caeVto: caeVtoDate,
            impTotal: body.importeTotal,
            estado,
            condicionIvaReceptorId: condicionIvaReceptorIdUsed,
            idempotencyKey,
            wsfeResponse: result as any
          }
        })

        console.log(`✅ [Issue] Comprobante emitido y guardado: CAE=${cae}, CbteNro=${cbteNro}`)
      } else {
        // Aún así guardar si fue rechazado (para auditoría)
        // IMPORTANTE: No reservar numeración si fue rechazado (cbteNro puede ser 0 o inválido)
        // Solo guardar si realmente hay un cbteNro válido
        if (cbteNro && cbteNro > 0) {
          issuedDoc = await prisma.fiscalIssuedDocument.create({
            data: {
              env: envKey,
              cuit: cuitNormalized,
              ptoVta: ptoVtaConfig,
              cbteTipo,
              cbteNro,
              cae: cae || '',
              caeVto: caeFchVto ? (() => {
                try {
                  if (caeFchVto.length >= 8) {
                    return new Date(
                      parseInt(caeFchVto.substring(0, 4)),
                      parseInt(caeFchVto.substring(4, 6)) - 1,
                      parseInt(caeFchVto.substring(6, 8))
                    )
                  } else {
                    console.warn(`⚠️ [Issue] caeFchVto tiene formato inesperado: "${caeFchVto}"`)
                    return new Date()
                  }
                } catch (dateError) {
                  console.error(`❌ [Issue] Error al parsear caeFchVto "${caeFchVto}":`, dateError)
                  return new Date()
                }
              })() : new Date(),
              impTotal: body.importeTotal,
              estado,
              condicionIvaReceptorId: condicionIvaReceptorIdUsed,
              idempotencyKey,
              wsfeResponse: result as any
            }
          })
        }
        
        // Loguear claramente el CondicionIVAReceptorId usado si hay rechazo por Obs 10246
        const obs10246 = result.errors?.find((e: any) => e.code === 10246) || 
                         detResponse?.Observaciones?.find((o: any) => o.Code === 10246)
        if (obs10246) {
          console.error(`❌ [Issue] Rechazo Obs 10246 (Condicion IVA receptor obligatorio)`)
          console.error(`   CondicionIVAReceptorId usado: ${condicionIvaReceptorIdUsed}`)
          console.error(`   Mensaje: ${obs10246.msg || obs10246.Msg}`)
        }
        
        console.warn(`⚠️ [Issue] Comprobante rechazado: ${result.errors?.map(e => `${e.code}: ${e.msg}`).join(', ')}`)
      }

      return {
        success: estado === 'APPROVED',
        estado,
        document: issuedDoc ? {
          id: issuedDoc.id,
          ptoVta: issuedDoc.ptoVta,
          cbteTipo: issuedDoc.cbteTipo,
          cbteNro: issuedDoc.cbteNro,
          cae: issuedDoc.cae,
          caeVto: issuedDoc.caeVto.toISOString(),
          impTotal: issuedDoc.impTotal.toString(),
          condicionIvaReceptorId: issuedDoc.condicionIvaReceptorId,
          createdAt: issuedDoc.createdAt.toISOString()
        } : null,
        condicionIvaReceptorIdUsed: condicionIvaReceptorIdUsed,
        wsfeResponse: {
          resultado,
          cae,
          caeFchVto,
          errors: result.errors || [],
          events: result.events || [],
          observaciones: detResponse?.Observaciones || []
        },
        idempotencyKey
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ [Issue] Error:', errorMessage)
      if (error instanceof Error && error.stack) {
        console.error('📚 [Issue] Stack:', error.stack)
      }
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  /**
   * Endpoint para consultar último comprobante emitido
   */
  app.get('/wsfe/issued/last', {
    preHandler: [authenticate],
    schema: {
      description: 'Consultar último comprobante emitido',
      tags: ['Fiscal', 'Issue'],
      querystring: {
        type: 'object',
        properties: {
          ptoVta: { type: 'number' },
          cbteTipo: { type: 'number', default: 11 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const { ptoVta, cbteTipo = 11 } = request.query as {
        ptoVta?: number
        cbteTipo?: number
      }

      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = (await FiscalConfigService.getCuitRepresentado()) || env.AFIP_CUIT!
      const ptoVtaToQuery = ptoVta || await FiscalConfigService.getPtoVta()

      if (!ptoVtaToQuery) {
        return reply.status(400).send({
          error: true,
          message: 'No hay punto de venta configurado o especificado'
        })
      }

      // Buscar en DB
      const lastIssued = await prisma.fiscalIssuedDocument.findFirst({
        where: {
          env: envKey,
          cuit: cuitNormalized,
          ptoVta: ptoVtaToQuery,
          cbteTipo: Number(cbteTipo),
          estado: 'APPROVED'
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Opcional: Verificar con FECompUltimoAutorizado
      let ultimoAutorizado: any = null
      try {
        const wsfeClient = new ArcaWsfeClient()
        const ultimoResult = await wsfeClient.getUltimoAutorizado(ptoVtaToQuery, Number(cbteTipo))
        if (ultimoResult.success && ultimoResult.data) {
          ultimoAutorizado = {
            cbteNro: ultimoResult.data.CbteNro,
            ptoVta: ultimoResult.data.PtoVta,
            cbteTipo: ultimoResult.data.CbteTipo
          }
        }
      } catch (error) {
        console.warn('⚠️ [Last Issued] No se pudo obtener último autorizado desde WSFE:', error)
      }

      return {
        success: true,
        fromDB: lastIssued ? {
          id: lastIssued.id,
          ptoVta: lastIssued.ptoVta,
          cbteTipo: lastIssued.cbteTipo,
          cbteNro: lastIssued.cbteNro,
          cae: lastIssued.cae,
          caeVto: lastIssued.caeVto.toISOString(),
          impTotal: lastIssued.impTotal.toString(),
          estado: lastIssued.estado,
          createdAt: lastIssued.createdAt.toISOString()
        } : null,
        fromWSFE: ultimoAutorizado,
        note: ultimoAutorizado && lastIssued && ultimoAutorizado.cbteNro !== lastIssued.cbteNro
          ? '⚠️ Hay diferencia entre DB y WSFE. Puede haber comprobantes emitidos desde otro sistema.'
          : null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para preparar DTO de emisión (sin ejecutar)
  app.post('/wsfe/prepare-issue', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const body = request.body as {
        ptoVta?: number
        cbteTipo?: number
        importeTotal: number
        importeNeto?: number
        importeIva?: number
        fechaEmision?: string
      }

      if (!body.importeTotal) {
        return reply.status(400).send({
          error: true,
          message: 'Se requiere importeTotal'
        })
      }

      const { FiscalIssueValidator } = await import('../services/arca/FiscalIssueValidator.js')
      const validator = new FiscalIssueValidator()

      // Validar primero
      const canIssue = await validator.canIssue(body.cbteTipo || 11)
      if (!canIssue.canIssue) {
        return reply.status(400).send({
          error: true,
          message: canIssue.reason || 'No se puede emitir el comprobante',
          canIssue
        })
      }

      // Obtener ptoVta si no se especificó
      const ptoVta = body.ptoVta || canIssue.ptoVta!
      if (!ptoVta) {
        return reply.status(400).send({
          error: true,
          message: 'No hay punto de venta disponible'
        })
      }

      // Preparar DTO
      const fechaEmision = body.fechaEmision ? new Date(body.fechaEmision) : undefined
      const dto = await validator.prepareFECAESolicitarDTO({
        ptoVta,
        cbteTipo: body.cbteTipo,
        importeTotal: body.importeTotal,
        importeNeto: body.importeNeto,
        importeIva: body.importeIva,
        fechaEmision
      })

      return {
        success: true,
        dto,
        canIssue,
        note: 'Este DTO está listo para enviar a FECAESolicitar cuando el PV esté READY'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // ==================== CONFIGURACIÓN FISCAL ====================

  // Endpoint para configurar punto de venta (sin tocar .env)
  app.put('/config/pto-vta', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const body = request.body as { ptoVta?: string | number }
      if (!body.ptoVta) {
        return reply.status(400).send({
          error: true,
          message: 'ptoVta es requerido en el body'
        })
      }

      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = env.AFIP_CUIT!
      const userId = (request.user as any)?.id || null

      // Obtener valor anterior
      const oldPtoVta = await FiscalConfigService.getPtoVta()

      // Normalizar y persistir
      const newPtoVta = await FiscalConfigService.setPtoVta(
        body.ptoVta,
        envKey,
        cuitNormalized,
        userId || undefined
      )

      // Resetear tracking de PV si cambió
      if (oldPtoVta !== newPtoVta) {
        await FiscalConfigService.resetPtoVtaTracking(envKey, cuitNormalized)
      }

      return {
        success: true,
        message: 'Punto de venta actualizado correctamente',
        ptoVta: newPtoVta,
        previousPtoVta: oldPtoVta,
        note: 'El cambio se aplicó inmediatamente. No es necesario reiniciar el servidor.'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error al configurar ptoVta:', errorMessage)
      
      return reply.status(400).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para configurar CUIT representado (delegación WSASS)
  app.put('/config/cuit-representado', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const body = request.body as { cuit?: string }
      if (!body.cuit) {
        return reply.status(400).send({
          error: true,
          message: 'cuit es requerido en el body (11 dígitos, puede tener guiones)'
        })
      }

      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = env.AFIP_CUIT!
      const userId = (request.user as any)?.id || null

      // Obtener valor anterior
      const oldCuitRep = await FiscalConfigService.getCuitRepresentado()

      // Normalizar y persistir
      const newCuitRep = await FiscalConfigService.setCuitRepresentado(
        body.cuit,
        envKey,
        cuitNormalized,
        userId || undefined
      )

      return {
        success: true,
        message: 'CUIT representado actualizado correctamente',
        cuitRepresentado: newCuitRep,
        previousCuitRepresentado: oldCuitRep,
        cuitCertificado: cuitNormalized,
        note: 'El cambio se aplicó inmediatamente. El tracking de PV se reinició. Las próximas llamadas a WSFE usarán este CUIT en Auth (delegación WSASS).'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error al configurar cuitRepresentado:', errorMessage)
      
      return reply.status(400).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint de prueba de autenticación (para debugging)
  app.get('/test/auth', {
    preHandler: [authenticate]
  }, async (request) => {
    const user = request.user
    return {
      success: true,
      message: 'Autenticación exitosa',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      note: 'Si ves este mensaje, tu token JWT es válido'
    }
  })

  // Endpoint para obtener configuración fiscal actual
  app.get('/config', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = env.AFIP_CUIT!

      const ptoVta = await FiscalConfigService.getPtoVta()
      const cuitRepresentado = await FiscalConfigService.getCuitRepresentado()

      return {
        success: true,
        config: {
          env: envKey,
          cuitCertificado: cuitNormalized,
          cuitRepresentado: cuitRepresentado || null,
          cuitUsedInAuth: cuitRepresentado || cuitNormalized,
          ptoVta: ptoVta || null,
          note: cuitRepresentado 
            ? 'Usando CUIT representado (delegación WSASS) en Auth de WSFE'
            : 'Usando CUIT del certificado en Auth de WSFE'
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // Endpoint para forzar verificación inmediata de PV
  app.post('/test/wsfe/ptos-venta/poll-now', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const envKey = env.AFIP_ENV || 'homo'
      const cuitNormalized = env.AFIP_CUIT!

      const wsfeClient = new ArcaWsfeClient()
      const result = await wsfeClient.getPtosVenta()

      // Extraer datos de puntos de venta
      const ptosVentaData = result.data
      let ptosVenta: any[] = []
      
      if (ptosVentaData?.PtoVta) {
        ptosVenta = Array.isArray(ptosVentaData.PtoVta) ? ptosVentaData.PtoVta : [ptosVentaData.PtoVta]
      } else if (ptosVentaData?.ResultGet?.PtoVta) {
        ptosVenta = Array.isArray(ptosVentaData.ResultGet.PtoVta) 
          ? ptosVentaData.ResultGet.PtoVta 
          : [ptosVentaData.ResultGet.PtoVta]
      }

      // Detectar error 602 u otros errores
      const error602 = result.errors?.find((e: any) => e.code === 602)
      const firstError = result.errors?.[0]

      // Determinar estado
      let newStatus: 'PENDING' | 'READY' | 'ERROR' = 'READY'
      let firstSeenAt: Date | null = null

      const statusRecord = await prisma.fiscalPtoVtaStatus.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        }
      })

      const wasPending = statusRecord?.status === 'PENDING'

      if (error602) {
        newStatus = 'PENDING'
      } else if (!result.success && firstError) {
        newStatus = 'ERROR'
      } else if (ptosVenta.length === 0) {
        newStatus = 'PENDING'
      }

      // Si pasó de PENDING a READY, registrar firstSeenAt
      if (newStatus === 'READY' && wasPending) {
        firstSeenAt = new Date()
      } else if (statusRecord?.firstSeenAt) {
        firstSeenAt = statusRecord.firstSeenAt
      }

      // Actualizar estado en DB
      const attemptCount = (statusRecord?.attemptCount || 0) + 1

      await prisma.fiscalPtoVtaStatus.upsert({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        },
        create: {
          env: envKey,
          cuit: cuitNormalized,
          status: newStatus,
          lastErrorCode: error602?.code || firstError?.code || null,
          lastErrorMsg: error602?.msg || firstError?.msg || null,
          ptosVentaList: ptosVenta.length > 0 ? ptosVenta as any : null,
          firstSeenAt,
          attemptCount,
          lastCheckedAt: new Date()
        },
        update: {
          status: newStatus,
          lastErrorCode: error602?.code || firstError?.code || null,
          lastErrorMsg: error602?.msg || firstError?.msg || null,
          ptosVentaList: ptosVenta.length > 0 ? ptosVenta as any : null,
          firstSeenAt: firstSeenAt || undefined,
          attemptCount,
          lastCheckedAt: new Date()
        }
      })

      const ptoVtaConfig = await FiscalConfigService.getPtoVta()

      return {
        success: true,
        pvStatus: newStatus,
        ptosVenta: ptosVenta.length > 0 ? ptosVenta.map((pv: any) => ({
          numero: pv.Nro,
          emisionTipo: pv.EmisionTipo,
          bloqueado: pv.Bloqueado
        })) : [],
        configuredPtoVta: ptoVtaConfig,
        attemptCount,
        firstSeenAt: firstSeenAt?.toISOString() || null,
        errors: result.errors || [],
        note: newStatus === 'PENDING' && error602
          ? 'FEParamGetPtosVenta NO recibe ptoVta; devuelve TODOS los PV habilitados para WSFE. Si devuelve 602, la lista está vacía desde WSFE.'
          : null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error en poll-now:', errorMessage)
      
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })

  // ==================== DEBUG Y EVIDENCIA PARA SOPORTE ====================

  // ============================================
  // ENDPOINTS DE DIAGNÓSTICO AVANZADO
  // ============================================

  /**
   * Exportar SOAP request sanitizado para probar externamente (SoapUI, Postman)
   * Útil para confirmar si el problema es de código o de estado ARCA/WSFE
   */
  app.get('/debug/wsfe/soap', {
    preHandler: [authenticate],
    schema: {
      description: 'Exportar SOAP request sanitizado para probar externamente',
      tags: ['Fiscal', 'Debug'],
      querystring: {
        type: 'object',
        properties: {
          method: { 
            type: 'string', 
            enum: ['FEParamGetPtosVenta', 'FEParamGetTiposCbte', 'FECompUltimoAutorizado'],
            description: 'Método WSFE a exportar'
          },
          ptoVta: { 
            type: 'number', 
            description: 'Punto de venta (solo para FECompUltimoAutorizado)' 
          },
          cbteTipo: { 
            type: 'number', 
            description: 'Tipo de comprobante (solo para FECompUltimoAutorizado)' 
          }
        },
        required: ['method']
      }
    }
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(503).send({ error: true, message: 'Facturación electrónica no configurada' })
      }

      const { method, ptoVta, cbteTipo } = request.query as {
        method: string
        ptoVta?: number
        cbteTipo?: number
      }

      if (!method) {
        return reply.status(400).send({ error: true, message: 'Parámetro "method" requerido' })
      }

      const wsfeClient = new ArcaWsfeClient()
      
      // Construir params según el método
      let params: Record<string, any> = {}
      if (method === 'FECompUltimoAutorizado') {
        if (!ptoVta || !cbteTipo) {
          return reply.status(400).send({ 
            error: true, 
            message: 'Para FECompUltimoAutorizado se requieren ptoVta y cbteTipo' 
          })
        }
        params = { PtoVta: ptoVta, CbteTipo: cbteTipo }
      }

      const soapExport = await wsfeClient.generateSoapRequest(method, params)

      // Extraer fragmento del método para mostrar claramente la estructura
      const methodMatch = soapExport.soapRequestSanitized.match(
        new RegExp(`<ar:${method}[^>]*>([\\s\\S]*?)</ar:${method}>`)
      )
      const methodFragmentSanitized = methodMatch ? methodMatch[1].trim() : null

      return {
        success: true,
        method,
        environment: env.AFIP_ENV || 'homo',
        cuitUsedInAuth: soapExport.cuitUsedInAuth,
        instructions: {
          soapui: 'Copia el soapRequestSanitized y pégalo en SoapUI. Reemplaza *** con tu Token/Sign real.',
          postman: 'Usa el soapRequestSanitized como body, agrega los headers indicados, y reemplaza *** con Token/Sign real.',
          note: method === 'FECompUltimoAutorizado'
            ? 'Verifica que el fragmento del método incluya <ar:Auth>, <ar:PtoVta> y <ar:CbteTipo> como hermanos.'
            : 'Si SoapUI devuelve el mismo error 602, el código está correcto y el problema es estado ARCA/WSFE.'
        },
        soapRequest: {
          sanitized: soapExport.soapRequestSanitized,
          methodFragmentSanitized: methodFragmentSanitized,
          note: 'El SOAP completo (con Token/Sign real) está disponible en logs del backend'
        },
        headers: soapExport.headers,
        url: soapExport.url,
        httpMethod: soapExport.method
      }
    } catch (error) {
      console.error('❌ [Debug] Error al generar SOAP request:', error)
      return reply.status(500).send({
        error: true,
        message: 'Error al generar SOAP request',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  })

  /**
   * Ejecutar FEParamGetPtosVenta en ambiente específico (homo/prod)
   * Útil para comparar resultados entre ambientes y confirmar si es problema de replicación
   */
  app.get('/debug/wsfe/ptos-venta', {
    preHandler: [authenticate],
    schema: {
      description: 'Ejecutar FEParamGetPtosVenta en ambiente específico',
      tags: ['Fiscal', 'Debug'],
      querystring: {
        type: 'object',
        properties: {
          env: { 
            type: 'string', 
            enum: ['homo', 'prod'],
            description: 'Ambiente a usar (homo o prod)'
          }
        },
        required: ['env']
      }
    }
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(503).send({ error: true, message: 'Facturación electrónica no configurada' })
      }

      const { env: environment } = request.query as { env: 'homo' | 'prod' }

      if (!environment || !['homo', 'prod'].includes(environment)) {
        return reply.status(400).send({ 
          error: true, 
          message: 'Parámetro "env" debe ser "homo" o "prod"' 
        })
      }

      // Verificar que el ambiente solicitado coincida con el configurado (para evitar confusiones)
      const currentEnv = env.AFIP_ENV || 'homo'
      if (environment !== currentEnv) {
        console.warn(`⚠️ [Debug] Solicitando ambiente ${environment} pero el sistema está configurado para ${currentEnv}`)
      }

      const wsfeClient = new ArcaWsfeClient()
      const result = await wsfeClient.getPtosVentaInEnvironment(environment)

      const ptosVenta = result.data?.PtoVta || []
      const ptosVentaArray = Array.isArray(ptosVenta) ? ptosVenta : [ptosVenta].filter(Boolean)

      return {
        success: result.success,
        environment: result.environment,
        url: result.url,
        cuitUsedInAuth: await FiscalConfigService.getCuitRepresentado().then(c => c || env.AFIP_CUIT),
        result: {
          ptosVenta: ptosVentaArray,
          count: ptosVentaArray.length,
          errors: result.errors,
          events: result.events
        },
        diagnostic: {
          hasErrors: result.errors.length > 0,
          error602: result.errors.some(e => e.code === 602),
          interpretation: result.errors.length > 0
            ? result.errors.some(e => e.code === 602)
              ? 'Error 602: WSFE no tiene PVs habilitados para este CUIT en este ambiente'
              : `Error ${result.errors[0]?.code}: ${result.errors[0]?.msg}`
            : ptosVentaArray.length > 0
              ? `✅ WSFE devuelve ${ptosVentaArray.length} punto(s) de venta`
              : '⚠️ WSFE no devolvió errores pero tampoco PVs (respuesta vacía)',
          recommendation: result.errors.some(e => e.code === 602)
            ? 'Si prod lista PVs y homo no => problema de replicación/ambiente. Si ninguno lista => problema administrativo del CUIT/servicio.'
            : undefined
        }
      }
    } catch (error) {
      console.error('❌ [Debug] Error al ejecutar FEParamGetPtosVenta:', error)
      return reply.status(500).send({
        error: true,
        message: 'Error al ejecutar FEParamGetPtosVenta',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  })

  /**
   * Probar FECompUltimoAutorizado en ambiente específico
   * Útil para verificar si WSFE "conoce" un PV aunque GetPtosVenta no lo liste
   */
  app.get('/debug/wsfe/ultimo-autorizado', {
    preHandler: [authenticate],
    schema: {
      description: 'Probar FECompUltimoAutorizado en ambiente específico',
      tags: ['Fiscal', 'Debug'],
      querystring: {
        type: 'object',
        properties: {
          ptoVta: { 
            type: 'number', 
            description: 'Punto de venta a consultar' 
          },
          cbteTipo: { 
            type: 'number', 
            default: 11,
            description: 'Tipo de comprobante (default: 11 = Factura C)' 
          },
          env: { 
            type: 'string', 
            enum: ['homo', 'prod'],
            description: 'Ambiente a usar (homo o prod)'
          }
        },
        required: ['ptoVta', 'env']
      }
    }
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(503).send({ error: true, message: 'Facturación electrónica no configurada' })
      }

      const { ptoVta, cbteTipo = 11, env: environment } = request.query as {
        ptoVta: number
        cbteTipo?: number
        env: 'homo' | 'prod'
      }

      if (!ptoVta || !environment || !['homo', 'prod'].includes(environment)) {
        return reply.status(400).send({ 
          error: true, 
          message: 'Parámetros requeridos: ptoVta (number) y env ("homo" | "prod")' 
        })
      }

      const wsfeClient = new ArcaWsfeClient()
      const result = await wsfeClient.getUltimoAutorizadoInEnvironment(
        Number(ptoVta),
        Number(cbteTipo),
        environment
      )

      return {
        success: result.success,
        environment: result.environment,
        url: result.url,
        cuitUsedInAuth: await FiscalConfigService.getCuitRepresentado().then(c => c || env.AFIP_CUIT),
        ptoVta: Number(ptoVta),
        cbteTipo: Number(cbteTipo),
        result: {
          data: result.data,
          errors: result.errors,
          events: result.events
        },
        diagnostic: {
          hasErrors: result.errors.length > 0,
          hasData: !!result.data,
          interpretation: result.errors.length > 0
            ? `Error ${result.errors[0]?.code}: ${result.errors[0]?.msg}`
            : result.data
              ? `✅ WSFE conoce el PV ${ptoVta} y devuelve último autorizado: ${result.data.CbteNro}`
              : '⚠️ WSFE no devolvió errores pero tampoco datos',
          recommendation: result.errors.length > 0
            ? result.errors.some(e => e.code === 602 || e.msg?.toLowerCase().includes('inexistente'))
              ? 'WSFE no conoce este PV. Si GetPtosVenta tampoco lo lista, el PV no está habilitado para WSFE.'
              : 'Revisar el error específico devuelto por WSFE.'
            : result.data
              ? '✅ WSFE conoce el PV aunque GetPtosVenta no lo liste. Esto sugiere un problema específico del método GetPtosVenta o estado inconsistente.'
              : undefined
        }
      }
    } catch (error) {
      console.error('❌ [Debug] Error al ejecutar FECompUltimoAutorizado:', error)
      return reply.status(500).send({
        error: true,
        message: 'Error al ejecutar FECompUltimoAutorizado',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  })

  /**
   * Ejecutar FEParamGetTiposCbte en ambiente específico
   * Útil para verificar qué tipos de comprobante están habilitados
   */
  app.get('/debug/wsfe/tipos-cbte', {
    preHandler: [authenticate],
    schema: {
      description: 'Ejecutar FEParamGetTiposCbte en ambiente específico',
      tags: ['Fiscal', 'Debug'],
      querystring: {
        type: 'object',
        properties: {
          env: { 
            type: 'string', 
            enum: ['homo', 'prod'],
            description: 'Ambiente a usar (homo o prod)'
          }
        },
        required: ['env']
      }
    }
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(503).send({ error: true, message: 'Facturación electrónica no configurada' })
      }

      const { env: environment } = request.query as { env: 'homo' | 'prod' }

      if (!environment || !['homo', 'prod'].includes(environment)) {
        return reply.status(400).send({ 
          error: true, 
          message: 'Parámetro "env" debe ser "homo" o "prod"' 
        })
      }

      const wsfeClient = new ArcaWsfeClient()
      
      // Crear cliente temporal para el ambiente específico
      const originalUrl = (wsfeClient as any).wsfeUrl
      ;(wsfeClient as any).wsfeUrl = environment === 'homo' 
        ? 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
        : 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      
      try {
        const result = await wsfeClient.getTiposCbte()
        
        const tiposCbte = result.data?.CbteTipo || []
        const tiposCbteArray = Array.isArray(tiposCbte) ? tiposCbte : [tiposCbte].filter(Boolean)

        return {
          success: result.success,
          environment,
          url: (wsfeClient as any).wsfeUrl,
          cuitUsedInAuth: await FiscalConfigService.getCuitRepresentado().then(c => c || env.AFIP_CUIT),
          result: {
            tiposCbte: tiposCbteArray,
            count: tiposCbteArray.length,
            errors: result.errors,
            events: result.events
          },
          diagnostic: {
            hasErrors: result.errors.length > 0,
            hasData: tiposCbteArray.length > 0,
            cbteTipo11Available: tiposCbteArray.some((t: any) => t.Id === 11),
            interpretation: result.errors.length > 0
              ? `Error ${result.errors[0]?.code}: ${result.errors[0]?.msg}`
              : tiposCbteArray.length > 0
                ? `✅ WSFE devuelve ${tiposCbteArray.length} tipo(s) de comprobante habilitado(s)`
                : '⚠️ WSFE no devolvió errores pero tampoco tipos de comprobante (respuesta vacía)',
            recommendation: tiposCbteArray.length > 0 && !tiposCbteArray.some((t: any) => t.Id === 11)
              ? 'El tipo de comprobante 11 (Factura C) no está habilitado para este CUIT. Verificar en ARCA.'
              : tiposCbteArray.some((t: any) => t.Id === 11)
                ? '✅ El tipo de comprobante 11 (Factura C) está habilitado. Puedes usarlo en FECompUltimoAutorizado.'
                : undefined
          }
        }
      } finally {
        // Restaurar URL original
        ;(wsfeClient as any).wsfeUrl = originalUrl
      }
    } catch (error) {
      console.error('❌ [Debug] Error al ejecutar FEParamGetTiposCbte:', error)
      return reply.status(500).send({
        error: true,
        message: 'Error al ejecutar FEParamGetTiposCbte',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  })

  // Endpoint para exportar evidencia técnica para soporte ARCA
  app.get('/debug/export-wsfe-evidence', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      if (!isFiscalEnabled()) {
        return reply.status(400).send({
          error: true,
          message: 'Facturación electrónica no está configurada'
        })
      }

      const envKey = env.AFIP_ENV || 'homo'
      const cuitCertificado = env.AFIP_CUIT!
      const cuitRepresentado = await FiscalConfigService.getCuitRepresentado()
      const cuitUsedInAuth = cuitRepresentado || cuitCertificado

      // Obtener estado actual (usando el CUIT que se usa en Auth)
      const statusRecord = await prisma.fiscalPtoVtaStatus.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitUsedInAuth
          }
        }
      })

      // Obtener configuración
      const ptoVtaConfig = await FiscalConfigService.getPtoVta()

      // Obtener TA info (sin exponer token/sign completos)
      const tokenManager = ArcaTokenManager.getInstance()
      const cacheInfo = tokenManager.getCacheInfo()
      const hasValidCache = tokenManager.hasValidCache()

      // Buscar archivos de logs recientes (últimos 10)
      const fs = await import('fs')
      const path = await import('path')
      const logsDir = path.join(process.cwd(), 'backend', 'logs')
      let logFiles: string[] = []

      try {
        if (fs.existsSync(logsDir)) {
          const files = fs.readdirSync(logsDir)
          const wsfeFiles = files
            .filter(f => f.includes('wsfe-FEParamGetPtosVenta'))
            .sort()
            .reverse()
            .slice(0, 10)
          logFiles = wsfeFiles.map(f => path.join(logsDir, f))
        }
      } catch (logError) {
        console.warn('⚠️ No se pudieron leer archivos de log:', logError)
      }

      // Calcular métricas
      const totalPendingMinutes = statusRecord?.firstPendingAt 
        ? Math.floor((Date.now() - statusRecord.firstPendingAt.getTime()) / 60000)
        : null
      const pendingHours = totalPendingMinutes ? Math.floor(totalPendingMinutes / 60) : null

      // Construir evidencia
      const evidence = {
        timestamp: new Date().toISOString(),
        environment: {
          env: envKey,
          cuitCertificado: env.AFIP_CUIT?.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3'),
          cuitNormalized: cuitCertificado,
          cuitRepresentado: cuitRepresentado ? cuitRepresentado.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3') : null,
          cuitUsedInAuth: cuitUsedInAuth.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3'),
          configuredPtoVta: ptoVtaConfig
        },
        wsaa: {
          hasValidCache,
          cacheInfo: cacheInfo ? {
            expirationTime: new Date(cacheInfo.expirationTime).toISOString(),
            obtainedAt: new Date(cacheInfo.obtainedAt).toISOString(),
            expiresInMinutes: Math.floor((cacheInfo.expirationTime - Date.now()) / 60000),
            tokenLength: cacheInfo.token.length,
            signLength: cacheInfo.sign.length
          } : null,
          note: 'Token y Sign no se exponen completos por seguridad'
        },
        pvStatus: {
          status: statusRecord?.status || 'UNKNOWN',
          attemptCount: statusRecord?.attemptCount || 0,
          lastErrorCode: statusRecord?.lastErrorCode,
          lastErrorMsg: statusRecord?.lastErrorMsg,
          firstPendingAt: statusRecord?.firstPendingAt?.toISOString() || null,
          lastPendingAt: statusRecord?.lastPendingAt?.toISOString() || null,
          totalPendingMinutes,
          pendingHours,
          firstSeenAt: statusRecord?.firstSeenAt?.toISOString() || null,
          lastCheckedAt: statusRecord?.lastCheckedAt?.toISOString() || null,
          ptosVentaCount: statusRecord?.ptosVentaList 
            ? (Array.isArray(statusRecord.ptosVentaList) ? statusRecord.ptosVentaList.length : 1)
            : 0
        },
        technicalDetails: {
          wsfeEndpoint: envKey === 'homo' 
            ? 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
            : 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
          wsaaEndpoint: envKey === 'homo'
            ? 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms'
            : 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
          service: 'wsfe',
          note: 'FEParamGetPtosVenta NO recibe ptoVta; devuelve TODOS los PV habilitados para WSFE'
        },
        diagnosis: {
          wsaaAuthOk: hasValidCache,
          wsfeAuthOk: statusRecord?.status !== 'ERROR' || (statusRecord?.lastErrorCode !== 602 && statusRecord?.lastErrorCode !== 11002),
          pvAvailable: statusRecord?.status === 'READY',
          persistentError: statusRecord?.status === 'PENDING' && statusRecord.attemptCount > 48,
          conclusion: statusRecord?.status === 'PENDING' && statusRecord.lastErrorCode === 602
            ? 'WSFE responde 200 pero siempre con Err 602 "Sin Resultados". Esto indica que WSFE no tiene puntos de venta habilitados para este CUIT desde la perspectiva del servicio.'
            : statusRecord?.status === 'READY'
            ? 'PV disponible y funcionando correctamente'
            : 'Estado desconocido o error no relacionado con 602'
        },
        logFiles: {
          count: logFiles.length,
          paths: logFiles,
          note: 'Los archivos de log contienen requests/responses SOAP completos. Revisar para diagnóstico detallado.'
        },
        recommendations: statusRecord?.status === 'PENDING' && statusRecord.attemptCount > 48
          ? [
              'Verificar en ARCA que el PV fue creado para el MISMO CUIT',
              'Verificar que el PV figura como "Activo" en ARCA',
              'Verificar que el sistema sea "Factura Electrónica - Monotributo - Web Services"',
              'Crear un PV nuevo desde "Administración de Puntos de Venta y Domicilios"',
              'Si persiste, contactar soporte ARCA con esta evidencia'
            ]
          : []
      }

      return {
        success: true,
        evidence,
        exportFormat: 'JSON',
        note: 'Esta evidencia puede ser adjuntada a un ticket de soporte ARCA/AFIP. Incluye información técnica relevante sin exponer datos sensibles completos.'
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error al exportar evidencia:', errorMessage)
      
      return reply.status(500).send({
        error: true,
        message: errorMessage
      })
    }
  })
}

