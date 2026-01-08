/**
 * FiscalIssueValidator - Validaciones y preparación para emisión de comprobantes
 * 
 * Este servicio:
 * - Valida si se puede emitir un comprobante (canIssue)
 * - Obtiene la numeración siguiente
 * - Prepara el DTO para FECAESolicitar
 */

import { ArcaWsfeClient } from './ArcaWsfeClient.js'
import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { FiscalConfigService } from './FiscalConfigService.js'

export interface CanIssueResult {
  canIssue: boolean
  reason?: string
  pvStatus?: 'READY' | 'PENDING' | 'ERROR'
  cbteTipoAvailable?: boolean
  ptoVta?: number
}

export interface UltimoAutorizadoResult {
  ptoVta: number
  cbteTipo: number
  cbteNro: number
  nextCbteNro: number
}

export interface FECAESolicitarDTO {
  FeCAEReq: {
    FeCabReq: {
      CantReg: number // Cantidad de comprobantes (1 para factura simple)
      PtoVta: number
      CbteTipo: number // 11 = Factura C
    }
    FeDetReq: {
      FECAEDetRequest: {
        Concepto: number // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios
        DocTipo: number // 99 = Consumidor Final
        DocNro: number // 0 para Consumidor Final
        CondicionIVAReceptorId: number // Condición IVA del receptor (OBLIGATORIO desde 2025)
        CbteDesde: number // Número de comprobante desde
        CbteHasta: number // Número de comprobante hasta (igual a desde si es 1)
        CbteFch: string // Fecha en formato YYYYMMDD
        ImpTotal: number // Importe total
        ImpTotConc: number // Importe neto no gravado
        ImpNeto: number // Importe neto gravado
        ImpOpEx: number // Importe exento
        ImpIVA: number // Importe de IVA
        ImpTrib: number // Importe de tributos
        FchServDesde?: string // Fecha de inicio de servicio (opcional)
        FchServHasta?: string // Fecha de fin de servicio (opcional)
        FchVtoPago?: string // Fecha de vencimiento de pago (opcional)
        MonId: string // Moneda: 'PES' = Pesos
        MonCotiz: number // Cotización de la moneda (1 para pesos)
      }
    }
  }
}

export class FiscalIssueValidator {
  private wsfeClient: ArcaWsfeClient

  constructor() {
    this.wsfeClient = new ArcaWsfeClient()
  }

  /**
   * Validar si se puede emitir un comprobante
   */
  async canIssue(cbteTipo: number = 11): Promise<CanIssueResult> {
    const envKey = env.AFIP_ENV || 'homo'
    const cuitNormalized = env.AFIP_CUIT!

    // 1. Verificar estado de PV
    const statusRecord = await prisma.fiscalPtoVtaStatus.findUnique({
      where: {
        env_cuit: {
          env: envKey,
          cuit: cuitNormalized
        }
      }
    })

    if (!statusRecord || statusRecord.status !== 'READY') {
      return {
        canIssue: false,
        reason: `PV no está listo. Estado: ${statusRecord?.status || 'PENDING'}`,
        pvStatus: statusRecord?.status as 'READY' | 'PENDING' | 'ERROR' || 'PENDING'
      }
    }

    // 2. Verificar que el tipo de comprobante esté disponible
    const tiposCbteResult = await this.wsfeClient.getTiposCbte()
    if (!tiposCbteResult.success) {
      return {
        canIssue: false,
        reason: 'No se pudo obtener tipos de comprobante desde WSFE',
        pvStatus: 'READY',
        cbteTipoAvailable: false
      }
    }

    // Extraer tipos de comprobante
    const tiposCbteData = tiposCbteResult.data
    let tiposCbte: any[] = []
    
    if (tiposCbteData?.CbteTipo) {
      tiposCbte = Array.isArray(tiposCbteData.CbteTipo) ? tiposCbteData.CbteTipo : [tiposCbteData.CbteTipo]
    } else if (tiposCbteData?.ResultGet?.CbteTipo) {
      tiposCbte = Array.isArray(tiposCbteData.ResultGet.CbteTipo)
        ? tiposCbteData.ResultGet.CbteTipo
        : [tiposCbteData.ResultGet.CbteTipo]
    }

    const cbteTipoAvailable = tiposCbte.some((tc: any) => {
      const id = tc.Id || tc.id || tc['@_Id']
      return parseInt(id) === cbteTipo
    })

    if (!cbteTipoAvailable) {
      return {
        canIssue: false,
        reason: `Tipo de comprobante ${cbteTipo} no está disponible`,
        pvStatus: 'READY',
        cbteTipoAvailable: false
      }
    }

    // 3. Obtener punto de venta configurado o el primero disponible
    const ptoVtaConfig = await FiscalConfigService.getPtoVta()
    let ptoVta: number | null = null

    if (ptoVtaConfig) {
      ptoVta = ptoVtaConfig
    } else if (statusRecord.ptosVentaList) {
      const ptosVenta = statusRecord.ptosVentaList as any[]
      if (ptosVenta.length > 0) {
        ptoVta = ptosVenta[0].Nro || ptosVenta[0].numero
      }
    }

    if (!ptoVta) {
      return {
        canIssue: false,
        reason: 'No hay punto de venta configurado o disponible',
        pvStatus: 'READY',
        cbteTipoAvailable: true
      }
    }

    return {
      canIssue: true,
      pvStatus: 'READY',
      cbteTipoAvailable: true,
      ptoVta
    }
  }

  /**
   * Obtener último comprobante autorizado y calcular siguiente número
   */
  async getUltimoAutorizado(ptoVta: number, cbteTipo: number = 11): Promise<UltimoAutorizadoResult> {
    const result = await this.wsfeClient.getUltimoAutorizado(ptoVta, cbteTipo)

    if (!result.success) {
      throw new Error(`Error al obtener último comprobante autorizado: ${result.errors?.map(e => e.msg).join(', ')}`)
    }

    const data = result.data as any
    const cbteNro = data.CbteNro || data.cbteNro || 0
    const nextCbteNro = cbteNro + 1

    return {
      ptoVta: data.PtoVta || data.ptoVta || ptoVta,
      cbteTipo: data.CbteTipo || data.cbteTipo || cbteTipo,
      cbteNro,
      nextCbteNro
    }
  }

  /**
   * Resolver CondicionIVAReceptorId por defecto para "Consumidor Final"
   * Consulta la tabla desde WSFE y busca el ID correspondiente
   */
  async resolveCondicionIvaReceptorDefault(): Promise<number> {
    const result = await this.wsfeClient.getCondicionIvaReceptor()
    
    if (!result.success || !result.data) {
      throw new Error('No se pudo obtener condiciones IVA del receptor desde WSFE')
    }

    // Extraer CondicionIvaReceptor de la estructura real: ResultGet.CondicionIvaReceptor
    let condicionesArray: any[] = []
    const rawData = result.data

    if (rawData?.ResultGet?.CondicionIvaReceptor) {
      condicionesArray = Array.isArray(rawData.ResultGet.CondicionIvaReceptor) 
        ? rawData.ResultGet.CondicionIvaReceptor 
        : [rawData.ResultGet.CondicionIvaReceptor]
    } else if (rawData?.ResultGet?.CondicionIVAReceptor) {
      condicionesArray = Array.isArray(rawData.ResultGet.CondicionIVAReceptor) 
        ? rawData.ResultGet.CondicionIVAReceptor 
        : [rawData.ResultGet.CondicionIVAReceptor]
    } else if (rawData?.CondicionIvaReceptor) {
      condicionesArray = Array.isArray(rawData.CondicionIvaReceptor) 
        ? rawData.CondicionIvaReceptor 
        : [rawData.CondicionIvaReceptor]
    } else if (rawData?.CondicionIVAReceptor) {
      condicionesArray = Array.isArray(rawData.CondicionIVAReceptor) 
        ? rawData.CondicionIVAReceptor 
        : [rawData.CondicionIVAReceptor]
    } else if (Array.isArray(rawData)) {
      condicionesArray = rawData
    }

    if (condicionesArray.length === 0) {
      throw new Error(
        'No se encontraron condiciones IVA del receptor en la respuesta. ' +
        'Consulta GET /api/fiscal/wsfe/condicion-iva-receptor para verificar.'
      )
    }

    // Buscar "Consumidor Final" (case-insensitive, exacto)
    const consumidorFinal = condicionesArray.find((c: any) => {
      const desc = String(c.Desc || c.desc || c['#text'] || '').toLowerCase().trim()
      return desc === 'consumidor final' || (desc.includes('consumidor') && desc.includes('final'))
    })

    if (!consumidorFinal) {
      // Listar opciones disponibles para el error
      const opciones = condicionesArray.map((c: any) => ({
        id: c.Id || c.id || c['@_Id'],
        desc: c.Desc || c.desc || c['#text'] || ''
      }))
      throw new Error(
        `No se encontró "Consumidor Final" en la tabla de condiciones IVA. ` +
        `Opciones disponibles: ${opciones.map(o => `${o.id}=${o.desc}`).join(', ')}. ` +
        `Consulta GET /api/fiscal/wsfe/condicion-iva-receptor para ver todas las opciones.`
      )
    }

    const id = Number(consumidorFinal.Id || consumidorFinal.id || consumidorFinal['@_Id'])
    if (!id || id === 0) {
      throw new Error('ID de "Consumidor Final" inválido')
    }

    console.log(`✅ [IssueValidator] CondicionIVAReceptorId resuelto para "Consumidor Final": ${id}`)
    return id
  }

  /**
   * Preparar DTO para FECAESolicitar (Factura C mínima)
   */
  async prepareFECAESolicitarDTO(params: {
    ptoVta: number
    cbteTipo?: number
    importeTotal: number
    importeNeto?: number
    importeIva?: number
    fechaEmision?: Date
    condicionIvaReceptorId?: number // Si no se proporciona, se resuelve automáticamente
  }): Promise<FECAESolicitarDTO> {
    const cbteTipo = params.cbteTipo || 11 // Factura C
    const fechaEmision = params.fechaEmision || new Date()
    
    // Obtener siguiente número de comprobante
    const ultimo = await this.getUltimoAutorizado(params.ptoVta, cbteTipo)
    const cbteDesde = ultimo.nextCbteNro
    const cbteHasta = cbteDesde // Si es 1 comprobante, desde = hasta

    // Formatear fecha YYYYMMDD
    const year = fechaEmision.getFullYear()
    const month = String(fechaEmision.getMonth() + 1).padStart(2, '0')
    const day = String(fechaEmision.getDate()).padStart(2, '0')
    const cbteFch = `${year}${month}${day}`

    // Calcular importes (valores por defecto si no se especifican)
    const impTotal = params.importeTotal
    const impNeto = params.importeNeto || impTotal
    const impIVA = params.importeIva || 0
    const impTotConc = 0 // No gravado
    const impOpEx = 0 // Exento
    const impTrib = 0 // Tributos

    // Resolver CondicionIVAReceptorId (obligatorio desde 2025)
    let condicionIvaReceptorId = params.condicionIvaReceptorId
    if (!condicionIvaReceptorId) {
      // Si no se proporciona, resolver por defecto para "Consumidor Final"
      condicionIvaReceptorId = await this.resolveCondicionIvaReceptorDefault()
      console.log(`✅ [FiscalIssueValidator] CondicionIVAReceptorId resuelto automáticamente: ${condicionIvaReceptorId} (Consumidor Final)`)
    }

    return {
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: params.ptoVta,
          CbteTipo: cbteTipo
        },
        FeDetReq: {
          FECAEDetRequest: {
            Concepto: 1, // Productos
            DocTipo: 99, // Consumidor Final
            DocNro: 0, // 0 para Consumidor Final
            CondicionIVAReceptorId: condicionIvaReceptorId, // OBLIGATORIO desde 2025
            CbteDesde: cbteDesde,
            CbteHasta: cbteHasta,
            CbteFch: cbteFch,
            ImpTotal: impTotal,
            ImpTotConc: impTotConc,
            ImpNeto: impNeto,
            ImpOpEx: impOpEx,
            ImpIVA: impIVA,
            ImpTrib: impTrib,
            MonId: 'PES', // Pesos
            MonCotiz: 1 // Cotización 1 para pesos
          }
        }
      }
    }
  }
}
