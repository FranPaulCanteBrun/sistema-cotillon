import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

// Esquema para operación de sincronización
const syncOperationSchema = z.object({
  id: z.string().uuid(),
  operation: z.enum(['create', 'update', 'delete']),
  tableName: z.string(),
  recordId: z.string(),
  data: z.record(z.unknown()).nullable(),
  timestamp: z.string().datetime()
})

const syncPullSchema = z.object({
  deviceId: z.string(),
  lastSyncAt: z.string().datetime().nullable().optional()
})

const syncPushSchema = z.object({
  deviceId: z.string(),
  operations: z.array(syncOperationSchema)
})

export const syncRoutes: FastifyPluginAsync = async (app) => {
  // Pull: obtener cambios desde el servidor
  app.post('/pull', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener cambios desde el servidor',
      tags: ['Sincronización'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = syncPullSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { deviceId, lastSyncAt } = parsed.data
    const since = lastSyncAt ? new Date(lastSyncAt) : new Date(0)

    // Obtener cambios de cada tabla desde lastSyncAt
    const [categories, products, variants, paymentMethods] = await Promise.all([
      prisma.category.findMany({
        where: { updatedAt: { gt: since } }
      }),
      prisma.product.findMany({
        where: { updatedAt: { gt: since } },
        include: { category: { select: { name: true } } }
      }),
      prisma.productVariant.findMany({
        where: { updatedAt: { gt: since } }
      }),
      prisma.paymentMethod.findMany({
        where: { updatedAt: { gt: since } }
      })
    ])

    // Registrar sync log
    await prisma.syncLog.create({
      data: {
        deviceId,
        operation: 'pull',
        tableName: 'all',
        recordId: 'pull-all',
        status: 'SYNCED',
        syncedAt: new Date()
      }
    })

    return {
      syncedAt: new Date().toISOString(),
      changes: {
        categories,
        products,
        variants,
        paymentMethods
      }
    }
  })

  // Push: enviar cambios al servidor
  app.post('/push', {
    preHandler: [authenticate],
    schema: {
      description: 'Enviar cambios al servidor',
      tags: ['Sincronización'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = syncPushSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { deviceId, operations } = parsed.data
    const results: Array<{ id: string; status: 'success' | 'error'; error?: string }> = []

    for (const op of operations) {
      try {
        // Procesar operación según tabla
        await processOperation(op)
        
        // Registrar éxito
        await prisma.syncLog.create({
          data: {
            deviceId,
            operation: op.operation,
            tableName: op.tableName,
            recordId: op.recordId,
            data: op.data,
            status: 'SYNCED',
            syncedAt: new Date()
          }
        })

        results.push({ id: op.id, status: 'success' })
      } catch (error) {
        // Registrar error
        await prisma.syncLog.create({
          data: {
            deviceId,
            operation: op.operation,
            tableName: op.tableName,
            recordId: op.recordId,
            data: op.data,
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Error desconocido'
          }
        })

        results.push({ 
          id: op.id, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Error desconocido'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return {
      message: `Procesadas ${operations.length} operaciones. ${successCount} exitosas, ${errorCount} con error.`,
      results
    }
  })

  // Estado de sincronización
  app.get('/status', {
    preHandler: [authenticate],
    schema: {
      description: 'Estado de sincronización del dispositivo',
      tags: ['Sincronización'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    const deviceId = (request.query as { deviceId?: string }).deviceId

    const [pendingCount, lastSync, errors] = await Promise.all([
      prisma.syncLog.count({
        where: {
          ...(deviceId && { deviceId }),
          status: 'PENDING'
        }
      }),
      prisma.syncLog.findFirst({
        where: {
          ...(deviceId && { deviceId }),
          status: 'SYNCED'
        },
        orderBy: { syncedAt: 'desc' }
      }),
      prisma.syncLog.findMany({
        where: {
          ...(deviceId && { deviceId }),
          status: 'ERROR'
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    return {
      pendingOperations: pendingCount,
      lastSyncAt: lastSync?.syncedAt ?? null,
      recentErrors: errors
    }
  })

  // Limpiar logs de sync antiguos
  app.delete('/logs/cleanup', {
    preHandler: [authenticate],
    schema: {
      description: 'Limpiar logs de sincronización antiguos',
      tags: ['Sincronización'],
      security: [{ bearerAuth: [] }]
    }
  }, async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const deleted = await prisma.syncLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: ['SYNCED', 'ERROR'] }
      }
    })

    return { 
      message: `${deleted.count} registros de sincronización eliminados`,
      deletedCount: deleted.count
    }
  })
}

// Función auxiliar para procesar operaciones
async function processOperation(op: z.infer<typeof syncOperationSchema>) {
  const { operation, tableName, recordId, data } = op

  switch (tableName) {
    case 'categories':
      return processCategory(operation, recordId, data)
    case 'products':
      return processProduct(operation, recordId, data)
    case 'productVariants':
      return processVariant(operation, recordId, data)
    case 'sales':
      return processSale(operation, recordId, data)
    case 'stockMovements':
      return processStockMovement(operation, recordId, data)
    default:
      throw new Error(`Tabla no soportada: ${tableName}`)
  }
}

async function processCategory(operation: string, id: string, data: Record<string, unknown> | null) {
  if (operation === 'delete') {
    await prisma.category.update({ where: { id }, data: { isActive: false } })
    return
  }

  if (operation === 'create') {
    await prisma.category.upsert({
      where: { id },
      create: { id, ...(data as { name: string; description?: string }) },
      update: data as { name?: string; description?: string }
    })
    return
  }

  if (operation === 'update' && data) {
    await prisma.category.update({ where: { id }, data: data as { name?: string; description?: string } })
  }
}

async function processProduct(operation: string, id: string, data: Record<string, unknown> | null) {
  if (operation === 'delete') {
    await prisma.product.update({ where: { id }, data: { isActive: false } })
    return
  }

  if ((operation === 'create' || operation === 'update') && data) {
    const productData = data as {
      code?: string
      name?: string
      description?: string
      categoryId?: string
      basePrice?: number
      minStock?: number
    }

    await prisma.product.upsert({
      where: { id },
      create: { id, ...productData, basePrice: productData.basePrice ?? 0 },
      update: productData
    })
  }
}

async function processVariant(operation: string, id: string, data: Record<string, unknown> | null) {
  if (operation === 'delete') {
    await prisma.productVariant.update({ where: { id }, data: { isActive: false } })
    return
  }

  if ((operation === 'create' || operation === 'update') && data) {
    const variantData = data as {
      productId?: string
      sku?: string
      color?: string
      size?: string
      price?: number
      currentStock?: number
      barcode?: string
    }

    await prisma.productVariant.upsert({
      where: { id },
      create: { id, ...variantData, sku: variantData.sku ?? id, productId: variantData.productId ?? '' },
      update: variantData
    })
  }
}

async function processSale(operation: string, id: string, data: Record<string, unknown> | null) {
  // Las ventas generalmente solo se crean desde dispositivos
  if (operation === 'create' && data) {
    // Aquí se podría implementar la creación de venta desde sync
    // Por ahora, solo registramos que llegó
    console.log('Sync sale create:', id, data)
  }
  
  if (operation === 'update' && data) {
    const status = data.status as 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | undefined
    if (status) {
      await prisma.sale.update({ where: { id }, data: { status } })
    }
  }
}

async function processStockMovement(operation: string, id: string, data: Record<string, unknown> | null) {
  if (operation === 'create' && data) {
    const movementData = data as {
      variantId: string
      userId: string
      type: 'ENTRY' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'LOSS'
      quantity: number
      previousStock: number
      newStock: number
      reason?: string
      referenceId?: string
    }

    await prisma.stockMovement.upsert({
      where: { id },
      create: { id, ...movementData },
      update: {}
    })

    // Actualizar stock de variante
    await prisma.productVariant.update({
      where: { id: movementData.variantId },
      data: { currentStock: movementData.newStock }
    })
  }
}

