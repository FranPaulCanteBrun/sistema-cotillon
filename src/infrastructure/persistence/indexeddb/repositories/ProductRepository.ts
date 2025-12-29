import type { Product } from '@domain/entities/Product'
import type { IProductRepository, ProductFilters } from '@domain/repositories/IProductRepository'
import type { PaginatedResponse, PaginationParams, SortOptions } from '@shared/types'
import { db } from '../database'
import { ProductMapper } from '../mappers/ProductMapper'

/**
 * Implementación del repositorio de Productos usando IndexedDB
 */
export class ProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const record = await db.products.get(id)
    return record ? ProductMapper.toDomain(record) : null
  }

  async findAll(): Promise<Product[]> {
    const records = await db.products.toArray()
    return ProductMapper.toDomainList(records)
  }

  async save(entity: Product): Promise<void> {
    const record = ProductMapper.toPersistence(entity)
    await db.products.put(record)
  }

  async saveMany(entities: Product[]): Promise<void> {
    const records = entities.map((e) => ProductMapper.toPersistence(e))
    await db.products.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.products.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.products.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.products.count()
  }

  async findPaginated(
    params: PaginationParams,
    sort?: SortOptions<Product>
  ): Promise<PaginatedResponse<Product>> {
    const { page, limit } = params
    const offset = (page - 1) * limit

    let collection = db.products.toCollection()

    if (sort) {
      const records = await collection.toArray()
      records.sort((a, b) => {
        const aVal = a[sort.field as keyof typeof a]
        const bVal = b[sort.field as keyof typeof b]
        if (aVal === undefined || bVal === undefined) return 0
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1
        return 0
      })

      const paginated = records.slice(offset, offset + limit)
      return {
        data: ProductMapper.toDomainList(paginated),
        total: records.length,
        page,
        limit,
        totalPages: Math.ceil(records.length / limit)
      }
    }

    const total = await db.products.count()
    const records = await collection.offset(offset).limit(limit).toArray()

    return {
      data: ProductMapper.toDomainList(records),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findByCode(code: string): Promise<Product | null> {
    const record = await db.products.where('code').equals(code.toUpperCase()).first()
    return record ? ProductMapper.toDomain(record) : null
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    const records = await db.products.where('categoryId').equals(categoryId).toArray()
    return ProductMapper.toDomainList(records)
  }

  async findBySupplier(supplierId: string): Promise<Product[]> {
    const records = await db.products.where('supplierId').equals(supplierId).toArray()
    return ProductMapper.toDomainList(records)
  }

  async findAllActive(): Promise<Product[]> {
    const records = await db.products.filter((p) => p.isActive).toArray()
    return ProductMapper.toDomainList(records)
  }

  async findWithFilters(
    filters: ProductFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Product>> {
    let records = await db.products.toArray()

    // Aplicar filtros
    if (filters.categoryId) {
      records = records.filter((r) => r.categoryId === filters.categoryId)
    }

    if (filters.supplierId) {
      records = records.filter((r) => r.supplierId === filters.supplierId)
    }

    if (filters.isActive !== undefined) {
      records = records.filter((r) => r.isActive === filters.isActive)
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      records = records.filter(
        (r) =>
          r.code.toLowerCase().includes(query) ||
          r.name.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query)
      )
    }

    // Para filtro de stock bajo, necesitamos verificar las variantes
    // Esto se manejará en un nivel superior

    const total = records.length
    const { page, limit } = pagination
    const offset = (page - 1) * limit
    const paginated = records.slice(offset, offset + limit)

    return {
      data: ProductMapper.toDomainList(paginated),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async search(query: string, limit: number = 20): Promise<Product[]> {
    const lowerQuery = query.toLowerCase()
    const records = await db.products
      .filter(
        (product) =>
          product.code.toLowerCase().includes(lowerQuery) ||
          product.name.toLowerCase().includes(lowerQuery) ||
          product.description.toLowerCase().includes(lowerQuery)
      )
      .limit(limit)
      .toArray()
    return ProductMapper.toDomainList(records)
  }
}

