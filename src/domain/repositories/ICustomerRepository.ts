import type { Customer } from '../entities/Customer'
import type { IPaginatedRepository } from './IRepository'
import type { PaginatedResponse, PaginationParams } from '@shared/types'

/**
 * Filtros para búsqueda de clientes
 */
export interface CustomerFilters {
  isActive?: boolean
  searchQuery?: string
}

/**
 * Interface del repositorio de Clientes
 */
export interface ICustomerRepository extends IPaginatedRepository<Customer> {
  /**
   * Busca un cliente por número de documento
   */
  findByDocumentNumber(documentNumber: string): Promise<Customer | null>

  /**
   * Busca clientes por email
   */
  findByEmail(email: string): Promise<Customer | null>

  /**
   * Obtiene todos los clientes activos
   */
  findAllActive(): Promise<Customer[]>

  /**
   * Busca clientes con filtros y paginación
   */
  findWithFilters(
    filters: CustomerFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Customer>>

  /**
   * Busca clientes por texto (nombre, documento, teléfono)
   */
  search(query: string, limit?: number): Promise<Customer[]>
}

