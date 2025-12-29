import type { StockMovement } from '../entities/StockMovement'
import type { IPaginatedRepository } from './IRepository'
import type { PaginatedResponse, PaginationParams, DateRange, StockMovementType } from '@shared/types'

/**
 * Filtros para búsqueda de movimientos de stock
 */
export interface StockMovementFilters {
  variantId?: string
  userId?: string
  type?: StockMovementType
  dateRange?: DateRange
  referenceId?: string
}

/**
 * Interface del repositorio de Movimientos de Stock
 */
export interface IStockMovementRepository extends IPaginatedRepository<StockMovement> {
  /**
   * Obtiene movimientos de una variante
   */
  findByVariantId(variantId: string): Promise<StockMovement[]>

  /**
   * Obtiene movimientos de un usuario
   */
  findByUserId(userId: string): Promise<StockMovement[]>

  /**
   * Obtiene movimientos por tipo
   */
  findByType(type: StockMovementType): Promise<StockMovement[]>

  /**
   * Obtiene movimientos por rango de fechas
   */
  findByDateRange(dateRange: DateRange): Promise<StockMovement[]>

  /**
   * Busca movimientos con filtros y paginación
   */
  findWithFilters(
    filters: StockMovementFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<StockMovement>>

  /**
   * Obtiene el último movimiento de una variante
   */
  findLastByVariantId(variantId: string): Promise<StockMovement | null>

  /**
   * Obtiene movimientos asociados a una referencia (venta, etc.)
   */
  findByReferenceId(referenceId: string): Promise<StockMovement[]>
}

