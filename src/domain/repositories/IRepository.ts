import type { PaginatedResponse, PaginationParams, SortOptions } from '@shared/types'

/**
 * Interface base para todos los repositorios.
 * Define operaciones CRUD comunes.
 */
export interface IRepository<T, TId = string> {
  /**
   * Busca una entidad por su ID
   */
  findById(id: TId): Promise<T | null>

  /**
   * Obtiene todas las entidades
   */
  findAll(): Promise<T[]>

  /**
   * Guarda una entidad (crear o actualizar)
   */
  save(entity: T): Promise<void>

  /**
   * Guarda múltiples entidades
   */
  saveMany(entities: T[]): Promise<void>

  /**
   * Elimina una entidad por su ID
   */
  delete(id: TId): Promise<void>

  /**
   * Verifica si existe una entidad con el ID dado
   */
  exists(id: TId): Promise<boolean>

  /**
   * Cuenta el total de entidades
   */
  count(): Promise<number>
}

/**
 * Interface extendida con soporte para paginación y ordenamiento
 */
export interface IPaginatedRepository<T, TId = string> extends IRepository<T, TId> {
  /**
   * Obtiene entidades con paginación
   */
  findPaginated(
    params: PaginationParams,
    sort?: SortOptions<T>
  ): Promise<PaginatedResponse<T>>
}

