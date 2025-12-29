import { StockMovement } from '@domain/entities/StockMovement'
import { Quantity } from '@domain/value-objects/Quantity'
import type { StockMovementRecord } from '../database'

/**
 * Mapper para convertir entre StockMovement (entidad) y StockMovementRecord (DB)
 */
export class StockMovementMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: StockMovementRecord): StockMovement {
    return StockMovement.fromPersistence({
      id: record.id,
      variantId: record.variantId,
      userId: record.userId,
      type: record.type,
      quantity: Quantity.create(record.quantity),
      previousStock: Quantity.create(record.previousStock),
      newStock: Quantity.create(record.newStock),
      reason: record.reason,
      referenceId: record.referenceId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus,
      syncedAt: record.syncedAt
    })
  }

  /**
   * Convierte una entidad de dominio a registro de DB
   */
  static toPersistence(entity: StockMovement): StockMovementRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      variantId: data.variantId,
      userId: data.userId,
      type: data.type,
      quantity: data.quantity,
      previousStock: data.previousStock,
      newStock: data.newStock,
      reason: data.reason,
      referenceId: data.referenceId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      syncStatus: data.syncStatus,
      syncedAt: data.syncedAt
    }
  }

  /**
   * Convierte múltiples registros a entidades
   */
  static toDomainList(records: StockMovementRecord[]): StockMovement[] {
    return records.map((record) => this.toDomain(record))
  }
}

