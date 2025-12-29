import type { SyncStatus } from '@shared/types'

/**
 * Clase base abstracta para todas las entidades del dominio.
 * Proporciona identidad y campos de auditoría comunes.
 */
export abstract class Entity<T extends string = string> {
  protected readonly _id: T
  protected _createdAt: Date
  protected _updatedAt: Date
  protected _syncStatus: SyncStatus
  protected _syncedAt?: Date

  constructor(
    id: T,
    createdAt?: Date,
    updatedAt?: Date,
    syncStatus: SyncStatus = 'pending',
    syncedAt?: Date
  ) {
    this._id = id
    this._createdAt = createdAt ?? new Date()
    this._updatedAt = updatedAt ?? new Date()
    this._syncStatus = syncStatus
    this._syncedAt = syncedAt
  }

  get id(): T {
    return this._id
  }

  get createdAt(): Date {
    return this._createdAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  get syncStatus(): SyncStatus {
    return this._syncStatus
  }

  get syncedAt(): Date | undefined {
    return this._syncedAt
  }

  /**
   * Marca la entidad como modificada
   */
  protected markAsModified(): void {
    this._updatedAt = new Date()
    this._syncStatus = 'pending'
  }

  /**
   * Marca la entidad como sincronizada
   */
  markAsSynced(): void {
    this._syncStatus = 'synced'
    this._syncedAt = new Date()
  }

  /**
   * Marca la entidad con error de sincronización
   */
  markAsSyncError(): void {
    this._syncStatus = 'error'
  }

  /**
   * Marca la entidad con conflicto de sincronización
   */
  markAsConflict(): void {
    this._syncStatus = 'conflict'
  }

  /**
   * Verifica igualdad por identidad
   */
  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) {
      return false
    }
    return this._id === other._id
  }
}

