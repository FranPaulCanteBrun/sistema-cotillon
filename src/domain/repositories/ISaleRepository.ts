import type { Sale } from '../entities/Sale'
import type { IPaginatedRepository } from './IRepository'
import type { PaginatedResponse, PaginationParams, DateRange, SaleStatus } from '@shared/types'

/**
 * Filtros para búsqueda de ventas
 */
export interface SaleFilters {
  userId?: string
  customerId?: string
  paymentMethodId?: string
  status?: SaleStatus
  dateRange?: DateRange
  receiptNumber?: string
}

/**
 * Resumen de ventas para un período
 */
export interface SalesSummary {
  totalSales: number
  totalAmount: number
  averageAmount: number
  totalItems: number
  byPaymentMethod: Array<{
    paymentMethodId: string
    paymentMethodType: string
    count: number
    total: number
  }>
  byStatus: Array<{
    status: SaleStatus
    count: number
    total: number
  }>
}

/**
 * Interface del repositorio de Ventas
 */
export interface ISaleRepository extends IPaginatedRepository<Sale> {
  /**
   * Busca una venta por número de comprobante
   */
  findByReceiptNumber(receiptNumber: string): Promise<Sale | null>

  /**
   * Obtiene las ventas de un usuario
   */
  findByUserId(userId: string): Promise<Sale[]>

  /**
   * Obtiene las ventas de un cliente
   */
  findByCustomerId(customerId: string): Promise<Sale[]>

  /**
   * Obtiene ventas por rango de fechas
   */
  findByDateRange(dateRange: DateRange): Promise<Sale[]>

  /**
   * Busca ventas con filtros y paginación
   */
  findWithFilters(
    filters: SaleFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Sale>>

  /**
   * Obtiene el resumen de ventas para un período
   */
  getSummary(dateRange: DateRange): Promise<SalesSummary>

  /**
   * Obtiene las últimas N ventas
   */
  findRecent(limit: number): Promise<Sale[]>

  /**
   * Genera el siguiente número de comprobante
   */
  getNextReceiptNumber(): Promise<string>

  /**
   * Obtiene las ventas del día actual
   */
  findToday(): Promise<Sale[]>
}

