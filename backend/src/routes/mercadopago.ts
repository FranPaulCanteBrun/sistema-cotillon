import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

// Esquemas de validación
const createPreferenceSchema = z.object({
  saleId: z.string().uuid(),
  items: z.array(z.object({
    title: z.string(),
    quantity: z.number().positive(),
    unit_price: z.number().positive()
  })),
  payer: z.object({
    email: z.string().email(),
    name: z.string().optional()
  }).optional()
})

const webhookSchema = z.object({
  id: z.number(),
  type: z.string(),
  data: z.object({
    id: z.string()
  })
})

// Configuración de MP (en producción, usar variables de entorno)
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || ''
const MP_WEBHOOK_URL = process.env.MP_WEBHOOK_URL || ''

export const mercadoPagoRoutes: FastifyPluginAsync = async (app) => {
  // Crear preferencia de pago
  app.post('/preferences', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear preferencia de pago en Mercado Pago',
      tags: ['Mercado Pago'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    if (!MP_ACCESS_TOKEN) {
      return reply.status(503).send({ 
        error: true, 
        message: 'Mercado Pago no está configurado' 
      })
    }

    const parsed = createPreferenceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ 
        error: true, 
        message: parsed.error.errors[0]?.message 
      })
    }

    const { saleId, items, payer } = parsed.data

    // Verificar que la venta existe
    const sale = await prisma.sale.findUnique({ where: { id: saleId } })
    if (!sale) {
      return reply.status(404).send({ error: true, message: 'Venta no encontrada' })
    }

    try {
      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: items.map((item, idx) => ({
            id: `item-${idx}`,
            title: item.title,
            quantity: item.quantity,
            currency_id: 'ARS',
            unit_price: item.unit_price
          })),
          payer,
          external_reference: saleId,
          notification_url: MP_WEBHOOK_URL,
          back_urls: {
            success: `${process.env.FRONTEND_URL}/pago/exito`,
            failure: `${process.env.FRONTEND_URL}/pago/error`,
            pending: `${process.env.FRONTEND_URL}/pago/pendiente`
          },
          auto_return: 'approved'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al crear preferencia')
      }

      const preference = await response.json()

      return {
        id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point
      }
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ 
        error: true, 
        message: 'Error al crear preferencia de pago' 
      })
    }
  })

  // Webhook de notificaciones de MP
  app.post('/webhook', {
    schema: {
      description: 'Webhook para notificaciones de Mercado Pago',
      tags: ['Mercado Pago']
    }
  }, async (request, reply) => {
    const parsed = webhookSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true })
    }

    const { type, data } = parsed.data

    if (type !== 'payment') {
      return { received: true }
    }

    try {
      // Obtener información del pago
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${data.id}`,
        {
          headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        }
      )

      if (!paymentResponse.ok) {
        throw new Error('Error al obtener pago')
      }

      const payment = await paymentResponse.json()
      const saleId = payment.external_reference

      if (!saleId) {
        app.log.warn('Pago sin external_reference')
        return { received: true }
      }

      // Actualizar estado de la venta según estado del pago
      let newStatus: 'PENDING' | 'COMPLETED' | 'CANCELLED' = 'PENDING'
      
      switch (payment.status) {
        case 'approved':
          newStatus = 'COMPLETED'
          break
        case 'rejected':
        case 'cancelled':
          newStatus = 'CANCELLED'
          break
        default:
          newStatus = 'PENDING'
      }

      await prisma.sale.update({
        where: { id: saleId },
        data: { 
          status: newStatus,
          // Guardar referencia del pago MP
          notes: `MP Payment ID: ${payment.id}`
        }
      })

      app.log.info(`Pago ${payment.id} procesado: ${payment.status}`)

      return { received: true }
    } catch (error) {
      app.log.error(error)
      // Siempre retornar 200 al webhook para evitar reintentos
      return { received: true, error: 'Error interno' }
    }
  })

  // Obtener estado de pago
  app.get('/payments/:paymentId', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener información de un pago',
      tags: ['Mercado Pago'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    if (!MP_ACCESS_TOKEN) {
      return reply.status(503).send({ 
        error: true, 
        message: 'Mercado Pago no está configurado' 
      })
    }

    const { paymentId } = request.params as { paymentId: string }

    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
        }
      )

      if (!response.ok) {
        return reply.status(404).send({ 
          error: true, 
          message: 'Pago no encontrado' 
        })
      }

      const payment = await response.json()

      return {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        amount: payment.transaction_amount,
        date_approved: payment.date_approved,
        payment_method: payment.payment_method_id,
        external_reference: payment.external_reference
      }
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ 
        error: true, 
        message: 'Error al obtener información del pago' 
      })
    }
  })
}

