import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../config/database.js'
import { authenticate } from '../middleware/auth.js'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres')
})

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres')
})

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Login
  app.post('/login', {
    schema: {
      description: 'Iniciar sesión',
      tags: ['Auth'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        },
        required: ['email', 'password']
      }
    }
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return reply.status(401).send({ error: true, message: 'Credenciales inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      return reply.status(401).send({ error: true, message: 'Credenciales inválidas' })
    }

    // Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // Generar JWT
    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    }, { expiresIn: '7d' })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  })

  // Registro (solo para admins o primer usuario)
  app.post('/register', {
    schema: {
      description: 'Registrar nuevo usuario',
      tags: ['Auth'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 2 }
        },
        required: ['email', 'password', 'name']
      }
    }
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { email, password, name } = parsed.data

    // Verificar si ya existe
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(400).send({ error: true, message: 'El email ya está registrado' })
    }

    // Verificar si es el primer usuario (será admin)
    const userCount = await prisma.user.count()
    const role = userCount === 0 ? 'ADMIN' : 'SELLER'

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role
      }
    })

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role
    }, { expiresIn: '7d' })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  })

  // Obtener usuario actual
  app.get('/me', {
    preHandler: [authenticate],
    schema: {
      description: 'Obtener información del usuario actual',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        createdAt: true
      }
    })

    return { user }
  })

  // Cambiar contraseña
  app.put('/password', {
    preHandler: [authenticate],
    schema: {
      description: 'Cambiar contraseña',
      tags: ['Auth'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request, reply) => {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(6)
    })

    const parsed = schema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: true, message: parsed.error.errors[0]?.message })
    }

    const { currentPassword, newPassword } = parsed.data

    const user = await prisma.user.findUnique({ where: { id: request.user.id } })
    if (!user) {
      return reply.status(404).send({ error: true, message: 'Usuario no encontrado' })
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!validPassword) {
      return reply.status(400).send({ error: true, message: 'Contraseña actual incorrecta' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    })

    return { message: 'Contraseña actualizada correctamente' }
  })
}

