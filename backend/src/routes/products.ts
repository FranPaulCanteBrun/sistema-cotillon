import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

const productSchema = z.object({
  code: z.string().min(1, 'Código requerido'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  categoryId: z.string().uuid('ID de categoría inválido'),
  supplierId: z.string().uuid().optional(),
  basePrice: z.number().positive('Precio debe ser positivo'),
  minStock: z.number().int().min(0).default(10)
})

const variantSchema = z.object({
  sku: z.string().min(1, 'SKU requerido'),
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.number().positive().optional(),
  barcode: z.string().optional()
})

export const productsRoutes: FastifyPluginAsync = async (app) => {
  // Listar productos con filtros y paginación
  app.get('/', {
    schema: {
      description: 'Listar productos con filtros',
      tags: ['Productos']
    }
  }, async (request) => {
    const query = request.query as {
      search?: string
      categoryId?: string
      active?: string
      page?: string
      limit?: string
    }

    const page = parseInt(query.page ?? '1')
    const limit = parseInt(query.limit ?? '20')
    const skip = (page - 1) * limit

    const where = {
      ...(query.active === 'true' && { isActive: true }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { code: { contains: query.search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              color: true,
              size: true,
              price: true,
              currentStock: true,
              barcode: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ])

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  })

  // Obtener producto por ID
  app.get('/:id', {
    schema: {
      description: 'Obtener producto por ID',
      tags: ['Productos']
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        variants: {
          orderBy: { sku: 'asc' }
        }
      }
    })

    if (!product) {
      return reply.status(404).send({ error: true, message: 'Producto no encontrado' })
    }

    return { product }
  })

  // Crear producto
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear nuevo producto',
      tags: ['Productos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = productSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const existing = await prisma.product.findUnique({ where: { code: parsed.data.code } })
    if (existing) {
      return reply.status(400).send({ error: true, message: 'Ya existe un producto con ese código' })
    }

    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        basePrice: parsed.data.basePrice
      },
      include: { category: true }
    })

    // Crear variante por defecto
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `${product.code}-DEF`,
        currentStock: 0
      }
    })

    return reply.status(201).send({ product })
  })

  // Actualizar producto
  app.put('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Actualizar producto',
      tags: ['Productos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const parsed = productSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const product = await prisma.product.update({
      where: { id },
      data: parsed.data,
      include: { category: true, variants: true }
    })

    return { product }
  })

  // Eliminar producto (soft delete)
  app.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Eliminar producto',
      tags: ['Productos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    })

    // También desactivar variantes
    await prisma.productVariant.updateMany({
      where: { productId: id },
      data: { isActive: false }
    })

    return { message: 'Producto eliminado' }
  })

  // ==================== VARIANTES ====================

  // Crear variante
  app.post('/:id/variants', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear variante de producto',
      tags: ['Productos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const parsed = variantSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    // Verificar producto existe
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return reply.status(404).send({ error: true, message: 'Producto no encontrado' })
    }

    // Verificar SKU único
    const existing = await prisma.productVariant.findUnique({ where: { sku: parsed.data.sku } })
    if (existing) {
      return reply.status(400).send({ error: true, message: 'Ya existe una variante con ese SKU' })
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: id,
        ...parsed.data,
        currentStock: 0
      }
    })

    return reply.status(201).send({ variant })
  })

  // Actualizar variante
  app.put('/variants/:variantId', {
    preHandler: [authenticate],
    schema: {
      description: 'Actualizar variante',
      tags: ['Productos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { variantId } = request.params as { variantId: string }
    
    const parsed = variantSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: parsed.data
    })

    return { variant }
  })

  // Eliminar variante
  app.delete('/variants/:variantId', {
    preHandler: [authenticate],
    schema: {
      description: 'Eliminar variante',
      tags: ['Productos'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { variantId } = request.params as { variantId: string }
    
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false }
    })

    return { message: 'Variante eliminada' }
  })
}

