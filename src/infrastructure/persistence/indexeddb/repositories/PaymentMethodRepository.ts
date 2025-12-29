import type { PaymentMethod } from '@domain/entities/PaymentMethod'
import type { IPaymentMethodRepository } from '@domain/repositories/IPaymentMethodRepository'
import type { PaymentMethodType } from '@shared/types'
import { db } from '../database'
import { PaymentMethodMapper } from '../mappers/PaymentMethodMapper'

/**
 * Implementación del repositorio de Métodos de Pago usando IndexedDB
 */
export class PaymentMethodRepository implements IPaymentMethodRepository {
  async findById(id: string): Promise<PaymentMethod | null> {
    const record = await db.paymentMethods.get(id)
    return record ? PaymentMethodMapper.toDomain(record) : null
  }

  async findAll(): Promise<PaymentMethod[]> {
    const records = await db.paymentMethods.toArray()
    return PaymentMethodMapper.toDomainList(records)
  }

  async save(entity: PaymentMethod): Promise<void> {
    const record = PaymentMethodMapper.toPersistence(entity)
    await db.paymentMethods.put(record)
  }

  async saveMany(entities: PaymentMethod[]): Promise<void> {
    const records = entities.map((e) => PaymentMethodMapper.toPersistence(e))
    await db.paymentMethods.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.paymentMethods.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.paymentMethods.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.paymentMethods.count()
  }

  async findByName(name: string): Promise<PaymentMethod | null> {
    const record = await db.paymentMethods
      .where('name')
      .equalsIgnoreCase(name)
      .first()
    return record ? PaymentMethodMapper.toDomain(record) : null
  }

  async findByType(type: PaymentMethodType): Promise<PaymentMethod[]> {
    const records = await db.paymentMethods
      .where('type')
      .equals(type)
      .toArray()
    return PaymentMethodMapper.toDomainList(records)
  }

  async findAllActive(): Promise<PaymentMethod[]> {
    const records = await db.paymentMethods
      .filter((pm) => pm.isActive)
      .toArray()
    return PaymentMethodMapper.toDomainList(records)
  }

  async initializeDefaults(): Promise<void> {
    const count = await this.count()
    if (count > 0) return

    const defaultMethods = PaymentMethod.createDefaults()
    await this.saveMany(defaultMethods)
  }
}

