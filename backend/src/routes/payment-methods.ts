import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'
import { PaymentMethodType } from '@prisma/client'

const paymentMethodSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'QR', 'OTHER']),
  isActive: z.boolean().optional(),
  config: z.record(z.unknown()).optional()
})

export const paymentMethodsRoutes: FastifyPluginAsync = async (app) => {
  // Listar métodos de pago
  app.get('/', {
    schema: {
      description: 'Listar métodos de pago',
      tags: ['Métodos de Pago']
    }
  }, async (request) => {
    const onlyActive = (request.query as { active?: string }).active === 'true'
    
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' }
    })

    return { paymentMethods }
  })

  // Obtener método de pago
  app.get('/:id', {
    schema: {
      description: 'Obtener método de pago',
      tags: ['Métodos de Pago']
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id }
    })

    if (!paymentMethod) {
      return reply.status(404).send({ error: true, message: 'Método de pago no encontrado' })
    }

    return { paymentMethod }
  })

  // Crear método de pago
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear método de pago',
      tags: ['Métodos de Pago'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = paymentMethodSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const existing = await prisma.paymentMethod.findUnique({ where: { name: parsed.data.name } })
    if (existing) {
      return reply.status(400).send({ error: true, message: 'Ya existe un método con ese nombre' })
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type as PaymentMethodType,
        isActive: parsed.data.isActive ?? true,
        config: parsed.data.config ?? {}
      }
    })

    return reply.status(201).send({ paymentMethod })
  })

  // Actualizar método de pago
  app.put('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Actualizar método de pago',
      tags: ['Métodos de Pago'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const parsed = paymentMethodSchema.partial().safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: parsed.data
    })

    return { paymentMethod }
  })

  // Activar/desactivar método de pago
  app.patch('/:id/toggle', {
    preHandler: [authenticate],
    schema: {
      description: 'Activar/desactivar método de pago',
      tags: ['Métodos de Pago'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const current = await prisma.paymentMethod.findUnique({ where: { id } })
    if (!current) {
      return reply.status(404).send({ error: true, message: 'Método de pago no encontrado' })
    }

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: { isActive: !current.isActive }
    })

    return { paymentMethod }
  })

  // Eliminar método de pago
  app.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Eliminar método de pago',
      tags: ['Métodos de Pago'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    // Verificar si tiene ventas asociadas
    const salesCount = await prisma.sale.count({ where: { paymentMethodId: id } })
    if (salesCount > 0) {
      return reply.status(400).send({ 
        error: true, 
        message: `No se puede eliminar, tiene ${salesCount} ventas asociadas. Desactívalo en su lugar.`
      })
    }

    await prisma.paymentMethod.delete({ where: { id } })

    return { message: 'Método de pago eliminado' }
  })
}

