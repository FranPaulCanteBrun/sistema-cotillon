import { prisma } from '../../config/database.js'
import { env as envConfig } from '../../config/env.js'
import { normalizePtoVta } from '../../utils/fiscal.js'

/**
 * Servicio para gestionar configuración fiscal persistida en DB
 * Permite cambiar ptoVta sin reiniciar el servidor
 */
export class FiscalConfigService {
  private static cache: Map<string, number | null> = new Map()
  private static cacheTimestamp: Map<string, number> = new Map()
  private static readonly CACHE_TTL_MS = 60 * 1000 // 1 minuto

  /**
   * Obtener CUIT representado (usado en Auth de WSFE)
   * Prioridad: DB > .env
   * Si no está configurado, devuelve el CUIT del certificado
   * 
   * @param env - Entorno ('homo' o 'prod')
   * @param cuit - CUIT del certificado (para identificar el registro)
   * @returns CUIT representado (11 dígitos) o null si no está configurado (usar CUIT del certificado)
   */
  static async getCuitRepresentado(env?: string, cuit?: string): Promise<string | null> {
    const envKey = env || envConfig.AFIP_ENV || 'homo'
    const cuitNormalized = cuit || envConfig.AFIP_CUIT

    if (!cuitNormalized) {
      return null
    }

    const cacheKey = `cuitRep:${envKey}:${cuitNormalized}`
    const now = Date.now()
    const cached = this.cache.get(cacheKey)
    const cachedTime = this.cacheTimestamp.get(cacheKey) || 0

    // Usar cache si está válido (mismo TTL que ptoVta)
    if (cached !== undefined && (now - cachedTime) < this.CACHE_TTL_MS) {
      return cached as string | null
    }

    try {
      const config = await prisma.fiscalConfig.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        }
      })

      const cuitRep = config?.cuitRepresentado || null

      // Actualizar cache
      this.cache.set(cacheKey, cuitRep)
      this.cacheTimestamp.set(cacheKey, now)

      return cuitRep
    } catch (error) {
      console.error('❌ [FiscalConfig] Error al leer cuitRepresentado de DB, usando fallback:', error)
      return null
    }
  }

  /**
   * Establecer CUIT representado
   * 
   * @param cuitRepresentadoInput - CUIT representado (string, puede tener guiones)
   * @param env - Entorno ('homo' o 'prod')
   * @param cuit - CUIT del certificado
   * @param changedBy - Usuario que hizo el cambio (opcional)
   * @returns CUIT representado normalizado (11 dígitos)
   */
  static async setCuitRepresentado(
    cuitRepresentadoInput: string,
    env?: string,
    cuit?: string,
    changedBy?: string
  ): Promise<string> {
    const envKey = env || envConfig.AFIP_ENV || 'homo'
    const cuitNormalized = cuit || envConfig.AFIP_CUIT

    if (!cuitNormalized) {
      throw new Error('CUIT del certificado no configurado. No se puede persistir cuitRepresentado sin CUIT.')
    }

    // Normalizar CUIT (11 dígitos, sin guiones)
    const cuitRepNormalized = cuitRepresentadoInput.replace(/-/g, '').trim()
    
    if (!/^\d{11}$/.test(cuitRepNormalized)) {
      throw new Error(`CUIT representado inválido: "${cuitRepresentadoInput}". Debe ser 11 dígitos.`)
    }

    // Obtener valor anterior para audit
    const oldConfig = await prisma.fiscalConfig.findUnique({
      where: {
        env_cuit: {
          env: envKey,
          cuit: cuitNormalized
        }
      }
    })

    const oldValue = oldConfig?.cuitRepresentado || null

    // Persistir en DB
    await prisma.fiscalConfig.upsert({
      where: {
        env_cuit: {
          env: envKey,
          cuit: cuitNormalized
        }
      },
      create: {
        env: envKey,
        cuit: cuitNormalized,
        cuitRepresentado: cuitRepNormalized
      },
      update: {
        cuitRepresentado: cuitRepNormalized
      }
    })

    // Registrar en audit log si cambió
    if (oldValue !== cuitRepNormalized) {
      await prisma.fiscalConfigAudit.create({
        data: {
          env: envKey,
          cuit: cuitNormalized,
          fieldName: 'cuitRepresentado',
          oldValue: oldValue,
          newValue: cuitRepNormalized,
          changedBy: changedBy || null
        }
      })
    }

    // Invalidar cache
    const cacheKey = `cuitRep:${envKey}:${cuitNormalized}`
    this.cache.delete(cacheKey)
    this.cacheTimestamp.delete(cacheKey)

    // Resetear tracking de PV cuando cambia CUIT representado
    await this.resetPtoVtaTracking(envKey, cuitRepNormalized)

    console.log(`✅ [FiscalConfig] CuitRepresentado actualizado: ${oldValue || 'null'} -> ${cuitRepNormalized}`)

    return cuitRepNormalized
  }

  /**
   * Obtener punto de venta configurado
   * Prioridad: DB > .env
   * 
   * @param env - Entorno ('homo' o 'prod')
   * @param cuit - CUIT normalizado
   * @returns Punto de venta como número o null si no está configurado
   */
  static async getPtoVta(env?: string, cuit?: string): Promise<number | null> {
    const envKey = env || envConfig.AFIP_ENV || 'homo'
    const cuitNormalized = cuit || envConfig.AFIP_CUIT

    if (!cuitNormalized) {
      // Fallback a .env si no hay CUIT
      return envConfig.AFIP_PTO_VTA || null
    }

    const cacheKey = `${envKey}:${cuitNormalized}`
    const now = Date.now()
    const cached = this.cache.get(cacheKey)
    const cachedTime = this.cacheTimestamp.get(cacheKey) || 0

    // Usar cache si está válido
    if (cached !== undefined && (now - cachedTime) < this.CACHE_TTL_MS) {
      return cached
    }

    try {
      // Leer de DB
      const config = await prisma.fiscalConfig.findUnique({
        where: {
          env_cuit: {
            env: envKey,
            cuit: cuitNormalized
          }
        }
      })

      const ptoVta = config?.ptoVta || envConfig.AFIP_PTO_VTA || null

      // Actualizar cache
      this.cache.set(cacheKey, ptoVta)
      this.cacheTimestamp.set(cacheKey, now)

      return ptoVta
    } catch (error) {
      console.error('❌ [FiscalConfig] Error al leer configuración de DB, usando .env:', error)
      // Fallback a .env en caso de error
      return envConfig.AFIP_PTO_VTA || null
    }
  }

  /**
   * Establecer punto de venta
   * Normaliza el valor y persiste en DB con audit log
   * 
   * @param ptoVtaInput - Punto de venta (string o number, puede tener ceros a la izquierda)
   * @param env - Entorno ('homo' o 'prod')
   * @param cuit - CUIT normalizado
   * @param changedBy - Usuario que hizo el cambio (opcional)
   * @returns Punto de venta normalizado
   */
  static async setPtoVta(
    ptoVtaInput: string | number,
    env?: string,
    cuit?: string,
    changedBy?: string
  ): Promise<number> {
    const envKey = env || envConfig.AFIP_ENV || 'homo'
    const cuitNormalized = cuit || envConfig.AFIP_CUIT

    if (!cuitNormalized) {
      throw new Error('CUIT no configurado. No se puede persistir ptoVta sin CUIT.')
    }

    // Normalizar ptoVta
    const ptoVtaNormalized = normalizePtoVta(ptoVtaInput)

    // Obtener valor anterior para audit
    const oldConfig = await prisma.fiscalConfig.findUnique({
      where: {
        env_cuit: {
          env: envKey,
          cuit: cuitNormalized
        }
      }
    })

    const oldValue = oldConfig?.ptoVta?.toString() || null

    // Persistir en DB
    await prisma.fiscalConfig.upsert({
      where: {
        env_cuit: {
          env: envKey,
          cuit: cuitNormalized
        }
      },
      create: {
        env: envKey,
        cuit: cuitNormalized,
        ptoVta: ptoVtaNormalized
      },
      update: {
        ptoVta: ptoVtaNormalized
      }
    })

    // Registrar en audit log si cambió
    if (oldValue !== ptoVtaNormalized.toString()) {
      await prisma.fiscalConfigAudit.create({
        data: {
          env: envKey,
          cuit: cuitNormalized,
          fieldName: 'ptoVta',
          oldValue: oldValue,
          newValue: ptoVtaNormalized.toString(),
          changedBy: changedBy || null
        }
      })
    }

    // Invalidar cache
    const cacheKey = `${envKey}:${cuitNormalized}`
    this.cache.delete(cacheKey)
    this.cacheTimestamp.delete(cacheKey)

    console.log(`✅ [FiscalConfig] PtoVta actualizado: ${oldValue || 'null'} -> ${ptoVtaNormalized}`)

    return ptoVtaNormalized
  }

  /**
   * Invalidar cache (útil después de cambios externos)
   */
  static invalidateCache(env?: string, cuit?: string): void {
    if (env && cuit) {
      const cacheKey = `${env}:${cuit}`
      this.cache.delete(cacheKey)
      this.cacheTimestamp.delete(cacheKey)
    } else {
      // Invalidar todo
      this.cache.clear()
      this.cacheTimestamp.clear()
    }
  }

  /**
   * Resetear tracking de PV cuando cambia ptoVta
   * Reinicia attemptCount, firstSeenAt, y limpia errores
   */
  static async resetPtoVtaTracking(env?: string, cuit?: string): Promise<void> {
    const envKey = env || envConfig.AFIP_ENV || 'homo'
    const cuitNormalized = cuit || envConfig.AFIP_CUIT

    if (!cuitNormalized) {
      return
    }

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
        status: 'PENDING',
        attemptCount: 0,
        lastCheckedAt: new Date()
      },
      update: {
        status: 'PENDING',
        attemptCount: 0,
        firstSeenAt: null,
        lastErrorCode: null,
        lastErrorMsg: null,
        ptosVentaList: null,
        lastCheckedAt: new Date()
      }
    })

    console.log(`🔄 [FiscalConfig] Tracking de PV reiniciado para ${envKey}:${cuitNormalized}`)
  }
}
