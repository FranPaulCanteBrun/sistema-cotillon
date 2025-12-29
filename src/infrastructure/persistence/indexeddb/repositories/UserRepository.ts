import type { User } from '@domain/entities/User'
import type { IUserRepository } from '@domain/repositories/IUserRepository'
import type { UserRole } from '@shared/types'
import { db } from '../database'
import { UserMapper } from '../mappers/UserMapper'

/**
 * Implementación del repositorio de Usuarios usando IndexedDB
 */
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const record = await db.users.get(id)
    return record ? UserMapper.toDomain(record) : null
  }

  async findAll(): Promise<User[]> {
    const records = await db.users.toArray()
    return UserMapper.toDomainList(records)
  }

  async save(entity: User): Promise<void> {
    const record = UserMapper.toPersistence(entity)
    await db.users.put(record)
  }

  async saveMany(entities: User[]): Promise<void> {
    const records = entities.map((e) => UserMapper.toPersistence(e))
    await db.users.bulkPut(records)
  }

  async delete(id: string): Promise<void> {
    await db.users.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    const count = await db.users.where('id').equals(id).count()
    return count > 0
  }

  async count(): Promise<number> {
    return db.users.count()
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await db.users
      .where('email')
      .equalsIgnoreCase(email)
      .first()
    return record ? UserMapper.toDomain(record) : null
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const records = await db.users.where('role').equals(role).toArray()
    return UserMapper.toDomainList(records)
  }

  async findAllActive(): Promise<User[]> {
    const records = await db.users.filter((u) => u.isActive).toArray()
    return UserMapper.toDomainList(records)
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await db.users
      .where('email')
      .equalsIgnoreCase(email)
      .count()
    return count > 0
  }

  async initializeDefaultAdmin(): Promise<void> {
    const adminExists = await this.existsByEmail('admin@cotillon.local')
    if (adminExists) return

    const admin = User.createDefaultAdmin()
    await this.save(admin)
  }
}

