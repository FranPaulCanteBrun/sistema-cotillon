import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from './config/env.js'
import { prisma } from './config/database.js'

// Importar rutas
import { authRoutes } from './routes/auth.js'
import { categoriesRoutes } from './routes/categories.js'
import { productsRoutes } from './routes/products.js'
import { salesRoutes } from './routes/sales.js'
import { stockRoutes } from './routes/stock.js'
import { paymentMethodsRoutes } from './routes/payment-methods.js'
import { syncRoutes } from './routes/sync.js'
import { mercadoPagoRoutes } from './routes/mercadopago.js'
import { invoicingRoutes } from './routes/invoicing.js'
import { usersRoutes } from './routes/users.js'
import { customersRoutes } from './routes/customers.js'
import { suppliersRoutes } from './routes/suppliers.js'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    transport: env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
})

// Plugins
await app.register(cors, {
  origin: true, // En producción, especificar dominios permitidos
  credentials: true
})

await app.register(jwt, {
  secret: env.JWT_SECRET
})

// Swagger (documentación API)
await app.register(swagger, {
  openapi: {
    info: {
      title: 'Cotillón Manager API',
      description: 'API para gestión de stock y ventas de tienda de cotillón',
      version: '1.0.0'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
})

await app.register(swaggerUi, {
  routePrefix: '/docs'
})

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Registrar rutas
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(categoriesRoutes, { prefix: '/api/categories' })
await app.register(productsRoutes, { prefix: '/api/products' })
await app.register(salesRoutes, { prefix: '/api/sales' })
await app.register(stockRoutes, { prefix: '/api/stock' })
await app.register(paymentMethodsRoutes, { prefix: '/api/payment-methods' })
await app.register(syncRoutes, { prefix: '/api/sync' })
await app.register(mercadoPagoRoutes, { prefix: '/api/mercadopago' })
await app.register(invoicingRoutes, { prefix: '/api/invoices' })
await app.register(usersRoutes, { prefix: '/api/users' })
await app.register(customersRoutes, { prefix: '/api/customers' })
await app.register(suppliersRoutes, { prefix: '/api/suppliers' })

// Manejo de errores global
app.setErrorHandler((error, request, reply) => {
  app.log.error(error)
  
  const statusCode = error.statusCode ?? 500
  const message = statusCode === 500 ? 'Error interno del servidor' : error.message

  reply.status(statusCode).send({
    error: true,
    message,
    statusCode
  })
})

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Cerrando servidor...')
  await prisma.$disconnect()
  await app.close()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Iniciar servidor
const start = async () => {
  try {
    // Verificar conexión a DB
    await prisma.$connect()
    console.log('✅ Conectado a PostgreSQL')

    await app.listen({ port: env.PORT, host: env.HOST })
    console.log(`🚀 Servidor corriendo en http://${env.HOST}:${env.PORT}`)
    console.log(`📚 Documentación API: http://${env.HOST}:${env.PORT}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

