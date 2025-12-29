import type { ProductVariant } from '@domain/entities/ProductVariant'
import type { IProductVariantRepository } from '@domain/repositories/IProductVariantRepository'
import { db } from '../database'
import { ProductVariantMapper } from '../mappers/ProductVariantMapper'

/**
 * Implementación del repositorio de Variantes de Producto usando IndexedDB
 */
export class ProductVariantRepository implements IProductVariantRepository {
  async findById(id: string): Promise<ProductVariant | null> {
    const record = await db.productVariants.get(id)
    return record ? ProductVariantMapper.toDomain(record) : null
  }

  async findAll(): Promise<ProductVariant[]> {
    const records = await db.productVariants.toArray()
    return ProductVariantMapper.toDomainList(records)
  }

  async save(entity: ProductVariant): Promise<void> {
    const record = ProductVariantMapper.toPersistence(entity)
    await db.productVariants.put(record)
  }

  async saveMany(entities: ProductVariant[]): Promise<void> {
    const records = entities.map((e) => ProductVariantMapper.toPersistence(e))
    await db.productVariants.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.productVariants.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.productVariants.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.productVariants.count()
  }

  async findByProductId(productId: string): Promise<ProductVariant[]> {
    const records = await db.productVariants
      .where('productId')
      .equals(productId)
      .toArray()
    return ProductVariantMapper.toDomainList(records)
  }

  async findBySku(sku: string): Promise<ProductVariant | null> {
    const record = await db.productVariants
      .where('sku')
      .equals(sku.toUpperCase())
      .first()
    return record ? ProductVariantMapper.toDomain(record) : null
  }

  async findByBarcode(barcode: string): Promise<ProductVariant | null> {
    const record = await db.productVariants
      .where('barcode')
      .equals(barcode)
      .first()
    return record ? ProductVariantMapper.toDomain(record) : null
  }

  async findLowStock(): Promise<ProductVariant[]> {
    // Necesitamos obtener el minStock de cada producto para comparar
    const variants = await db.productVariants.toArray()
    const products = await db.products.toArray()

    const productMinStockMap = new Map(
      products.map((p) => [p.id, p.minStock])
    )

    const lowStockVariants = variants.filter((v) => {
      const minStock = productMinStockMap.get(v.productId) ?? 0
      return v.currentStock < minStock
    })

    return ProductVariantMapper.toDomainList(lowStockVariants)
  }

  async findActiveByProductId(productId: string): Promise<ProductVariant[]> {
    const records = await db.productVariants
      .where('productId')
      .equals(productId)
      .filter((v) => v.isActive)
      .toArray()
    return ProductVariantMapper.toDomainList(records)
  }

  async search(query: string, limit: number = 20): Promise<ProductVariant[]> {
    const upperQuery = query.toUpperCase()
    const records = await db.productVariants
      .filter(
        (variant) =>
          variant.sku.includes(upperQuery) ||
          (variant.barcode && variant.barcode.includes(query))
      )
      .limit(limit)
      .toArray()
    return ProductVariantMapper.toDomainList(records)
  }

  async updateStock(variantId: string, newStock: number): Promise<void> {
    await db.productVariants.update(variantId, {
      currentStock: newStock,
      updatedAt: new Date(),
      syncStatus: 'pending'
    })
  }
}

