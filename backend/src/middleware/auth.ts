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
    reply.status(401).send({ error: true, message: 'No autorizado' })
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

