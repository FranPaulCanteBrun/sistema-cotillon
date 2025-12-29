import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { PaymentMethodMapper } from '../indexeddb/mappers/PaymentMethodMapper'
import { PaymentMethodRepository } from '../indexeddb/repositories/PaymentMethodRepository'
import type { PaymentMethod } from '@domain/entities/PaymentMethod'

const paymentMethodRepository = new PaymentMethodRepository()

/**
 * Hook para obtener todos los métodos de pago (reactivo)
 */
export function usePaymentMethods() {
  const records = useLiveQuery(() => db.paymentMethods.toArray())

  return {
    paymentMethods: records ? PaymentMethodMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener métodos de pago activos (reactivo)
 */
export function useActivePaymentMethods() {
  const records = useLiveQuery(() => 
    db.paymentMethods.filter(pm => pm.isActive).toArray()
  )

  return {
    paymentMethods: records ? PaymentMethodMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener un método de pago por ID
 */
export function usePaymentMethod(id: string | undefined) {
  const record = useLiveQuery(
    () => (id ? db.paymentMethods.get(id) : undefined),
    [id]
  )

  return {
    paymentMethod: record ? PaymentMethodMapper.toDomain(record) : null,
    isLoading: record === undefined && id !== undefined
  }
}

/**
 * Funciones de mutación para métodos de pago
 */
export function usePaymentMethodMutations() {
  const create = async (paymentMethod: PaymentMethod): Promise<void> => {
    await paymentMethodRepository.save(paymentMethod)
  }

  const update = async (paymentMethod: PaymentMethod): Promise<void> => {
    await paymentMethodRepository.save(paymentMethod)
  }

  const remove = async (id: string): Promise<void> => {
    await paymentMethodRepository.delete(id)
  }

  const initializeDefaults = async (): Promise<void> => {
    await paymentMethodRepository.initializeDefaults()
  }

  return { create, update, remove, initializeDefaults }
}

