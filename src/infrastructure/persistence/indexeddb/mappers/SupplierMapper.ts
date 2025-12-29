import { Supplier } from '@domain/entities/Supplier'
import { Email } from '@domain/value-objects/Email'
import type { SupplierRecord } from '../database'

/**
 * Mapper para convertir entre Supplier (entidad) y SupplierRecord (DB)
 */
export class SupplierMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: SupplierRecord): Supplier {
    return Supplier.fromPersistence({
      id: record.id,
      name: record.name,
      contactName: record.contactName,
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
  static toPersistence(entity: Supplier): SupplierRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      name: data.name,
      contactName: data.contactName,
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
  static toDomainList(records: SupplierRecord[]): Supplier[] {
    return records.map((record) => this.toDomain(record))
  }
}

