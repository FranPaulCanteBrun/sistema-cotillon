import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'
import { Prisma, StockMovementType } from '@prisma/client'

const stockMovementSchema = z.object({
  variantId: z.string().uuid(),
  type: z.enum(['ENTRY', 'ADJUSTMENT', 'LOSS']),
  quantity: z.number().int().positive(),
  reason: z.string().min(1, 'Razón requerida')
})

const batchStockSchema = z.object({
  movements: z.array(stockMovementSchema).min(1)
})

export const stockRoutes: FastifyPluginAsync = async (app) => {
  // Listar movimientos de stock
  app.get('/movements', {
    preHandler: [authenticate],
    schema: {
      description: 'Listar movimientos de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    const query = request.query as {
      variantId?: string
      type?: string
      startDate?: string
      endDate?: string
      page?: string
      limit?: string
    }

    const page = parseInt(query.page ?? '1')
    const limit = parseInt(query.limit ?? '50')
    const skip = (page - 1) * limit

    const where: Prisma.StockMovementWhereInput = {
      ...(query.variantId && { variantId: query.variantId }),
      ...(query.type && { type: query.type as StockMovementType }),
      ...(query.startDate && {
        createdAt: {
          gte: new Date(query.startDate),
          ...(query.endDate && { lte: new Date(query.endDate) })
        }
      })
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, code: true } }
            }
          },
          user: { select: { id: true, name: true } }
        }
      }),
      prisma.stockMovement.count({ where })
    ])

    return {
      movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  })

  // Crear movimiento de stock individual
  app.post('/movements', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear movimiento de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = stockMovementSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { variantId, type, quantity, reason } = parsed.data
    const userId = request.user.id

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } })
    if (!variant) {
      return reply.status(404).send({ error: true, message: 'Variante no encontrada' })
    }

    // Calcular nuevo stock
    let newStock: number
    if (type === 'ENTRY') {
      newStock = variant.currentStock + quantity
    } else if (type === 'LOSS') {
      newStock = Math.max(0, variant.currentStock - quantity)
    } else {
      // ADJUSTMENT: la cantidad es el nuevo stock absoluto
      newStock = quantity
    }

    // Crear movimiento y actualizar stock
    const movement = await prisma.$transaction(async (tx) => {
      const mov = await tx.stockMovement.create({
        data: {
          variantId,
          userId,
          type,
          quantity: type === 'ADJUSTMENT' ? Math.abs(newStock - variant.currentStock) : quantity,
          previousStock: variant.currentStock,
          newStock,
          reason
        },
        include: {
          variant: {
            include: {
              product: { select: { name: true, code: true } }
            }
          }
        }
      })

      await tx.productVariant.update({
        where: { id: variantId },
        data: { currentStock: newStock }
      })

      return mov
    })

    return reply.status(201).send({ movement })
  })

  // Crear movimientos en lote
  app.post('/movements/batch', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear múltiples movimientos de stock',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = batchStockSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { movements } = parsed.data
    const userId = request.user.id

    // Validar todas las variantes existen
    const variantIds = [...new Set(movements.map(m => m.variantId))]
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } }
    })

    if (variants.length !== variantIds.length) {
      return reply.status(400).send({ error: true, message: 'Una o más variantes no existen' })
    }

    const variantsMap = new Map(variants.map(v => [v.id, v]))

    // Procesar en transacción
    const results = await prisma.$transaction(async (tx) => {
      const createdMovements = []

      for (const mov of movements) {
        const variant = variantsMap.get(mov.variantId)
        if (!variant) continue

        let newStock: number
        if (mov.type === 'ENTRY') {
          newStock = variant.currentStock + mov.quantity
        } else if (mov.type === 'LOSS') {
          newStock = Math.max(0, variant.currentStock - mov.quantity)
        } else {
          newStock = mov.quantity
        }

        const movement = await tx.stockMovement.create({
          data: {
            variantId: mov.variantId,
            userId,
            type: mov.type,
            quantity: mov.type === 'ADJUSTMENT' ? Math.abs(newStock - variant.currentStock) : mov.quantity,
            previousStock: variant.currentStock,
            newStock,
            reason: mov.reason
          }
        })

        await tx.productVariant.update({
          where: { id: mov.variantId },
          data: { currentStock: newStock }
        })

        // Actualizar mapa para siguientes movimientos del mismo variant
        variant.currentStock = newStock
        createdMovements.push(movement)
      }

      return createdMovements
    })

    return reply.status(201).send({ 
      message: `${results.length} movimientos procesados`,
      movements: results
    })
  })

  // Productos con stock bajo
  app.get('/low-stock', {
    preHandler: [authenticate],
    schema: {
      description: 'Productos con stock bajo',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }]
    }
  }, async () => {
    const lowStock = await prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: { isActive: true }
      },
      include: {
        product: {
          select: { id: true, name: true, code: true, minStock: true, categoryId: true }
        }
      }
    })

    // Filtrar los que están bajo el mínimo
    const filtered = lowStock.filter(v => v.currentStock <= v.product.minStock)

    return {
      count: filtered.length,
      variants: filtered.map(v => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        size: v.size,
        currentStock: v.currentStock,
        minStock: v.product.minStock,
        product: v.product
      }))
    }
  })

  // Resumen de inventario
  app.get('/summary', {
    preHandler: [authenticate],
    schema: {
      description: 'Resumen de inventario',
      tags: ['Stock'],
      security: [{ bearerAuth: [] }]
    }
  }, async () => {
    const [totalProducts, totalVariants, lowStockCount, outOfStockCount, totalStockValue] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.productVariant.count({ where: { isActive: true } }),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.is_active = true 
          AND p.is_active = true 
          AND pv.current_stock <= p.min_stock 
          AND pv.current_stock > 0
      `,
      prisma.productVariant.count({
        where: { isActive: true, currentStock: 0 }
      }),
      prisma.$queryRaw<[{ total: number }]>`
        SELECT COALESCE(SUM(
          CASE 
            WHEN pv.price IS NOT NULL THEN pv.current_stock * pv.price
            ELSE pv.current_stock * p.base_price
          END
        ), 0) as total
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        WHERE pv.is_active = true AND p.is_active = true
      `
    ])

    return {
      totalProducts,
      totalVariants,
      lowStockCount: Number(lowStockCount[0]?.count ?? 0),
      outOfStockCount,
      totalStockValue: Number(totalStockValue[0]?.total ?? 0)
    }
  })
}

