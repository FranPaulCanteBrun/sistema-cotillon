import { Category } from '@domain/entities/Category'
import type { CategoryRecord } from '../database'

/**
 * Mapper para convertir entre Category (entidad) y CategoryRecord (DB)
 */
export class CategoryMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: CategoryRecord): Category {
    return Category.fromPersistence({
      id: record.id,
      name: record.name,
      description: record.description,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus,
      syncedAt: record.syncedAt
    })
  }

  /**
   * Convierte una entidad de dominio a registro de DB
   */
  static toPersistence(entity: Category): CategoryRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      name: data.name,
      description: data.description ?? '',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      syncStatus: data.syncStatus ?? 'pending',
      syncedAt: data.syncedAt
    }
  }

  /**
   * Convierte múltiples registros a entidades
   */
  static toDomainList(records: CategoryRecord[]): Category[] {
    return records.map((record) => this.toDomain(record))
  }
}

