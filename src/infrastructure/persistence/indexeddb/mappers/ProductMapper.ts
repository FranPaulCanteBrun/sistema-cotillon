import { Product } from '@domain/entities/Product'
import { Money } from '@domain/value-objects/Money'
import { Quantity } from '@domain/value-objects/Quantity'
import type { ProductRecord } from '../database'

/**
 * Mapper para convertir entre Product (entidad) y ProductRecord (DB)
 */
export class ProductMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: ProductRecord): Product {
    return Product.fromPersistence({
      id: record.id,
      code: record.code,
      name: record.name,
      description: record.description,
      categoryId: record.categoryId,
      supplierId: record.supplierId,
      basePrice: Money.fromCents(record.basePriceCents, record.basePriceCurrency),
      minStock: Quantity.create(record.minStock),
      isActive: record.isActive,
      imageUrl: record.imageUrl,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus,
      syncedAt: record.syncedAt
    })
  }

  /**
   * Convierte una entidad de dominio a registro de DB
   */
  static toPersistence(entity: Product): ProductRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      supplierId: data.supplierId,
      basePriceCents: data.basePriceCents,
      basePriceCurrency: data.basePriceCurrency,
      minStock: data.minStock,
      isActive: data.isActive,
      imageUrl: data.imageUrl,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      syncStatus: data.syncStatus,
      syncedAt: data.syncedAt
    }
  }

  /**
   * Convierte múltiples registros a entidades
   */
  static toDomainList(records: ProductRecord[]): Product[] {
    return records.map((record) => this.toDomain(record))
  }
}

