import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

// Esquemas
const createInvoiceSchema = z.object({
  saleId: z.string().uuid(),
  type: z.enum(['FACTURA_A', 'FACTURA_B', 'FACTURA_C', 'TICKET']),
  receiver: z.object({
    name: z.string(),
    documentType: z.enum(['DNI', 'CUIT', 'CUIL', 'CONSUMIDOR_FINAL']),
    documentNumber: z.string(),
    ivaCondition: z.enum([
      'RESPONSABLE_INSCRIPTO',
      'MONOTRIBUTISTA',
      'EXENTO',
      'CONSUMIDOR_FINAL'
    ]),
    address: z.string().optional(),
    email: z.string().email().optional()
  })
})

// Códigos de tipo de comprobante AFIP
const INVOICE_TYPE_CODES: Record<string, number> = {
  'FACTURA_A': 1,
  'FACTURA_B': 6,
  'FACTURA_C': 11,
  'TICKET': 83
}

export const invoicingRoutes: FastifyPluginAsync = async (app) => {
  // Crear factura para una venta
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear factura electrónica',
      tags: ['Facturación'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = createInvoiceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ 
        error: true, 
        message: parsed.error.errors[0]?.message 
      })
    }

    const { saleId, type, receiver } = parsed.data

    // Obtener la venta con sus items
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    if (!sale) {
      return reply.status(404).send({ error: true, message: 'Venta no encontrada' })
    }

    if (sale.status !== 'COMPLETED') {
      return reply.status(400).send({ 
        error: true, 
        message: 'Solo se pueden facturar ventas completadas' 
      })
    }

    // Calcular totales
    // TODO: En producción, estos cálculos serían más complejos
    // considerando diferentes alícuotas de IVA
    const ivaRate = type === 'FACTURA_C' ? 0 : 21
    const netAmount = Number(sale.total) / (1 + ivaRate / 100)
    const ivaAmount = Number(sale.total) - netAmount

    // Generar número de factura (en producción, viene de AFIP)
    const invoiceNumber = Math.floor(Math.random() * 100000000)
    const pointOfSale = 1 // Configurar según negocio

    // Crear registro de factura
    // TODO: Crear tabla de facturas en Prisma schema
    const invoice = {
      id: crypto.randomUUID(),
      saleId,
      type,
      typeCode: INVOICE_TYPE_CODES[type],
      pointOfSale,
      number: invoiceNumber,
      formattedNumber: `${String(pointOfSale).padStart(4, '0')}-${String(invoiceNumber).padStart(8, '0')}`,
      date: new Date(),
      receiver,
      items: sale.items.map(item => ({
        description: item.variant.product.name + (item.variant.color ? ` - ${item.variant.color}` : ''),
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal)
      })),
      netAmount: Math.round(netAmount * 100) / 100,
      ivaRate,
      ivaAmount: Math.round(ivaAmount * 100) / 100,
      totalAmount: Number(sale.total),
      // En producción, estos datos vienen de AFIP
      cae: null as string | null,
      caeExpirationDate: null as Date | null,
      status: 'draft' as const,
      createdAt: new Date()
    }

    // TODO: Guardar en base de datos
    // TODO: Enviar a AFIP para obtener CAE

    // Placeholder: simular autorización de AFIP
    const authorizedInvoice = {
      ...invoice,
      cae: '12345678901234',
      caeExpirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: 'authorized' as const
    }

    return reply.status(201).send({ invoice: authorizedInvoice })
  })

  // Listar facturas
  app.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Listar facturas',
      tags: ['Facturación'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    // TODO: Implementar cuando exista la tabla de facturas
    return { 
      invoices: [],
      message: 'Funcionalidad en desarrollo - requiere tabla de facturas en DB'
    }
  })

  // Obtener factura por ID
  app.get('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener factura por ID',
      tags: ['Facturación'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    // TODO: Implementar cuando exista la tabla de facturas
    return reply.status(404).send({ 
      error: true, 
      message: 'Factura no encontrada' 
    })
  })

  // Generar PDF de factura
  app.get('/:id/pdf', {
    preHandler: [authenticate],
    schema: {
      description: 'Generar PDF de factura',
      tags: ['Facturación'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    // TODO: Implementar generación de PDF
    // Usar librería como PDFKit o Puppeteer
    
    return reply.status(501).send({ 
      error: true, 
      message: 'Generación de PDF en desarrollo' 
    })
  })

  // Validar CUIT
  app.get('/validate-cuit/:cuit', {
    schema: {
      description: 'Validar número de CUIT',
      tags: ['Facturación']
    }
  }, async (request) => {
    const { cuit } = request.params as { cuit: string }
    const cleanCuit = cuit.replace(/-/g, '')
    
    if (cleanCuit.length !== 11 || !/^\d+$/.test(cleanCuit)) {
      return { valid: false, message: 'Formato de CUIT inválido' }
    }

    // Algoritmo de validación
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    let sum = 0
    
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCuit[i]!) * multipliers[i]!
    }
    
    const remainder = sum % 11
    const verifier = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder
    const isValid = parseInt(cleanCuit[10]!) === verifier

    return { 
      valid: isValid, 
      formatted: `${cleanCuit.slice(0, 2)}-${cleanCuit.slice(2, 10)}-${cleanCuit.slice(10)}`
    }
  })
}

