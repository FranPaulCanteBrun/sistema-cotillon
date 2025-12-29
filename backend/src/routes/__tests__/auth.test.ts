/**
 * Tests para las rutas de autenticación
 * 
 * NOTA: Estos tests requieren una base de datos PostgreSQL configurada.
 * Para ejecutarlos, asegúrate de tener:
 * 1. PostgreSQL corriendo
 * 2. Variable DATABASE_URL configurada en .env
 * 3. Base de datos creada y migraciones ejecutadas
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { authRoutes } from '../auth.js'
import { PrismaClient } from '@prisma/client'

// Crear instancia de Prisma para tests
const prisma = new PrismaClient({
  log: ['error']
})

describe('Auth Routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = Fastify()
    
    // Registrar plugins necesarios
    await app.register(cors, {
      origin: true,
      credentials: true
    })
    
    await app.register(jwt, {
      secret: 'test-secret-key-for-testing-only-minimum-32-characters'
    })
    
    await app.register(authRoutes, { prefix: '/api/auth' })
    await app.ready()
  })

  afterEach(async () => {
    // Limpiar datos de prueba
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['test@example.com', 'duplicate@example.com', 'login@example.com']
          }
        }
      })
    } catch (error) {
      // Ignorar errores de limpieza
    }
    await app.close()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/register', () => {
    it('debe registrar un nuevo usuario', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'seller'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('token')
      expect(body).toHaveProperty('user')
      expect(body.user.email).toBe('test@example.com')
    })

    it('debe rechazar registro con email duplicado', async () => {
      // Primera solicitud
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Test User',
          email: 'duplicate@example.com',
          password: 'password123',
          role: 'seller'
        }
      })

      // Segunda solicitud con el mismo email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Another User',
          email: 'duplicate@example.com',
          password: 'password123',
          role: 'seller'
        }
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toBe(true)
    })
  })

  describe('POST /api/auth/login', () => {
    it('debe hacer login con credenciales válidas', async () => {
      // Primero registrar un usuario
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          name: 'Test User',
          email: 'login@example.com',
          password: 'password123',
          role: 'seller'
        }
      })

      // Luego hacer login
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'password123'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('token')
      expect(body).toHaveProperty('user')
    })

    it('debe rechazar login con credenciales inválidas', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe(true)
    })
  })
})
