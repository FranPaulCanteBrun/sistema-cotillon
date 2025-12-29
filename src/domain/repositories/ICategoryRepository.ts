import type { Category } from '../entities/Category'
import type { IRepository } from './IRepository'

/**
 * Interface del repositorio de Categorías
 */
export interface ICategoryRepository extends IRepository<Category> {
  /**
   * Busca una categoría por nombre (case-insensitive)
   */
  findByName(name: string): Promise<Category | null>

  /**
   * Obtiene todas las categorías activas
   */
  findAllActive(): Promise<Category[]>

  /**
   * Busca categorías por texto (nombre o descripción)
   */
  search(query: string): Promise<Category[]>
}

