/**
 * Tipos para integración con Mercado Pago
 * Documentación: https://www.mercadopago.com.ar/developers/es/reference
 */

// Preferencia de pago (para Checkout Pro o Checkout Bricks)
export interface MPPreference {
  id?: string
  items: MPItem[]
  payer?: MPPayer
  back_urls?: {
    success: string
    failure: string
    pending: string
  }
  auto_return?: 'approved' | 'all'
  notification_url?: string
  external_reference?: string
  expires?: boolean
  expiration_date_from?: string
  expiration_date_to?: string
}

export interface MPItem {
  id: string
  title: string
  description?: string
  category_id?: string
  quantity: number
  currency_id: 'ARS' | 'USD' | 'BRL'
  unit_price: number
  picture_url?: string
}

export interface MPPayer {
  name?: string
  surname?: string
  email: string
  phone?: {
    area_code: string
    number: string
  }
  identification?: {
    type: 'DNI' | 'CUIT' | 'CUIL'
    number: string
  }
  address?: {
    street_name: string
    street_number: number
    zip_code: string
  }
}

// Respuesta de creación de preferencia
export interface MPPreferenceResponse {
  id: string
  init_point: string
  sandbox_init_point: string
  date_created: string
  collector_id: number
  external_reference: string
}

// Pago recibido (webhook o consulta)
export interface MPPayment {
  id: number
  date_created: string
  date_approved?: string
  date_last_updated: string
  money_release_date?: string
  operation_type: string
  payment_method_id: string
  payment_type_id: string
  status: MPPaymentStatus
  status_detail: string
  currency_id: string
  description: string
  collector_id: number
  payer: MPPayer
  transaction_amount: number
  transaction_amount_refunded: number
  coupon_amount: number
  differential_pricing_id?: number
  deduction_schema?: string
  installments: number
  transaction_details: {
    net_received_amount: number
    total_paid_amount: number
    overpaid_amount: number
    installment_amount: number
  }
  fee_details: Array<{
    type: string
    amount: number
    fee_payer: string
  }>
  captured: boolean
  binary_mode: boolean
  external_reference: string
  statement_descriptor: string
  notification_url: string
  processing_mode: string
  merchant_account_id?: string
  acquirer?: string
  merchant_number?: string
}

export type MPPaymentStatus = 
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back'

// Webhook notification
export interface MPWebhookNotification {
  id: number
  live_mode: boolean
  type: 'payment' | 'plan' | 'subscription' | 'invoice' | 'point_integration_wh'
  date_created: string
  user_id: number
  api_version: string
  action: string
  data: {
    id: string
  }
}

// QR Code (Point)
export interface MPQRData {
  qr_data: string
  in_store_order_id: string
  external_reference: string
}

// Configuración del servicio
export interface MPConfig {
  accessToken: string
  publicKey: string
  sandbox: boolean
  notificationUrl: string
}

