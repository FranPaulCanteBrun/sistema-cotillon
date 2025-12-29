import type { PaymentMethod } from '../entities/PaymentMethod'
import type { IRepository } from './IRepository'
import type { PaymentMethodType } from '@shared/types'

/**
 * Interface del repositorio de Métodos de Pago
 */
export interface IPaymentMethodRepository extends IRepository<PaymentMethod> {
  /**
   * Busca un método de pago por nombre
   */
  findByName(name: string): Promise<PaymentMethod | null>

  /**
   * Obtiene métodos de pago por tipo
   */
  findByType(type: PaymentMethodType): Promise<PaymentMethod[]>

  /**
   * Obtiene todos los métodos de pago activos
   */
  findAllActive(): Promise<PaymentMethod[]>

  /**
   * Inicializa los métodos de pago por defecto si no existen
   */
  initializeDefaults(): Promise<void>
}

