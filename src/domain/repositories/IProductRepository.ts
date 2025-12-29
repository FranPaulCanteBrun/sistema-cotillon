import type { Product } from '../entities/Product'
import type { IPaginatedRepository } from './IRepository'
import type { PaginatedResponse, PaginationParams } from '@shared/types'

/**
 * Filtros para búsqueda de productos
 */
export interface ProductFilters {
  categoryId?: string
  supplierId?: string
  isActive?: boolean
  searchQuery?: string
  lowStock?: boolean  // Productos con stock por debajo del mínimo
}

/**
 * Interface del repositorio de Productos
 */
export interface IProductRepository extends IPaginatedRepository<Product> {
  /**
   * Busca un producto por código
   */
  findByCode(code: string): Promise<Product | null>

  /**
   * Obtiene productos por categoría
   */
  findByCategory(categoryId: string): Promise<Product[]>

  /**
   * Obtiene productos por proveedor
   */
  findBySupplier(supplierId: string): Promise<Product[]>

  /**
   * Obtiene todos los productos activos
   */
  findAllActive(): Promise<Product[]>

  /**
   * Busca productos con filtros y paginación
   */
  findWithFilters(
    filters: ProductFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Product>>

  /**
   * Busca productos por texto (código, nombre, descripción)
   */
  search(query: string, limit?: number): Promise<Product[]>
}

