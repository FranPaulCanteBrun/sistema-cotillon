import type { ProductVariant } from '../entities/ProductVariant'
import type { IRepository } from './IRepository'

/**
 * Interface del repositorio de Variantes de Producto
 */
export interface IProductVariantRepository extends IRepository<ProductVariant> {
  /**
   * Obtiene todas las variantes de un producto
   */
  findByProductId(productId: string): Promise<ProductVariant[]>

  /**
   * Busca una variante por SKU
   */
  findBySku(sku: string): Promise<ProductVariant | null>

  /**
   * Busca una variante por código de barras
   */
  findByBarcode(barcode: string): Promise<ProductVariant | null>

  /**
   * Obtiene variantes con stock bajo
   * (requiere el minStock del producto para comparar)
   */
  findLowStock(): Promise<ProductVariant[]>

  /**
   * Obtiene todas las variantes activas de un producto
   */
  findActiveByProductId(productId: string): Promise<ProductVariant[]>

  /**
   * Busca variantes por texto (SKU, código de barras)
   */
  search(query: string, limit?: number): Promise<ProductVariant[]>

  /**
   * Actualiza el stock de una variante
   */
  updateStock(variantId: string, newStock: number): Promise<void>
}

