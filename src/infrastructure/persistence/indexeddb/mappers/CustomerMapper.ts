import { Customer } from '@domain/entities/Customer'
import { Email } from '@domain/value-objects/Email'
import type { CustomerRecord } from '../database'

/**
 * Mapper para convertir entre Customer (entidad) y CustomerRecord (DB)
 */
export class CustomerMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: CustomerRecord): Customer {
    return Customer.fromPersistence({
      id: record.id,
      name: record.name,
      documentNumber: record.documentNumber,
      phone: record.phone,
      email: record.email ? Email.create(record.email) : null,
      address: record.address,
      notes: record.notes,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus,
      syncedAt: record.syncedAt
    })
  }

  /**
   * Convierte una entidad de dominio a registro de DB
   */
  static toPersistence(entity: Customer): CustomerRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      name: data.name,
      documentNumber: data.documentNumber,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      syncStatus: data.syncStatus,
      syncedAt: data.syncedAt
    }
  }

  /**
   * Convierte múltiples registros a entidades
   */
  static toDomainList(records: CustomerRecord[]): Customer[] {
    return records.map((record) => this.toDomain(record))
  }
}

