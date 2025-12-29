/**
 * Tipos para facturación electrónica
 * Basado en requisitos de AFIP Argentina
 * 
 * Tipos de comprobante:
 * - Factura A/B/C
 * - Nota de Crédito A/B/C
 * - Nota de Débito A/B/C
 * - Ticket (consumidor final)
 */

// Tipos de comprobante AFIP
export type InvoiceType = 
  | 'FACTURA_A' 
  | 'FACTURA_B' 
  | 'FACTURA_C'
  | 'NOTA_CREDITO_A'
  | 'NOTA_CREDITO_B'
  | 'NOTA_CREDITO_C'
  | 'NOTA_DEBITO_A'
  | 'NOTA_DEBITO_B'
  | 'NOTA_DEBITO_C'
  | 'TICKET'

// Códigos AFIP para tipos de comprobante
export const INVOICE_TYPE_CODES: Record<InvoiceType, number> = {
  'FACTURA_A': 1,
  'FACTURA_B': 6,
  'FACTURA_C': 11,
  'NOTA_CREDITO_A': 3,
  'NOTA_CREDITO_B': 8,
  'NOTA_CREDITO_C': 13,
  'NOTA_DEBITO_A': 2,
  'NOTA_DEBITO_B': 7,
  'NOTA_DEBITO_C': 12,
  'TICKET': 83 // Ticket factura
}

// Tipos de documento
export type DocumentType = 'DNI' | 'CUIT' | 'CUIL' | 'CDI' | 'PASAPORTE' | 'CONSUMIDOR_FINAL'

export const DOCUMENT_TYPE_CODES: Record<DocumentType, number> = {
  'CUIT': 80,
  'CUIL': 86,
  'CDI': 87,
  'DNI': 96,
  'PASAPORTE': 94,
  'CONSUMIDOR_FINAL': 99
}

// Condiciones de IVA
export type IVACondition = 
  | 'RESPONSABLE_INSCRIPTO'
  | 'MONOTRIBUTISTA'
  | 'EXENTO'
  | 'CONSUMIDOR_FINAL'
  | 'NO_RESPONSABLE'

// Alícuotas de IVA
export type IVARate = 0 | 10.5 | 21 | 27

export const IVA_CODES: Record<IVARate, number> = {
  0: 3,      // No gravado
  10.5: 4,   // 10.5%
  21: 5,     // 21%
  27: 6      // 27%
}

// Estructura de factura
export interface Invoice {
  id: string
  saleId: string
  type: InvoiceType
  pointOfSale: number        // Punto de venta (4 dígitos)
  number: number             // Número de comprobante (8 dígitos)
  date: Date
  
  // Datos del emisor (tu negocio)
  issuer: InvoiceIssuer
  
  // Datos del receptor (cliente)
  receiver: InvoiceReceiver
  
  // Items
  items: InvoiceItem[]
  
  // Totales
  netAmount: number          // Neto gravado
  exemptAmount: number       // Exento
  ivaAmount: number          // Total IVA
  otherTaxes: number         // Otros impuestos
  totalAmount: number        // Total
  
  // AFIP
  cae?: string               // Código de Autorización Electrónico
  caeExpirationDate?: Date   // Fecha vencimiento CAE
  
  // Estado
  status: 'draft' | 'authorized' | 'rejected' | 'cancelled'
  afipResponse?: AFIPResponse
  
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceIssuer {
  businessName: string       // Razón social
  cuit: string
  ivaCondition: IVACondition
  grossIncome?: string       // Ingresos brutos
  activityStartDate?: Date
  address: string
}

export interface InvoiceReceiver {
  name: string
  documentType: DocumentType
  documentNumber: string
  ivaCondition: IVACondition
  address?: string
  email?: string
}

export interface InvoiceItem {
  code?: string
  description: string
  quantity: number
  unitOfMeasure: string      // Unidad de medida
  unitPrice: number
  bonification: number       // Bonificación %
  ivaRate: IVARate
  subtotal: number
  ivaAmount: number
  total: number
}

// Respuesta de AFIP
export interface AFIPResponse {
  result: 'A' | 'R' | 'P'    // Aprobado, Rechazado, Parcial
  cae?: string
  caeExpirationDate?: string
  errors?: AFIPError[]
  observations?: AFIPObservation[]
}

export interface AFIPError {
  code: number
  message: string
}

export interface AFIPObservation {
  code: number
  message: string
}

// Configuración del servicio de facturación
export interface InvoicingConfig {
  // Datos del negocio
  businessName: string
  cuit: string
  ivaCondition: IVACondition
  address: string
  
  // AFIP
  pointOfSale: number
  certificate: string        // Certificado digital (.crt)
  privateKey: string         // Clave privada (.key)
  production: boolean        // Producción o homologación
  
  // Otros
  grossIncome?: string
  activityStartDate?: Date
}

// Request para autorización de factura
export interface AuthorizeInvoiceRequest {
  type: InvoiceType
  receiver: InvoiceReceiver
  items: Omit<InvoiceItem, 'subtotal' | 'ivaAmount' | 'total'>[]
  relatedInvoice?: {         // Para notas de crédito/débito
    type: InvoiceType
    pointOfSale: number
    number: number
  }
}

