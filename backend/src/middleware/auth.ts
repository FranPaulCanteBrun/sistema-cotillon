import { FastifyRequest, FastifyReply } from 'fastify'
import { UserRole } from '@prisma/client'

interface JWTPayload {
  id: string
  email: string
  role: UserRole
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: JWTPayload
  }
}

// Middleware de autenticación
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
    const hasAuthHeader = !!request.headers.authorization
    
    // Mensaje más descriptivo para debugging
    let message = 'No autorizado'
    if (!hasAuthHeader) {
      message = 'Token JWT no proporcionado. Incluye el header: Authorization: Bearer <token>'
    } else if (errorMessage.includes('expired')) {
      message = 'Token JWT expirado. Inicia sesión nuevamente'
    } else if (errorMessage.includes('invalid')) {
      message = 'Token JWT inválido. Verifica que el token sea correcto'
    }
    
    reply.status(401).send({ 
      error: true, 
      message,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      hint: hasAuthHeader 
        ? 'El token puede estar expirado o ser inválido. Intenta iniciar sesión nuevamente con POST /api/auth/login'
        : 'Incluye el header Authorization: Bearer <token> en la solicitud'
    })
  }
}

// Middleware de autorización por rol
export function authorize(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply)
    
    const user = request.user
    if (!user || !roles.includes(user.role)) {
      reply.status(403).send({ error: true, message: 'Acceso denegado' })
    }
  }
}

