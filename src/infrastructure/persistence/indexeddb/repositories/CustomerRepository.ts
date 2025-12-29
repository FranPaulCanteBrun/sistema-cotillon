import type { Customer } from '@domain/entities/Customer'
import type { ICustomerRepository, CustomerFilters } from '@domain/repositories/ICustomerRepository'
import type { PaginatedResponse, PaginationParams, SortOptions } from '@shared/types'
import { db } from '../database'
import { CustomerMapper } from '../mappers/CustomerMapper'

/**
 * Implementación del repositorio de Clientes usando IndexedDB
 */
export class CustomerRepository implements ICustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    const record = await db.customers.get(id)
    return record ? CustomerMapper.toDomain(record) : null
  }

  async findAll(): Promise<Customer[]> {
    const records = await db.customers.toArray()
    return CustomerMapper.toDomainList(records)
  }

  async save(entity: Customer): Promise<void> {
    const record = CustomerMapper.toPersistence(entity)
    await db.customers.put(record)
  }

  async saveMany(entities: Customer[]): Promise<void> {
    const records = entities.map((e) => CustomerMapper.toPersistence(e))
    await db.customers.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.customers.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.customers.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.customers.count()
  }

  async findPaginated(
    params: PaginationParams,
    sort?: SortOptions<Customer>
  ): Promise<PaginatedResponse<Customer>> {
    const { page, limit } = params
    const offset = (page - 1) * limit

    let records = await db.customers.toArray()

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
      data: CustomerMapper.toDomainList(paginated),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async findByDocumentNumber(documentNumber: string): Promise<Customer | null> {
    const record = await db.customers
      .where('documentNumber')
      .equals(documentNumber)
      .first()
    return record ? CustomerMapper.toDomain(record) : null
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const record = await db.customers
      .where('email')
      .equalsIgnoreCase(email)
      .first()
    return record ? CustomerMapper.toDomain(record) : null
  }

  async findAllActive(): Promise<Customer[]> {
    const records = await db.customers.filter((c) => c.isActive).toArray()
    return CustomerMapper.toDomainList(records)
  }

  async findWithFilters(
    filters: CustomerFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Customer>> {
    let records = await db.customers.toArray()

    // Aplicar filtros
    if (filters.isActive !== undefined) {
      records = records.filter((r) => r.isActive === filters.isActive)
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      records = records.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          (r.documentNumber && r.documentNumber.includes(query)) ||
          (r.phone && r.phone.includes(query)) ||
          (r.email && r.email.toLowerCase().includes(query))
      )
    }

    const total = records.length
    const { page, limit } = pagination
    const offset = (page - 1) * limit
    const paginated = records.slice(offset, offset + limit)

    return {
      data: CustomerMapper.toDomainList(paginated),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async search(query: string, limit: number = 20): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase()
    const records = await db.customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(lowerQuery) ||
          (customer.documentNumber &&
            customer.documentNumber.includes(query)) ||
          (customer.phone && customer.phone.includes(query))
      )
      .limit(limit)
      .toArray()
    return CustomerMapper.toDomainList(records)
  }
}

