/**
 * Servicio de facturación electrónica
 * 
 * Este servicio proporciona la estructura para integrar con AFIP.
 * La implementación real de la comunicación con AFIP requiere:
 * 
 * 1. Certificado digital (AFIP provee herramientas para generarlo)
 * 2. Clave privada
 * 3. CUIT del emisor
 * 4. Punto de venta habilitado en AFIP
 * 
 * Flujo de facturación:
 * 1. Generar factura con datos de la venta
 * 2. Calcular totales e IVA
 * 3. Enviar a AFIP para obtener CAE
 * 4. Guardar factura con CAE
 * 5. Generar PDF para el cliente
 * 
 * Nota: La comunicación real con AFIP se haría desde el backend
 * usando los web services de AFIP (WSAA, WSFE)
 */

import type {
  Invoice,
  InvoiceType,
  InvoiceItem,
  InvoiceReceiver,
  InvoicingConfig,
  AuthorizeInvoiceRequest,
  IVARate,
  INVOICE_TYPE_CODES,
  IVA_CODES
} from './types'

class InvoicingService {
  private config: InvoicingConfig | null = null

  // Configurar el servicio
  configure(config: InvoicingConfig) {
    this.config = config
  }

  isConfigured(): boolean {
    return !!(this.config?.cuit && this.config?.pointOfSale)
  }

  getConfig(): InvoicingConfig | null {
    return this.config
  }

  // Determinar tipo de factura según condición de IVA del cliente
  determineInvoiceType(
    receiverIVACondition: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL' | 'NO_RESPONSABLE'
  ): InvoiceType {
    if (!this.config) {
      throw new Error('Servicio de facturación no configurado')
    }

    const issuerCondition = this.config.ivaCondition

    // Responsable Inscripto emite:
    if (issuerCondition === 'RESPONSABLE_INSCRIPTO') {
      if (receiverIVACondition === 'RESPONSABLE_INSCRIPTO') {
        return 'FACTURA_A'
      }
      return 'FACTURA_B'
    }

    // Monotributista emite Factura C
    if (issuerCondition === 'MONOTRIBUTISTA') {
      return 'FACTURA_C'
    }

    // Exento emite Factura C
    return 'FACTURA_C'
  }

  // Calcular item con IVA
  calculateItem(
    item: Omit<InvoiceItem, 'subtotal' | 'ivaAmount' | 'total'>
  ): InvoiceItem {
    const subtotal = item.quantity * item.unitPrice * (1 - item.bonification / 100)
    const ivaAmount = subtotal * (item.ivaRate / 100)
    const total = subtotal + ivaAmount

    return {
      ...item,
      subtotal: Math.round(subtotal * 100) / 100,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    }
  }

  // Crear borrador de factura
  createDraftInvoice(
    saleId: string,
    request: AuthorizeInvoiceRequest
  ): Omit<Invoice, 'id' | 'number' | 'cae' | 'caeExpirationDate' | 'afipResponse'> {
    if (!this.config) {
      throw new Error('Servicio de facturación no configurado')
    }

    // Calcular items
    const calculatedItems = request.items.map(item => this.calculateItem(item))

    // Calcular totales
    const netAmount = calculatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const ivaAmount = calculatedItems.reduce((sum, item) => sum + item.ivaAmount, 0)
    const totalAmount = calculatedItems.reduce((sum, item) => sum + item.total, 0)

    return {
      saleId,
      type: request.type,
      pointOfSale: this.config.pointOfSale,
      date: new Date(),
      issuer: {
        businessName: this.config.businessName,
        cuit: this.config.cuit,
        ivaCondition: this.config.ivaCondition,
        grossIncome: this.config.grossIncome,
        activityStartDate: this.config.activityStartDate,
        address: this.config.address
      },
      receiver: request.receiver,
      items: calculatedItems,
      netAmount: Math.round(netAmount * 100) / 100,
      exemptAmount: 0,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      otherTaxes: 0,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Formatear número de comprobante (punto de venta + número)
  formatInvoiceNumber(pointOfSale: number, number: number): string {
    return `${String(pointOfSale).padStart(4, '0')}-${String(number).padStart(8, '0')}`
  }

  // Obtener siguiente número de comprobante
  // (en producción, esto viene de AFIP)
  async getNextInvoiceNumber(type: InvoiceType): Promise<number> {
    // TODO: Implementar consulta a AFIP o base de datos local
    // Por ahora retornamos un placeholder
    return 1
  }

  // Autorizar factura en AFIP
  // Esta función se llamaría desde el backend
  async authorizeInvoice(invoice: Invoice): Promise<Invoice> {
    // TODO: Implementar comunicación con AFIP
    // 1. Obtener token de WSAA
    // 2. Llamar a WSFE para autorizar
    // 3. Obtener CAE
    
    // Placeholder - en producción esto viene de AFIP
    const cae = '12345678901234'
    const caeExpiration = new Date()
    caeExpiration.setDate(caeExpiration.getDate() + 10)

    return {
      ...invoice,
      cae,
      caeExpirationDate: caeExpiration,
      status: 'authorized',
      afipResponse: {
        result: 'A',
        cae,
        caeExpirationDate: caeExpiration.toISOString()
      },
      updatedAt: new Date()
    }
  }

  // Generar datos para código QR de AFIP
  generateQRData(invoice: Invoice): string {
    if (!invoice.cae || !this.config) {
      throw new Error('Factura no autorizada o servicio no configurado')
    }

    // Formato de datos para QR según AFIP RG 4291
    const qrData = {
      ver: 1,
      fecha: invoice.date.toISOString().split('T')[0],
      cuit: parseInt(this.config.cuit.replace(/-/g, '')),
      ptoVta: invoice.pointOfSale,
      tipoCmp: INVOICE_TYPE_CODES[invoice.type],
      nroCmp: invoice.number,
      importe: invoice.totalAmount,
      moneda: 'PES',
      ctz: 1,
      tipoDocRec: 99, // Consumidor final por defecto
      nroDocRec: 0,
      tipoCodAut: 'E',
      codAut: parseInt(invoice.cae)
    }

    // En producción, esto se codifica en base64 y se genera el QR
    const base64Data = btoa(JSON.stringify(qrData))
    return `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`
  }

  // Validar CUIT
  validateCUIT(cuit: string): boolean {
    const cleanCuit = cuit.replace(/-/g, '')
    if (cleanCuit.length !== 11) return false
    if (!/^\d+$/.test(cleanCuit)) return false

    // Algoritmo de validación de CUIT
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    let sum = 0
    
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCuit[i]!) * multipliers[i]!
    }
    
    const remainder = sum % 11
    const verifier = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder
    
    return parseInt(cleanCuit[10]!) === verifier
  }
}

// Singleton
export const invoicingService = new InvoicingService()

