import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { ProductMapper } from '../indexeddb/mappers/ProductMapper'
import { ProductVariantMapper } from '../indexeddb/mappers/ProductVariantMapper'
import { ProductRepository } from '../indexeddb/repositories/ProductRepository'
import { ProductVariantRepository } from '../indexeddb/repositories/ProductVariantRepository'
import type { Product } from '@domain/entities/Product'
import type { ProductVariant } from '@domain/entities/ProductVariant'

const productRepository = new ProductRepository()
const variantRepository = new ProductVariantRepository()

/**
 * Hook para obtener todos los productos (reactivo)
 */
export function useProducts() {
  const records = useLiveQuery(() => db.products.toArray())

  return {
    products: records ? ProductMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener productos activos (reactivo)
 */
export function useActiveProducts() {
  const records = useLiveQuery(() => 
    db.products.filter(p => p.isActive).toArray()
  )

  return {
    products: records ? ProductMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener productos por categoría
 */
export function useProductsByCategory(categoryId: string | undefined) {
  const records = useLiveQuery(
    () => categoryId 
      ? db.products.where('categoryId').equals(categoryId).toArray()
      : [],
    [categoryId]
  )

  return {
    products: records ? ProductMapper.toDomainList(records) : [],
    isLoading: records === undefined && categoryId !== undefined
  }
}

/**
 * Hook para obtener un producto por ID con sus variantes
 */
export function useProductWithVariants(productId: string | undefined) {
  const productRecord = useLiveQuery(
    () => (productId ? db.products.get(productId) : undefined),
    [productId]
  )

  const variantRecords = useLiveQuery(
    () => productId 
      ? db.productVariants.where('productId').equals(productId).toArray()
      : [],
    [productId]
  )

  return {
    product: productRecord ? ProductMapper.toDomain(productRecord) : null,
    variants: variantRecords ? ProductVariantMapper.toDomainList(variantRecords) : [],
    isLoading: productRecord === undefined && productId !== undefined
  }
}

/**
 * Hook para obtener productos con stock bajo
 */
export function useLowStockProducts() {
  const data = useLiveQuery(async () => {
    const variants = await db.productVariants.toArray()
    const products = await db.products.toArray()

    const productMinStockMap = new Map(
      products.map((p) => [p.id, { minStock: p.minStock, product: p }])
    )

    const lowStockVariants = variants.filter((v) => {
      const productInfo = productMinStockMap.get(v.productId)
      return productInfo && v.currentStock < productInfo.minStock
    })

    // Agrupar por producto
    const productIds = [...new Set(lowStockVariants.map(v => v.productId))]
    const lowStockProducts = products.filter(p => productIds.includes(p.id))

    return {
      products: ProductMapper.toDomainList(lowStockProducts),
      variants: ProductVariantMapper.toDomainList(lowStockVariants)
    }
  })

  return {
    products: data?.products ?? [],
    variants: data?.variants ?? [],
    isLoading: data === undefined
  }
}

/**
 * Hook para buscar productos
 */
export function useProductSearch(query: string) {
  const records = useLiveQuery(
    () => {
      if (!query || query.length < 2) return []
      const lowerQuery = query.toLowerCase()
      return db.products
        .filter(
          (p) =>
            p.code.toLowerCase().includes(lowerQuery) ||
            p.name.toLowerCase().includes(lowerQuery)
        )
        .limit(20)
        .toArray()
    },
    [query]
  )

  return {
    products: records ? ProductMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Funciones de mutación para productos
 */
export function useProductMutations() {
  const createProduct = async (product: Product): Promise<void> => {
    await productRepository.save(product)
  }

  const updateProduct = async (product: Product): Promise<void> => {
    await productRepository.save(product)
  }

  const deleteProduct = async (id: string): Promise<void> => {
    // También eliminar variantes asociadas
    const variants = await db.productVariants.where('productId').equals(id).toArray()
    await db.productVariants.bulkDelete(variants.map(v => v.id))
    await productRepository.delete(id)
  }

  const createVariant = async (variant: ProductVariant): Promise<void> => {
    await variantRepository.save(variant)
  }

  const updateVariant = async (variant: ProductVariant): Promise<void> => {
    await variantRepository.save(variant)
  }

  const deleteVariant = async (id: string): Promise<void> => {
    await variantRepository.delete(id)
  }

  const updateStock = async (variantId: string, newStock: number): Promise<void> => {
    await variantRepository.updateStock(variantId, newStock)
  }

  return {
    createProduct,
    updateProduct,
    deleteProduct,
    createVariant,
    updateVariant,
    deleteVariant,
    updateStock
  }
}

