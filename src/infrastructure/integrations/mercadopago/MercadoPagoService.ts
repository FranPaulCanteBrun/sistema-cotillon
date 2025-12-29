/**
 * Servicio de integración con Mercado Pago
 * 
 * Flujo de integración:
 * 1. Frontend crea preferencia de pago con los items de la venta
 * 2. Usuario paga en Checkout Pro o escanea QR
 * 3. MP envía webhook al backend con el estado del pago
 * 4. Backend actualiza la venta y notifica al frontend
 */

import type { 
  MPConfig, 
  MPPreference, 
  MPPreferenceResponse, 
  MPPayment,
  MPItem,
  MPPayer
} from './types'

class MercadoPagoService {
  private config: MPConfig | null = null
  private readonly API_URL = 'https://api.mercadopago.com'

  // Configurar el servicio
  configure(config: MPConfig) {
    this.config = config
  }

  isConfigured(): boolean {
    return !!this.config?.accessToken
  }

  // Crear preferencia de pago (para Checkout Pro)
  async createPreference(preference: Omit<MPPreference, 'id'>): Promise<MPPreferenceResponse> {
    if (!this.config) {
      throw new Error('Mercado Pago no está configurado')
    }

    const response = await fetch(`${this.API_URL}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...preference,
        notification_url: this.config.notificationUrl
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al crear preferencia de pago')
    }

    return response.json()
  }

  // Obtener información de un pago
  async getPayment(paymentId: string): Promise<MPPayment> {
    if (!this.config) {
      throw new Error('Mercado Pago no está configurado')
    }

    const response = await fetch(`${this.API_URL}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener información del pago')
    }

    return response.json()
  }

  // Crear preferencia desde una venta
  createPreferenceFromSale(
    saleId: string,
    items: Array<{ name: string; quantity: number; unitPrice: number }>,
    payer?: { email: string; name?: string }
  ): Omit<MPPreference, 'id'> {
    const mpItems: MPItem[] = items.map((item, index) => ({
      id: `item-${index}`,
      title: item.name,
      quantity: item.quantity,
      currency_id: 'ARS',
      unit_price: item.unitPrice
    }))

    const preference: Omit<MPPreference, 'id'> = {
      items: mpItems,
      external_reference: saleId,
      back_urls: {
        success: `${window.location.origin}/pago/exito`,
        failure: `${window.location.origin}/pago/error`,
        pending: `${window.location.origin}/pago/pendiente`
      },
      auto_return: 'approved'
    }

    if (payer?.email) {
      preference.payer = {
        email: payer.email,
        name: payer.name
      }
    }

    return preference
  }

  // Obtener URL de checkout
  getCheckoutUrl(preferenceResponse: MPPreferenceResponse): string {
    return this.config?.sandbox 
      ? preferenceResponse.sandbox_init_point 
      : preferenceResponse.init_point
  }

  // Validar notificación webhook (para el backend)
  validateWebhookSignature(
    xSignature: string,
    xRequestId: string,
    dataId: string,
    secret: string
  ): boolean {
    // Implementación según documentación de MP
    // https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(',')[0]?.split('ts=')[1]};`
    // En producción, calcular HMAC-SHA256 y comparar
    return true // Placeholder
  }
}

// Singleton
export const mercadoPagoService = new MercadoPagoService()

