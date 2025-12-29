import type { Sale } from '@domain/entities/Sale'
import type { ISaleRepository, SaleFilters, SalesSummary } from '@domain/repositories/ISaleRepository'
import type { PaginatedResponse, PaginationParams, SortOptions, DateRange } from '@shared/types'
import { db } from '../database'
import { SaleMapper } from '../mappers/SaleMapper'

/**
 * Implementación del repositorio de Ventas usando IndexedDB
 */
export class SaleRepository implements ISaleRepository {
  async findById(id: string): Promise<Sale | null> {
    const record = await db.sales.get(id)
    return record ? SaleMapper.toDomain(record) : null
  }

  async findAll(): Promise<Sale[]> {
    const records = await db.sales.toArray()
    return SaleMapper.toDomainList(records)
  }

  async save(entity: Sale): Promise<void> {
    const record = SaleMapper.toPersistence(entity)
    await db.sales.put(record)
  }

  async saveMany(entities: Sale[]): Promise<void> {
    const records = entities.map((e) => SaleMapper.toPersistence(e))
    await db.sales.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.sales.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.sales.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.sales.count()
  }

  async findPaginated(
    params: PaginationParams,
    sort?: SortOptions<Sale>
  ): Promise<PaginatedResponse<Sale>> {
    const { page, limit } = params
    const offset = (page - 1) * limit

    let records = await db.sales.orderBy('createdAt').reverse().toArray()

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
      data: SaleMapper.toDomainList(paginated),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findByReceiptNumber(receiptNumber: string): Promise<Sale | null> {
    const record = await db.sales
      .where('receiptNumber')
      .equals(receiptNumber)
      .first()
    return record ? SaleMapper.toDomain(record) : null
  }

  async findByUserId(userId: string): Promise<Sale[]> {
    const records = await db.sales.where('userId').equals(userId).toArray()
    return SaleMapper.toDomainList(records)
  }

  async findByCustomerId(customerId: string): Promise<Sale[]> {
    const records = await db.sales
      .where('customerId')
      .equals(customerId)
      .toArray()
    return SaleMapper.toDomainList(records)
  }

  async findByDateRange(dateRange: DateRange): Promise<Sale[]> {
    const records = await db.sales
      .where('createdAt')
      .between(dateRange.from, dateRange.to, true, true)
      .toArray()
    return SaleMapper.toDomainList(records)
  }

  async findWithFilters(
    filters: SaleFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Sale>> {
    let records = await db.sales.orderBy('createdAt').reverse().toArray()

    // Aplicar filtros
    if (filters.userId) {
      records = records.filter((r) => r.userId === filters.userId)
    }

    if (filters.customerId) {
      records = records.filter((r) => r.customerId === filters.customerId)
    }

    if (filters.paymentMethodId) {
      records = records.filter((r) => r.paymentMethodId === filters.paymentMethodId)
    }

    if (filters.status) {
      records = records.filter((r) => r.status === filters.status)
    }

    if (filters.dateRange) {
      records = records.filter(
        (r) =>
          r.createdAt >= filters.dateRange!.from &&
          r.createdAt <= filters.dateRange!.to
      )
    }

    if (filters.receiptNumber) {
      records = records.filter((r) =>
        r.receiptNumber.includes(filters.receiptNumber!)
      )
    }

    const total = records.length
    const { page, limit } = pagination
    const offset = (page - 1) * limit
    const paginated = records.slice(offset, offset + limit)

    return {
      data: SaleMapper.toDomainList(paginated),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async getSummary(dateRange: DateRange): Promise<SalesSummary> {
    const records = await db.sales
      .where('createdAt')
      .between(dateRange.from, dateRange.to, true, true)
      .filter((r) => r.status === 'completed')
      .toArray()

    const totalSales = records.length
    const totalAmount = records.reduce((sum, r) => sum + r.totalCents, 0) / 100
    const averageAmount = totalSales > 0 ? totalAmount / totalSales : 0
    const totalItems = records.reduce(
      (sum, r) => sum + r.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0
    )

    // Agrupar por método de pago
    const byPaymentMethodMap = new Map<
      string,
      { type: string; count: number; total: number }
    >()
    for (const record of records) {
      const existing = byPaymentMethodMap.get(record.paymentMethodId)
      if (existing) {
        existing.count++
        existing.total += record.totalCents / 100
      } else {
        byPaymentMethodMap.set(record.paymentMethodId, {
          type: record.paymentMethodType,
          count: 1,
          total: record.totalCents / 100
        })
      }
    }

    const byPaymentMethod = Array.from(byPaymentMethodMap.entries()).map(
      ([paymentMethodId, data]) => ({
        paymentMethodId,
        paymentMethodType: data.type,
        count: data.count,
        total: data.total
      })
    )

    // Agrupar por estado
    const byStatusMap = new Map<string, { count: number; total: number }>()
    for (const record of records) {
      const existing = byStatusMap.get(record.status)
      if (existing) {
        existing.count++
        existing.total += record.totalCents / 100
      } else {
        byStatusMap.set(record.status, {
          count: 1,
          total: record.totalCents / 100
        })
      }
    }

    const byStatus = Array.from(byStatusMap.entries()).map(([status, data]) => ({
      status: status as typeof records[0]['status'],
      count: data.count,
      total: data.total
    }))

    return {
      totalSales,
      totalAmount,
      averageAmount,
      totalItems,
      byPaymentMethod,
      byStatus
    }
  }

  async findRecent(limit: number): Promise<Sale[]> {
    const records = await db.sales
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray()
    return SaleMapper.toDomainList(records)
  }

  async getNextReceiptNumber(): Promise<string> {
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const prefix = `V-${dateStr}-`

    const lastSale = await db.sales
      .where('receiptNumber')
      .startsWith(prefix)
      .last()

    let sequence = 1
    if (lastSale) {
      const lastSequence = parseInt(lastSale.receiptNumber.replace(prefix, ''), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`
  }

  async findToday(): Promise<Sale[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return this.findByDateRange({ from: today, to: tomorrow })
  }
}

