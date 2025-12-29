import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

const categorySchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  description: z.string().optional()
})

export const categoriesRoutes: FastifyPluginAsync = async (app) => {
  // Listar categorías
  app.get('/', {
    schema: {
      description: 'Listar todas las categorías',
      tags: ['Categorías']
    }
  }, async (request) => {
    const onlyActive = (request.query as { active?: string }).active === 'true'
    
    const categories = await prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true } }
      }
    })

    return { categories }
  })

  // Obtener categoría por ID
  app.get('/:id', {
    schema: {
      description: 'Obtener categoría por ID',
      tags: ['Categorías']
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } }
      }
    })

    if (!category) {
      return reply.status(404).send({ error: true, message: 'Categoría no encontrada' })
    }

    return { category }
  })

  // Crear categoría
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear nueva categoría',
      tags: ['Categorías'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = categorySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const existing = await prisma.category.findUnique({ where: { name: parsed.data.name } })
    if (existing) {
      return reply.status(400).send({ error: true, message: 'Ya existe una categoría con ese nombre' })
    }

    const category = await prisma.category.create({
      data: parsed.data
    })

    return reply.status(201).send({ category })
  })

  // Actualizar categoría
  app.put('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Actualizar categoría',
      tags: ['Categorías'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const parsed = categorySchema.partial().safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data
    })

    return { category }
  })

  // Eliminar categoría (soft delete)
  app.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Eliminar categoría',
      tags: ['Categorías'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    // Verificar si tiene productos
    const productsCount = await prisma.product.count({ where: { categoryId: id } })
    if (productsCount > 0) {
      return reply.status(400).send({ 
        error: true, 
        message: `No se puede eliminar, tiene ${productsCount} productos asociados` 
      })
    }

    await prisma.category.update({
      where: { id },
      data: { isActive: false }
    })

    return { message: 'Categoría eliminada' }
  })
}

