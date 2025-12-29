import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'
import { Prisma } from '@prisma/client'

const saleItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  discount: z.number().min(0).max(100).default(0)
})

const createSaleSchema = z.object({
  paymentMethodId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1),
  notes: z.string().optional()
})

export const salesRoutes: FastifyPluginAsync = async (app) => {
  // Listar ventas con filtros
  app.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Listar ventas',
      tags: ['Ventas'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    const query = request.query as {
      startDate?: string
      endDate?: string
      status?: string
      paymentMethodId?: string
      userId?: string
      page?: string
      limit?: string
    }

    const page = parseInt(query.page ?? '1')
    const limit = parseInt(query.limit ?? '20')
    const skip = (page - 1) * limit

    const where: Prisma.SaleWhereInput = {
      ...(query.status && { status: query.status as 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' }),
      ...(query.paymentMethodId && { paymentMethodId: query.paymentMethodId }),
      ...(query.userId && { userId: query.userId }),
      ...(query.startDate && {
        createdAt: {
          gte: new Date(query.startDate)
        }
      }),
      ...(query.endDate && {
        createdAt: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          lte: new Date(query.endDate)
        }
      })
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },
          paymentMethod: { select: { id: true, name: true, type: true } },
          customer: { select: { id: true, name: true } },
          items: {
            include: {
              variant: {
                include: {
                  product: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      }),
      prisma.sale.count({ where })
    ])

    return {
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  })

  // Obtener venta por ID
  app.get('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener venta por ID',
      tags: ['Ventas'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        paymentMethod: true,
        customer: true,
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, name: true, code: true } }
              }
            }
          }
        }
      }
    })

    if (!sale) {
      return reply.status(404).send({ error: true, message: 'Venta no encontrada' })
    }

    return { sale }
  })

  // Crear venta
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear nueva venta',
      tags: ['Ventas'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = createSaleSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { paymentMethodId, customerId, items, notes } = parsed.data
    const userId = request.user.id

    // Generar número de recibo
    const today = new Date()
    const prefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const todaySalesCount = await prisma.sale.count({
      where: {
        receiptNumber: { startsWith: prefix }
      }
    })
    const receiptNumber = `${prefix}-${String(todaySalesCount + 1).padStart(4, '0')}`

    // Verificar stock y calcular totales
    let subtotal = 0
    let totalDiscount = 0

    for (const item of items) {
      const variant = await prisma.productVariant.findUnique({ where: { id: item.variantId } })
      if (!variant) {
        return reply.status(400).send({ error: true, message: `Variante ${item.variantId} no encontrada` })
      }
      if (variant.currentStock < item.quantity) {
        return reply.status(400).send({ 
          error: true, 
          message: `Stock insuficiente para ${variant.sku}. Disponible: ${variant.currentStock}` 
        })
      }

      const itemSubtotal = item.unitPrice * item.quantity
      const itemDiscount = itemSubtotal * (item.discount / 100)
      subtotal += itemSubtotal
      totalDiscount += itemDiscount
    }

    const total = subtotal - totalDiscount

    // Crear venta con transacción
    const sale = await prisma.$transaction(async (tx) => {
      // Crear venta
      const newSale = await tx.sale.create({
        data: {
          receiptNumber,
          userId,
          paymentMethodId,
          customerId,
          status: 'COMPLETED',
          notes,
          subtotal,
          discount: totalDiscount,
          total,
          items: {
            create: items.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              subtotal: item.unitPrice * item.quantity * (1 - item.discount / 100)
            }))
          }
        },
        include: {
          items: true,
          paymentMethod: true
        }
      })

      // Actualizar stock y crear movimientos
      for (const item of items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant) continue

        const newStock = variant.currentStock - item.quantity

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { currentStock: newStock }
        })

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId,
            type: 'SALE',
            quantity: item.quantity,
            previousStock: variant.currentStock,
            newStock,
            reason: `Venta ${receiptNumber}`,
            referenceId: newSale.id
          }
        })
      }

      return newSale
    })

    return reply.status(201).send({ sale })
  })

  // Cancelar venta
  app.post('/:id/cancel', {
    preHandler: [authenticate],
    schema: {
      description: 'Cancelar venta',
      tags: ['Ventas'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!sale) {
      return reply.status(404).send({ error: true, message: 'Venta no encontrada' })
    }

    if (sale.status !== 'COMPLETED') {
      return reply.status(400).send({ error: true, message: 'Solo se pueden cancelar ventas completadas' })
    }

    // Cancelar con transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar estado
      await tx.sale.update({
        where: { id },
        data: { status: 'CANCELLED' }
      })

      // Devolver stock
      for (const item of sale.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } })
        if (!variant) continue

        const newStock = variant.currentStock + item.quantity

        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { currentStock: newStock }
        })

        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            userId: request.user.id,
            type: 'RETURN',
            quantity: item.quantity,
            previousStock: variant.currentStock,
            newStock,
            reason: `Cancelación de venta ${sale.receiptNumber}`,
            referenceId: id
          }
        })
      }
    })

    return { message: 'Venta cancelada y stock restaurado' }
  })

  // Resumen de ventas del día
  app.get('/summary/today', {
    preHandler: [authenticate],
    schema: {
      description: 'Resumen de ventas del día',
      tags: ['Ventas'],
      security: [{ bearerAuth: [] }]
    }
  }, async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [sales, totals] = await Promise.all([
      prisma.sale.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: today }
        }
      }),
      prisma.sale.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: today }
        },
        _sum: { total: true },
        _avg: { total: true }
      })
    ])

    return {
      salesCount: sales,
      totalAmount: totals._sum.total ?? 0,
      averageAmount: totals._avg.total ?? 0
    }
  })
}

