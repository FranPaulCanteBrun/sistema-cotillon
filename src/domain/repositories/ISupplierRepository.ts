import type { Supplier } from '../entities/Supplier'
import type { IRepository } from './IRepository'

/**
 * Interface del repositorio de Proveedores
 */
export interface ISupplierRepository extends IRepository<Supplier> {
  /**
   * Busca un proveedor por nombre (case-insensitive)
   */
  findByName(name: string): Promise<Supplier | null>

  /**
   * Obtiene todos los proveedores activos
   */
  findAllActive(): Promise<Supplier[]>

  /**
   * Busca proveedores por texto (nombre, contacto, teléfono)
   */
  search(query: string, limit?: number): Promise<Supplier[]>
}

