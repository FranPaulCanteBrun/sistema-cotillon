import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

const createSupplierSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true)
})

const updateSupplierSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional()
})

export const suppliersRoutes: FastifyPluginAsync = async (app) => {
  // Listar proveedores
  app.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Listar todos los proveedores',
      tags: ['Proveedores'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    const onlyActive = (request.query as { active?: string }).active === 'true'
    
    const suppliers = await prisma.supplier.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    return { suppliers }
  })

  // Obtener proveedor por ID
  app.get('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener proveedor por ID',
      tags: ['Proveedores'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    if (!supplier) {
      return reply.status(404).send({ error: true, message: 'Proveedor no encontrado' })
    }

    return { supplier }
  })

  // Crear proveedor
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear nuevo proveedor',
      tags: ['Proveedores'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const parsed = createSupplierSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const data = parsed.data

    // Verificar que el nombre no exista
    const existing = await prisma.supplier.findUnique({
      where: { name: data.name }
    })
    if (existing) {
      return reply.status(400).send({ error: true, message: 'Ya existe un proveedor con ese nombre' })
    }

    // Verificar que el email no exista si se proporciona
    if (data.email) {
      const existingEmail = await prisma.supplier.findFirst({
        where: { email: data.email }
      })
      if (existingEmail) {
        return reply.status(400).send({ error: true, message: 'Ya existe un proveedor con ese email' })
      }
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        isActive: data.isActive ?? true
      },
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return reply.status(201).send({ supplier })
  })

  // Actualizar proveedor
  app.put('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Actualizar proveedor',
      tags: ['Proveedores'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = updateSupplierSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return reply.status(404).send({ error: true, message: 'Proveedor no encontrado' })
    }

    const updateData: any = { ...parsed.data }

    // Si se actualiza el nombre, verificar que no exista
    if (updateData.name && updateData.name !== supplier.name) {
      const existing = await prisma.supplier.findUnique({
        where: { name: updateData.name }
      })
      if (existing) {
        return reply.status(400).send({ error: true, message: 'Ya existe un proveedor con ese nombre' })
      }
    }

    // Si se actualiza el email, verificar que no exista
    if (updateData.email && updateData.email !== supplier.email) {
      const existing = await prisma.supplier.findFirst({
        where: { email: updateData.email }
      })
      if (existing) {
        return reply.status(400).send({ error: true, message: 'Ya existe un proveedor con ese email' })
      }
    }

    // Convertir strings vacíos a null
    if (updateData.email === '') updateData.email = null
    if (updateData.contactName === '') updateData.contactName = null
    if (updateData.phone === '') updateData.phone = null
    if (updateData.address === '') updateData.address = null
    if (updateData.notes === '') updateData.notes = null

    const updated = await prisma.supplier.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return { supplier: updated }
  })

  // Eliminar proveedor (soft delete - desactivar)
  app.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Desactivar proveedor',
      tags: ['Proveedores'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return reply.status(404).send({ error: true, message: 'Proveedor no encontrado' })
    }

    // Soft delete - solo desactivar
    const updated = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        contactName: true,
        phone: true,
        email: true,
        address: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return { supplier: updated }
  })

  // Eliminar proveedor permanentemente (hard delete)
  app.delete('/:id/permanent', {
    preHandler: [authenticate],
    schema: {
      description: 'Eliminar proveedor permanentemente',
      tags: ['Proveedores'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) {
      return reply.status(404).send({ error: true, message: 'Proveedor no encontrado' })
    }

    // Hard delete - eliminar permanentemente
    await prisma.supplier.delete({
      where: { id }
    })

    return { message: 'Proveedor eliminado permanentemente' }
  })
}

