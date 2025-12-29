import type { StockMovement } from '@domain/entities/StockMovement'
import type { IStockMovementRepository, StockMovementFilters } from '@domain/repositories/IStockMovementRepository'
import type { PaginatedResponse, PaginationParams, SortOptions, DateRange, StockMovementType } from '@shared/types'
import { db } from '../database'
import { StockMovementMapper } from '../mappers/StockMovementMapper'

/**
 * Implementación del repositorio de Movimientos de Stock usando IndexedDB
 */
export class StockMovementRepository implements IStockMovementRepository {
  async findById(id: string): Promise<StockMovement | null> {
    const record = await db.stockMovements.get(id)
    return record ? StockMovementMapper.toDomain(record) : null
  }

  async findAll(): Promise<StockMovement[]> {
    const records = await db.stockMovements.toArray()
    return StockMovementMapper.toDomainList(records)
  }

  async save(entity: StockMovement): Promise<void> {
    const record = StockMovementMapper.toPersistence(entity)
    await db.stockMovements.put(record)
  }

  async saveMany(entities: StockMovement[]): Promise<void> {
    const records = entities.map((e) => StockMovementMapper.toPersistence(e))
    await db.stockMovements.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.stockMovements.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.stockMovements.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.stockMovements.count()
  }

  async findPaginated(
    params: PaginationParams,
    sort?: SortOptions<StockMovement>
  ): Promise<PaginatedResponse<StockMovement>> {
    const { page, limit } = params
    const offset = (page - 1) * limit

    let records = await db.stockMovements.orderBy('createdAt').reverse().toArray()

    if (sort) {
      records.sort((a, b) => {
        const aVal = a[sort.field as keyof typeof a]
        const bVal = b[sort.field as keyof typeof b]
        if (aVal === undefined || bVal === undefined) return 0
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    const total = records.length
    const paginated = records.slice(offset, offset + limit)

    return {
      data: StockMovementMapper.toDomainList(paginated),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findByVariantId(variantId: string): Promise<StockMovement[]> {
    const records = await db.stockMovements
      .where('variantId')
      .equals(variantId)
      .toArray()
    return StockMovementMapper.toDomainList(records)
  }

  async findByUserId(userId: string): Promise<StockMovement[]> {
    const records = await db.stockMovements
      .where('userId')
      .equals(userId)
      .toArray()
    return StockMovementMapper.toDomainList(records)
  }

  async findByType(type: StockMovementType): Promise<StockMovement[]> {
    const records = await db.stockMovements
      .where('type')
      .equals(type)
      .toArray()
    return StockMovementMapper.toDomainList(records)
  }

  async findByDateRange(dateRange: DateRange): Promise<StockMovement[]> {
    const records = await db.stockMovements
      .where('createdAt')
      .between(dateRange.from, dateRange.to, true, true)
      .toArray()
    return StockMovementMapper.toDomainList(records)
  }

  async findWithFilters(
    filters: StockMovementFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<StockMovement>> {
    let records = await db.stockMovements.orderBy('createdAt').reverse().toArray()

    // Aplicar filtros
    if (filters.variantId) {
      records = records.filter((r) => r.variantId === filters.variantId)
    }

    if (filters.userId) {
      records = records.filter((r) => r.userId === filters.userId)
    }

    if (filters.type) {
      records = records.filter((r) => r.type === filters.type)
    }

    if (filters.dateRange) {
      records = records.filter(
        (r) =>
          r.createdAt >= filters.dateRange!.from &&
          r.createdAt <= filters.dateRange!.to
      )
    }

    if (filters.referenceId) {
      records = records.filter((r) => r.referenceId === filters.referenceId)
    }

    const total = records.length
    const { page, limit } = pagination
    const offset = (page - 1) * limit
    const paginated = records.slice(offset, offset + limit)

    return {
      data: StockMovementMapper.toDomainList(paginated),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findLastByVariantId(variantId: string): Promise<StockMovement | null> {
    const record = await db.stockMovements
      .where('variantId')
      .equals(variantId)
      .last()
    return record ? StockMovementMapper.toDomain(record) : null
  }

  async findByReferenceId(referenceId: string): Promise<StockMovement[]> {
    const records = await db.stockMovements
      .where('referenceId')
      .equals(referenceId)
      .toArray()
    return StockMovementMapper.toDomainList(records)
  }
}

