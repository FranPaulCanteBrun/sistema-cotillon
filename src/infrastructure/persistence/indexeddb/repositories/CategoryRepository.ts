import type { Category } from '@domain/entities/Category'
import type { ICategoryRepository } from '@domain/repositories/ICategoryRepository'
import { db } from '../database'
import { CategoryMapper } from '../mappers/CategoryMapper'

/**
 * Implementación del repositorio de Categorías usando IndexedDB
 */
export class CategoryRepository implements ICategoryRepository {
  async findById(id: string): Promise<Category | null> {
    const record = await db.categories.get(id)
    return record ? CategoryMapper.toDomain(record) : null
  }

  async findAll(): Promise<Category[]> {
    const records = await db.categories.toArray()
    return CategoryMapper.toDomainList(records)
  }

  async save(entity: Category): Promise<void> {
    const record = CategoryMapper.toPersistence(entity)
    await db.categories.put(record)
  }

  async saveMany(entities: Category[]): Promise<void> {
    const records = entities.map((e) => CategoryMapper.toPersistence(e))
    await db.categories.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.categories.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.categories.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.categories.count()
  }

  async findByName(name: string): Promise<Category | null> {
    const record = await db.categories
      .where('name')
      .equalsIgnoreCase(name)
      .first()
    return record ? CategoryMapper.toDomain(record) : null
  }

  async findAllActive(): Promise<Category[]> {
    const records = await db.categories
      .where('isActive')
      .equals(1) // IndexedDB almacena booleans como 0/1
      .toArray()
    
    // Filtro adicional por si el índice no funciona con boolean
    const activeRecords = records.length > 0 
      ? records 
      : (await db.categories.toArray()).filter(r => r.isActive)
    
    return CategoryMapper.toDomainList(activeRecords)
  }

  async search(query: string): Promise<Category[]> {
    const lowerQuery = query.toLowerCase()
    const records = await db.categories
      .filter((category) =>
        category.name.toLowerCase().includes(lowerQuery) ||
        category.description.toLowerCase().includes(lowerQuery)
      )
      .toArray()
    return CategoryMapper.toDomainList(records)
  }
}

