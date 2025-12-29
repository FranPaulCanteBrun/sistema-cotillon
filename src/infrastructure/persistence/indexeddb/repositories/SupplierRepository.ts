import type { Supplier } from '@domain/entities/Supplier'
import type { ISupplierRepository } from '@domain/repositories/ISupplierRepository'
import { db } from '../database'
import { SupplierMapper } from '../mappers/SupplierMapper'

/**
 * Implementación del repositorio de Proveedores usando IndexedDB
 */
export class SupplierRepository implements ISupplierRepository {
  async findById(id: string): Promise<Supplier | null> {
    const record = await db.suppliers.get(id)
    return record ? SupplierMapper.toDomain(record) : null
  }

  async findAll(): Promise<Supplier[]> {
    const records = await db.suppliers.toArray()
    return SupplierMapper.toDomainList(records)
  }

  async save(entity: Supplier): Promise<void> {
    const record = SupplierMapper.toPersistence(entity)
    await db.suppliers.put(record)
  }

  async saveMany(entities: Supplier[]): Promise<void> {
    const records = entities.map((e) => SupplierMapper.toPersistence(e))
    await db.suppliers.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.suppliers.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.suppliers.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.suppliers.count()
  }

  async findByName(name: string): Promise<Supplier | null> {
    const record = await db.suppliers
      .where('name')
      .equalsIgnoreCase(name)
      .first()
    return record ? SupplierMapper.toDomain(record) : null
  }

  async findAllActive(): Promise<Supplier[]> {
    const records = await db.suppliers.filter((s) => s.isActive).toArray()
    return SupplierMapper.toDomainList(records)
  }

  async search(query: string, limit: number = 20): Promise<Supplier[]> {
    const lowerQuery = query.toLowerCase()
    const records = await db.suppliers
      .filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(lowerQuery) ||
          (supplier.contactName &&
            supplier.contactName.toLowerCase().includes(lowerQuery)) ||
          (supplier.phone && supplier.phone.includes(query))
      )
      .limit(limit)
      .toArray()
    return SupplierMapper.toDomainList(records)
  }
}

