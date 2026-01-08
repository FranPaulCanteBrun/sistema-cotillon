/**
 * FiscalPtoVtaPoller - Servicio de polling automático para detectar puntos de venta en WSFE
 * 
 * Este servicio:
 * - Usa FECompUltimoAutorizado como verificación operativa del PV configurado
 * - Llama cada 5 minutos mientras pvStatus=PENDING
 * - Se detiene automáticamente cuando detecta READY
 * - FEParamGetPtosVenta se ejecuta opcionalmente pero NO bloquea READY si falla con 602
 */

import { ArcaWsfeClient } from './ArcaWsfeClient.js'
import { FiscalConfigService } from './FiscalConfigService.js'
import { prisma } from '../../config/database.js'
import { env, isFiscalEnabled } from '../../config/env.js'

export class FiscalPtoVtaPoller {
  private static instance: FiscalPtoVtaPoller | null = null
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private readonly POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutos

  private constructor() {}

  static getInstance(): FiscalPtoVtaPoller {
    if (!FiscalPtoVtaPoller.instance) {
      FiscalPtoVtaPoller.instance = new FiscalPtoVtaPoller()
    }
    return FiscalPtoVtaPoller.instance
  }

  /**
   * Iniciar polling automático
   */
  async start(): Promise<void> {
    try {
      if (this.isRunning) {
        console.log('⚠️ [PV Poller] Ya está corriendo')
        return
      }

      if (!isFiscalEnabled()) {
        console.log('⚠️ [PV Poller] Facturación no configurada, no se inicia polling')
        return
      }

      const envKey = env.AFIP_ENV || 'homo'
      // Usar CUIT representado si está configurado, sino el del certificado
      const cuitRepresentado = await FiscalConfigService.getCuitRepresentado(envKey)
      const cuitNormalized = cuitRepresentado || env.AFIP_CUIT!

      if (!cuitNormalized) {
        console.log('⚠️ [PV Poller] CUIT no configurado, no se inicia polling')
        return
      }

      if (cuitRepresentado) {
        console.log(`🔑 [PV Poller] Usando CUIT representado: ${cuitRepresentado} (certificado: ${env.AFIP_CUIT})`)
      }

      // Verificar estado actual (usando el CUIT que se usa en Auth)
      const statusRecord = await prisma.fiscalPtoVtaStatus.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        }
      })

      // Si ya está READY, no iniciar polling
      if (statusRecord?.status === 'READY') {
        console.log('✅ [PV Poller] PV ya está READY, no se inicia polling')
        return
      }

      console.log('🚀 [PV Poller] Iniciando polling automático cada 5 minutos...')
      this.isRunning = true

      // Ejecutar inmediatamente la primera verificación (sin await para no bloquear)
      this.checkPtosVenta().catch((error) => {
        console.error('❌ [PV Poller] Error en primera verificación:', error instanceof Error ? error.message : 'Error desconocido')
      })

      // Programar verificaciones periódicas
      this.intervalId = setInterval(async () => {
        await this.checkPtosVenta()
      }, this.POLL_INTERVAL_MS)

      console.log('✅ [PV Poller] Polling iniciado correctamente')
    } catch (error) {
      console.error('❌ [PV Poller] Error al iniciar polling:', error instanceof Error ? error.message : 'Error desconocido')
      if (error instanceof Error && error.stack) {
        console.error('📚 [PV Poller] Stack:', error.stack)
      }
      this.isRunning = false
      throw error
    }
  }

  /**
   * Detener polling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('🛑 [PV Poller] Polling detenido')
  }

  /**
   * Verificar puntos de venta
   */
  private async checkPtosVenta(): Promise<void> {
    try {
      if (!isFiscalEnabled()) {
        this.stop()
        return
      }

      const envKey = env.AFIP_ENV || 'homo'
      // Usar CUIT representado si está configurado, sino el del certificado
      const cuitRepresentado = await FiscalConfigService.getCuitRepresentado(envKey)
      const cuitNormalized = cuitRepresentado || env.AFIP_CUIT!

      // Obtener estado actual (usando el CUIT que se usa en Auth)
      const statusRecord = await prisma.fiscalPtoVtaStatus.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        }
      })

      // Si ya está READY, detener polling
      if (statusRecord?.status === 'READY') {
        console.log('✅ [PV Poller] PV detectado como READY, deteniendo polling')
        this.stop()
        return
      }

      const attemptCount = (statusRecord?.attemptCount || 0) + 1
      console.log(`🔍 [PV Poller] Verificando PV (intento ${attemptCount})...`)

      // Obtener ptoVta configurado
      const configPtoVta = await FiscalConfigService.getPtoVta(envKey, cuitNormalized)
      if (!configPtoVta) {
        console.warn('⚠️ [PV Poller] No hay ptoVta configurado, no se puede verificar')
        return
      }

      const wsfeClient = new ArcaWsfeClient()
      
      // NUEVO CRITERIO: Usar FECompUltimoAutorizado como verificación operativa
      // Este método prueba que WSFE conoce el PV y el cbteTipo
      const cbteTipo = 11 // Factura C (ajustar si es necesario)
      console.log(`📞 [PV Poller] Calling WSFE FECompUltimoAutorizado(ptoVta=${configPtoVta}, cbteTipo=${cbteTipo})...`)
      
      let newStatus: 'PENDING' | 'READY' | 'ERROR' = 'PENDING'
      let firstSeenAt: Date | null = null
      let firstPendingAt: Date | null = null
      let lastPendingAt: Date | null = null
      let ultimoAutorizadoCbteNro: number | null = null
      let lastErrorCode: number | null = null
      let lastErrorMsg: string | null = null
      let ptosVenta: any[] = []
      
      const wasPending = statusRecord?.status === 'PENDING'
      const wasReady = statusRecord?.status === 'READY'

      try {
        const ultimoAutorizadoResult = await wsfeClient.getUltimoAutorizado(configPtoVta, cbteTipo)
        console.log(`✅ [PV Poller] FECompUltimoAutorizado response received. Success: ${ultimoAutorizadoResult.success}, Errors: ${ultimoAutorizadoResult.errors?.length || 0}`)

        // Determinar estado basado en FECompUltimoAutorizado
        const error11002 = ultimoAutorizadoResult.errors?.find((e: any) => e.code === 11002)
        const error11000 = ultimoAutorizadoResult.errors?.find((e: any) => e.code === 11000)
        const error11001 = ultimoAutorizadoResult.errors?.find((e: any) => e.code === 11001)
        const firstError = ultimoAutorizadoResult.errors?.[0]

        if (ultimoAutorizadoResult.success && ultimoAutorizadoResult.data) {
          // WSFE conoce el PV y devuelve datos (aunque CbteNro sea 0)
          newStatus = 'READY'
          ultimoAutorizadoCbteNro = ultimoAutorizadoResult.data.CbteNro || 0
          console.log(`✅ [PV Poller] PV ${configPtoVta} está READY. Último autorizado: ${ultimoAutorizadoCbteNro}`)
        } else if (error11002) {
          // Error 11002: PV no impactado/no habilitado
          newStatus = 'PENDING'
          lastErrorCode = 11002
          lastErrorMsg = error11002.msg || 'PV no impactado en WSFE'
          console.log(`⏳ [PV Poller] PV ${configPtoVta} no impactado (error 11002)`)
        } else if (error11000 || error11001) {
          // Errores de parámetros inválidos (no deberían pasar si el SOAP está correcto)
          newStatus = 'ERROR'
          lastErrorCode = firstError?.code || null
          lastErrorMsg = firstError?.msg || null
          console.warn(`⚠️ [PV Poller] Error de parámetros inválidos: ${firstError?.code} - ${firstError?.msg}`)
        } else if (firstError) {
          // Otro error
          newStatus = 'ERROR'
          lastErrorCode = firstError.code
          lastErrorMsg = firstError.msg
          console.warn(`⚠️ [PV Poller] Error en FECompUltimoAutorizado: ${firstError.code} - ${firstError.msg}`)
        } else {
          // Sin errores pero sin datos (caso raro)
          newStatus = 'PENDING'
          console.log(`⏳ [PV Poller] FECompUltimoAutorizado no devolvió errores ni datos`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
        console.error(`❌ [PV Poller] Error al llamar FECompUltimoAutorizado:`, errorMsg)
        newStatus = 'ERROR'
        lastErrorMsg = errorMsg
      }

      // OPCIONAL: Intentar FEParamGetPtosVenta para información adicional (no bloquea READY)
      try {
        console.log('📞 [PV Poller] Calling WSFE FEParamGetPtosVenta (opcional, no bloquea READY)...')
        const ptosVentaResult = await wsfeClient.getPtosVenta()
        const ptosVentaData = ptosVentaResult.data
        if (ptosVentaData?.PtoVta) {
          ptosVenta = Array.isArray(ptosVentaData.PtoVta) ? ptosVentaData.PtoVta : [ptosVentaData.PtoVta]
        } else if (ptosVentaData?.ResultGet?.PtoVta) {
          ptosVenta = Array.isArray(ptosVentaData.ResultGet.PtoVta) 
            ? ptosVentaData.ResultGet.PtoVta 
            : [ptosVentaData.ResultGet.PtoVta]
        }
        if (ptosVenta.length > 0) {
          console.log(`ℹ️ [PV Poller] FEParamGetPtosVenta devolvió ${ptosVenta.length} PV(s)`)
        } else {
          const error602 = ptosVentaResult.errors?.find((e: any) => e.code === 602)
          if (error602) {
            console.log(`ℹ️ [PV Poller] FEParamGetPtosVenta devolvió 602 (no bloquea READY si FECompUltimoAutorizado está OK)`)
          }
        }
      } catch (error) {
        // No es crítico, solo loguear
        console.warn(`⚠️ [PV Poller] Error al llamar FEParamGetPtosVenta (no crítico):`, error instanceof Error ? error.message : 'Error desconocido')
      }

      // Tracking de PENDING persistente
      if (newStatus === 'PENDING') {
        // Si pasó de READY/ERROR a PENDING, registrar firstPendingAt
        if (!wasPending) {
          firstPendingAt = new Date()
          console.log('⏳ [PV Poller] Estado cambiado a PENDING por primera vez')
        } else {
          // Si ya estaba PENDING, mantener firstPendingAt original
          firstPendingAt = statusRecord?.firstPendingAt || new Date()
        }
        lastPendingAt = new Date()
      } else if (newStatus === 'READY') {
        // Si pasó de PENDING a READY, limpiar timestamps de PENDING
        firstPendingAt = null
        lastPendingAt = null
        
        // Si pasó de PENDING a READY, registrar firstSeenAt
        if (wasPending) {
          firstSeenAt = new Date()
          const pendingDuration = statusRecord?.firstPendingAt 
            ? Math.floor((Date.now() - statusRecord.firstPendingAt.getTime()) / 60000)
            : 0
          console.log(`🎉 [PV Poller] PV ${configPtoVta} detectado como READY (después de ${pendingDuration} minutos en PENDING)`)
          console.log(`   Último autorizado: ${ultimoAutorizadoCbteNro}, Método usado: FECompUltimoAutorizado`)
        } else if (statusRecord?.firstSeenAt) {
          firstSeenAt = statusRecord.firstSeenAt
        } else {
          firstSeenAt = new Date()
        }
      }

      // Calcular totalPendingMinutes si está en PENDING
      const totalPendingMinutes = firstPendingAt 
        ? Math.floor((Date.now() - firstPendingAt.getTime()) / 60000)
        : null

      // Actualizar evidencia: guardar metadata en lastErrorMsg si no hay error
      // Formato: JSON con checkMethod, ultimoAutorizadoCbteNro, etc.
      if (newStatus === 'READY' && !lastErrorMsg) {
        lastErrorMsg = JSON.stringify({
          checkMethod: 'FECompUltimoAutorizado',
          ultimoAutorizadoCbteNro: ultimoAutorizadoCbteNro,
          ptoVta: configPtoVta,
          cbteTipo: cbteTipo
        })
      }

      // Actualizar estado en DB (attemptCount ya está declarado arriba)
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
          lastErrorCode: lastErrorCode,
          lastErrorMsg: lastErrorMsg,
          ptosVentaList: ptosVenta.length > 0 ? ptosVenta as any : null,
          firstSeenAt,
          firstPendingAt,
          lastPendingAt,
          attemptCount: 1,
          lastCheckedAt: new Date()
        },
        update: {
          status: newStatus,
          lastErrorCode: lastErrorCode,
          lastErrorMsg: lastErrorMsg,
          ptosVentaList: ptosVenta.length > 0 ? ptosVenta as any : undefined,
          firstSeenAt: firstSeenAt || undefined,
          firstPendingAt: firstPendingAt || undefined,
          lastPendingAt: lastPendingAt || undefined,
          attemptCount,
          lastCheckedAt: new Date()
        }
      })

      // Log de advertencia si PENDING persistente (> 48 intentos = ~24 horas)
      if (newStatus === 'PENDING' && attemptCount > 48 && totalPendingMinutes) {
        const hours = Math.floor(totalPendingMinutes / 60)
        console.warn(`⚠️ [PV Poller] PENDING persistente: ${attemptCount} intentos, ${hours}h en PENDING`)
        console.warn(`   💡 [PV Poller] Recomendación: Crear PV nuevo desde "Administración de Puntos de Venta y Domicilios"`)
        console.warn(`   💡 [PV Poller] Si persiste, abrir ticket ARCA con evidencia técnica`)
      }

      // Si ahora está READY, detener polling
      if (newStatus === 'READY') {
        console.log('✅ [PV Poller] PV detectado como READY, deteniendo polling')
        this.stop()
      } else {
        console.log(`⏳ [PV Poller] Estado: ${newStatus} (intento ${attemptCount})`)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'
      const errorStack = error instanceof Error ? error.stack : undefined
      
      // Si es un error de TA pero hay cache válido, no debería pasar
      // Pero por si acaso, lo logueamos como warning y continuamos
      if (errorMsg.includes('WSAA_ALREADY_AUTHENTICATED') && errorMsg.includes('NO_CACHE')) {
        console.warn(`⚠️ [PV Poller] Error de TA desincronizado:`, errorMsg)
        console.warn('   💡 [PV Poller] Esto puede pasar si WSAA tiene TA pero local no. Esperando próxima verificación...')
        // No actualizar estado a ERROR, dejar como PENDING para reintentar
        return
      }
      
      console.error(`❌ [PV Poller] Error al verificar PV:`, errorMsg)
      if (errorStack && process.env.NODE_ENV === 'development') {
        console.error('📚 [PV Poller] Stack:', errorStack)
      }
      
      // Actualizar estado a ERROR solo si es un error real (no desincronización de TA)
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
      const attemptCount = (statusRecord?.attemptCount || 0) + 1
      
      await prisma.fiscalPtoVtaStatus.upsert({
        where: { env_cuit: { env: envKey, cuit: cuitNormalized } },
        create: {
          env: envKey,
          cuit: cuitNormalized,
          status: 'ERROR',
          lastErrorMsg: errorMsg,
          attemptCount,
          lastCheckedAt: new Date()
        },
        update: {
          status: 'ERROR',
          lastErrorMsg: errorMsg,
          attemptCount,
          lastCheckedAt: new Date()
        }
      })
    }
  }

  /**
   * Obtener estado del polling
   */
  getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.POLL_INTERVAL_MS
    }
  }
}
