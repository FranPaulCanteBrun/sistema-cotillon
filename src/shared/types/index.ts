/**
 * Tipos compartidos a través de toda la aplicación
 */

/**
 * Resultado de una operación que puede fallar
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Estado de sincronización de una entidad
 */
export type SyncStatus = 'pending' | 'synced' | 'error' | 'conflict'

/**
 * Entidad base con campos de auditoría
 */
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page: number
  limit: number
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * Filtros de fecha
 */
export interface DateRange {
  from: Date
  to: Date
}

/**
 * Opciones de ordenamiento
 */
export interface SortOptions<T> {
  field: keyof T
  direction: 'asc' | 'desc'
}

/**
 * Estado de la conexión
 */
export type ConnectionStatus = 'online' | 'offline' | 'syncing'

/**
 * Rol de usuario
 */
export type UserRole = 'admin' | 'seller' | 'viewer'

/**
 * Tipo de movimiento de stock
 */
export type StockMovementType = 
  | 'sale'           // Venta
  | 'purchase'       // Compra/Ingreso
  | 'adjustment'     // Ajuste manual
  | 'return'         // Devolución
  | 'transfer'       // Transferencia
  | 'damage'         // Daño/Pérdida

/**
 * Estado de una venta
 */
export type SaleStatus = 
  | 'pending'        // Pendiente (en proceso)
  | 'completed'      // Completada
  | 'cancelled'      // Cancelada
  | 'refunded'       // Reembolsada

/**
 * Tipo de método de pago
 */
export type PaymentMethodType = 
  | 'cash'           // Efectivo
  | 'debit'          // Tarjeta de débito
  | 'credit'         // Tarjeta de crédito
  | 'transfer'       // Transferencia bancaria
  | 'qr'             // Pago QR (Mercado Pago, etc.)
  | 'other'          // Otro

