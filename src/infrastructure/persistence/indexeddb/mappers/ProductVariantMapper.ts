import { ProductVariant } from '@domain/entities/ProductVariant'
import { Money } from '@domain/value-objects/Money'
import { SKU } from '@domain/value-objects/SKU'
import { Quantity } from '@domain/value-objects/Quantity'
import type { ProductVariantRecord } from '../database'

/**
 * Mapper para convertir entre ProductVariant (entidad) y ProductVariantRecord (DB)
 */
export class ProductVariantMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: ProductVariantRecord): ProductVariant {
    return ProductVariant.fromPersistence({
      id: record.id,
      productId: record.productId,
      sku: SKU.create(record.sku),
      color: record.color,
      size: record.size,
      price: record.priceCents !== undefined && record.priceCurrency
        ? Money.fromCents(record.priceCents, record.priceCurrency)
        : undefined,
      currentStock: Quantity.create(record.currentStock),
      barcode: record.barcode,
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
  static toPersistence(entity: ProductVariant): ProductVariantRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      productId: data.productId,
      sku: data.sku,
      color: data.color,
      size: data.size,
      priceCents: data.priceCents,
      priceCurrency: data.priceCurrency,
      currentStock: data.currentStock,
      barcode: data.barcode,
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
  static toDomainList(records: ProductVariantRecord[]): ProductVariant[] {
    return records.map((record) => this.toDomain(record))
  }
}

