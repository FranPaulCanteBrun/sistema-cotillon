import { User } from '@domain/entities/User'
import { Email } from '@domain/value-objects/Email'
import type { UserRecord } from '../database'

/**
 * Mapper para convertir entre User (entidad) y UserRecord (DB)
 */
export class UserMapper {
  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: UserRecord): User {
    return User.fromPersistence({
      id: record.id,
      name: record.name,
      email: Email.create(record.email),
      passwordHash: record.passwordHash,
      role: record.role,
      isActive: record.isActive,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus,
      syncedAt: record.syncedAt
    })
  }

  /**
   * Convierte una entidad de dominio a registro de DB
   */
  static toPersistence(entity: User): UserRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      isActive: data.isActive,
      lastLoginAt: data.lastLoginAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      syncStatus: data.syncStatus,
      syncedAt: data.syncedAt
    }
  }

  /**
   * Convierte múltiples registros a entidades
   */
  static toDomainList(records: UserRecord[]): User[] {
    return records.map((record) => this.toDomain(record))
  }
}

