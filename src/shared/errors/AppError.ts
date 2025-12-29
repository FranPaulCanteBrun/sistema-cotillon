/**
 * Sistema centralizado de manejo de errores
 */

/**
 * Clase base para errores de la aplicación
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * Obtiene un mensaje amigable para el usuario
   */
  getUserMessage(): string {
    return this.message
  }
}

/**
 * Error de red (sin conexión, timeout, etc.)
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Error de conexión', details?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, details)
  }

  getUserMessage(): string {
    if (this.message.includes('Failed to fetch') || this.message.includes('NetworkError')) {
      return 'No hay conexión a internet. Verifica tu conexión e intenta nuevamente.'
    }
    if (this.message.includes('timeout') || this.message.includes('aborted')) {
      return 'La solicitud tardó demasiado. Verifica tu conexión e intenta nuevamente.'
    }
    return 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.'
  }
}

/**
 * Error de autenticación (401, token inválido, etc.)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'No autenticado', details?: unknown) {
    super(message, 'AUTH_ERROR', 401, details)
  }

  getUserMessage(): string {
    if (this.message.includes('token') || this.message.includes('expired')) {
      return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
    }
    return 'No tienes permisos para realizar esta acción. Por favor, inicia sesión.'
  }
}

/**
 * Error de autorización (403, sin permisos)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Sin permisos', details?: unknown) {
    super(message, 'AUTHORIZATION_ERROR', 403, details)
  }

  getUserMessage(): string {
    return 'No tienes permisos suficientes para realizar esta acción.'
  }
}

/**
 * Error de validación (400, datos inválidos)
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Datos inválidos',
    public readonly fields?: Record<string, string[]>,
    details?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }

  getUserMessage(): string {
    if (this.fields && Object.keys(this.fields).length > 0) {
      const fieldErrors = Object.entries(this.fields)
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
        .join('. ')
      return `Errores de validación: ${fieldErrors}`
    }
    return this.message || 'Los datos proporcionados no son válidos. Verifica e intenta nuevamente.'
  }
}

/**
 * Error de recurso no encontrado (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado', details?: unknown) {
    super(message, 'NOT_FOUND', 404, details)
  }

  getUserMessage(): string {
    return this.message || 'El recurso solicitado no fue encontrado.'
  }
}

/**
 * Error del servidor (500, 502, 503, etc.)
 */
export class ServerError extends AppError {
  constructor(message: string = 'Error del servidor', statusCode: number = 500, details?: unknown) {
    super(message, 'SERVER_ERROR', statusCode, details)
  }

  getUserMessage(): string {
    if (this.statusCode === 503) {
      return 'El servidor está temporalmente no disponible. Intenta nuevamente en unos momentos.'
    }
    if (this.statusCode === 502 || this.statusCode === 504) {
      return 'El servidor no está respondiendo. Intenta nuevamente más tarde.'
    }
    return 'Ocurrió un error en el servidor. Si el problema persiste, contacta al soporte.'
  }
}

/**
 * Error de sincronización
 */
export class SyncError extends AppError {
  constructor(message: string = 'Error de sincronización', details?: unknown) {
    super(message, 'SYNC_ERROR', undefined, details)
  }

  getUserMessage(): string {
    return 'Error al sincronizar datos. Los cambios se guardaron localmente y se sincronizarán cuando haya conexión.'
  }
}

/**
 * Error de base de datos local
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Error de base de datos', details?: unknown) {
    super(message, 'DATABASE_ERROR', undefined, details)
  }

  getUserMessage(): string {
    return 'Error al acceder a los datos locales. Intenta recargar la página.'
  }
}

/**
 * Función helper para convertir errores desconocidos a AppError
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    // Errores de red
    if (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('Network request failed')
    ) {
      return new NetworkError(error.message)
    }

    // Timeout
    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return new NetworkError('La solicitud tardó demasiado')
    }

    // Error genérico
    return new AppError(error.message, 'UNKNOWN_ERROR')
  }

  // Error desconocido
  return new AppError('Ocurrió un error inesperado', 'UNKNOWN_ERROR', undefined, error)
}

/**
 * Función helper para obtener mensaje de error amigable
 */
export function getErrorMessage(error: unknown): string {
  const appError = toAppError(error)
  return appError.getUserMessage()
}

