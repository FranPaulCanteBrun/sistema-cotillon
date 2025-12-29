/**
 * Exportaciones del sistema de errores
 */

export {
  AppError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ServerError,
  SyncError,
  DatabaseError,
  toAppError,
  getErrorMessage
} from './AppError'

export { ErrorBoundary } from './ErrorBoundary'

