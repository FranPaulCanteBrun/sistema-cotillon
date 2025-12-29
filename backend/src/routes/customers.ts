import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true)
})

const updateCustomerSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
})

export const customersRoutes: FastifyPluginAsync = async (app) => {
  // Listar clientes
  app.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Listar todos los clientes',
      tags: ['Clientes'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    const onlyActive = (request.query as { active?: string }).active === 'true'
    
    const customers = await prisma.customer.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        documentNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true
          }
        }
      }
    })

    return { customers }
  })

  // Obtener cliente por ID
  app.get('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener cliente por ID',
      tags: ['Clientes'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        documentNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true
          }
        }
      }
    })

    if (!customer) {
      return reply.status(404).send({ error: true, message: 'Cliente no encontrado' })
    }

    return { customer }
  })

  // Crear cliente
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear nuevo cliente',
      tags: ['Clientes'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = createCustomerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const data = parsed.data

    // Verificar que el documento no exista si se proporciona
    if (data.documentNumber) {
      const existing = await prisma.customer.findUnique({
        where: { documentNumber: data.documentNumber }
      })
      if (existing) {
        return reply.status(400).send({ error: true, message: 'Ya existe un cliente con ese número de documento' })
      }
    }

    // Verificar que el email no exista si se proporciona
    if (data.email) {
      const existing = await prisma.customer.findFirst({
        where: { email: data.email }
      })
      if (existing) {
        return reply.status(400).send({ error: true, message: 'Ya existe un cliente con ese email' })
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        documentNumber: data.documentNumber || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true
      },
      select: {
        id: true,
        name: true,
        documentNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return reply.status(201).send({ customer })
  })

  // Actualizar cliente
  app.put('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Actualizar cliente',
      tags: ['Clientes'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = updateCustomerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) {
      return reply.status(404).send({ error: true, message: 'Cliente no encontrado' })
    }

    const updateData: any = { ...parsed.data }

    // Si se actualiza el documento, verificar que no exista
    if (updateData.documentNumber && updateData.documentNumber !== customer.documentNumber) {
      const existing = await prisma.customer.findUnique({
        where: { documentNumber: updateData.documentNumber }
      })
      if (existing) {
        return reply.status(400).send({ error: true, message: 'Ya existe un cliente con ese número de documento' })
      }
    }

    // Si se actualiza el email, verificar que no exista
    if (updateData.email && updateData.email !== customer.email) {
      const existing = await prisma.customer.findFirst({
        where: { email: updateData.email }
      })
      if (existing) {
        return reply.status(400).send({ error: true, message: 'Ya existe un cliente con ese email' })
      }
    }

    // Convertir strings vacíos a null
    if (updateData.email === '') updateData.email = null
    if (updateData.documentNumber === '') updateData.documentNumber = null
    if (updateData.phone === '') updateData.phone = null
    if (updateData.address === '') updateData.address = null
    if (updateData.notes === '') updateData.notes = null

    const updated = await prisma.customer.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        documentNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return { customer: updated }
  })

  // Eliminar cliente (soft delete - desactivar)
  app.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Desactivar cliente',
      tags: ['Clientes'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) {
      return reply.status(404).send({ error: true, message: 'Cliente no encontrado' })
    }

    // Soft delete - solo desactivar
    const updated = await prisma.customer.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        documentNumber: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return { customer: updated }
  })

  // Eliminar cliente permanentemente (hard delete)
  app.delete('/:id/permanent', {
    preHandler: [authenticate],
    schema: {
      description: 'Eliminar cliente permanentemente',
      tags: ['Clientes'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) {
      return reply.status(404).send({ error: true, message: 'Cliente no encontrado' })
    }

    // Hard delete - eliminar permanentemente
    await prisma.customer.delete({
      where: { id }
    })

    return { message: 'Cliente eliminado permanentemente' }
  })
}

