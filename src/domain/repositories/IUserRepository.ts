import type { User } from '../entities/User'
import type { IRepository } from './IRepository'
import type { UserRole } from '@shared/types'

/**
 * Interface del repositorio de Usuarios
 */
export interface IUserRepository extends IRepository<User> {
  /**
   * Busca un usuario por email
   */
  findByEmail(email: string): Promise<User | null>

  /**
   * Obtiene usuarios por rol
   */
  findByRole(role: UserRole): Promise<User[]>

  /**
   * Obtiene todos los usuarios activos
   */
  findAllActive(): Promise<User[]>

  /**
   * Verifica si existe un usuario con el email dado
   */
  existsByEmail(email: string): Promise<boolean>

  /**
   * Inicializa el usuario administrador por defecto si no existe
   */
  initializeDefaultAdmin(): Promise<void>
}

