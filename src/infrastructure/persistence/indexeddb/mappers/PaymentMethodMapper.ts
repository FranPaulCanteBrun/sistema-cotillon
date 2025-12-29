import { PaymentMethod, type PaymentMethodConfig } from '@domain/entities/PaymentMethod'
import type { PaymentMethodRecord } from '../database'

/**
 * Mapper para convertir entre PaymentMethod (entidad) y PaymentMethodRecord (DB)
 */
export class PaymentMethodMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: PaymentMethodRecord): PaymentMethod {
    let config: PaymentMethodConfig = {}
    try {
      config = JSON.parse(record.config)
    } catch {
      config = {}
    }

    return PaymentMethod.fromPersistence({
      id: record.id,
      name: record.name,
      type: record.type,
      isActive: record.isActive,
      config,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus,
      syncedAt: record.syncedAt
    })
  }

  /**
   * Convierte una entidad de dominio a registro de DB
   */
  static toPersistence(entity: PaymentMethod): PaymentMethodRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      isActive: data.isActive ?? true,
      config: typeof data.config === 'string' ? data.config : JSON.stringify(data.config ?? {}),
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      syncStatus: data.syncStatus ?? 'pending',
      syncedAt: data.syncedAt
    }
  }

  /**
   * Convierte múltiples registros a entidades
   */
  static toDomainList(records: PaymentMethodRecord[]): PaymentMethod[] {
    return records.map((record) => this.toDomain(record))
  }
}

