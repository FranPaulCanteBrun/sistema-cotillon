import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

const createUserSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER'], {
    errorMap: () => ({ message: 'Rol inválido. Debe ser ADMIN, MANAGER o SELLER' })
  }),
  isActive: z.boolean().optional().default(true)
})

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SELLER']).optional(),
  isActive: z.boolean().optional()
})

export const usersRoutes: FastifyPluginAsync = async (app) => {
  // Listar usuarios
  app.get('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Listar todos los usuarios',
      tags: ['Usuarios'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    const onlyActive = (request.query as { active?: string }).active === 'true'
    
    const users = await prisma.user.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
            stockMovements: true
          }
        }
      }
    })

    return { users }
  })

  // Obtener usuario por ID
  app.get('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener usuario por ID',
      tags: ['Usuarios'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sales: true,
            stockMovements: true
          }
        }
      }
    })

    if (!user) {
      return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })
    }

    return { user }
  })

  // Crear usuario
  app.post('/', {
    preHandler: [authenticate],
    schema: {
      description: 'Crear nuevo usuario',
      tags: ['Usuarios'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    // Solo administradores pueden crear usuarios
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: true, message: 'Solo los administradores pueden crear usuarios' })
    }

    const parsed = createUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { password, ...userData } = parsed.data

    // Verificar que el email no exista
    const existing = await prisma.user.findUnique({ where: { email: userData.email } })
    if (existing) {
      return reply.status(400).send({ error: true, message: 'Ya existe un usuario con ese email' })
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return reply.status(201).send({ user })
  })

  // Actualizar usuario
  app.put('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Actualizar usuario',
      tags: ['Usuarios'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const currentUser = request.user

    // Solo administradores pueden actualizar usuarios, o el propio usuario puede actualizar su perfil
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      return reply.status(403).send({ error: true, message: 'No tienes permisos para actualizar este usuario' })
    }

    const parsed = updateUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })
    }

    // Si el usuario no es admin, no puede cambiar el rol ni el estado activo
    const updateData: any = { ...parsed.data }
    if (currentUser.role !== 'ADMIN') {
      delete updateData.role
      delete updateData.isActive
    }

    // Si se actualiza el email, verificar que no exista
    if (updateData.email && updateData.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: updateData.email } })
      if (existing) {
        return reply.status(400).send({ error: true, message: 'Ya existe un usuario con ese email' })
      }
    }

    // Si se actualiza la contraseña, hashearla
    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10)
      delete updateData.password
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return { user: updated }
  })

  // Eliminar usuario (soft delete - desactivar)
  app.delete('/:id', {
    preHandler: [authenticate],
    schema: {
      description: 'Desactivar usuario',
      tags: ['Usuarios'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    // Solo administradores pueden desactivar usuarios
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: true, message: 'Solo los administradores pueden desactivar usuarios' })
    }

    const { id } = request.params as { id: string }

    // No permitir desactivarse a sí mismo
    if (request.user.id === id) {
      return reply.status(400).send({ error: true, message: 'No puedes desactivar tu propio usuario' })
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })
    }

    // Soft delete - solo desactivar
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return { user: updated }
  })
}

