import { Entity } from './Entity'
import type { SyncStatus } from '@shared/types'

/**
 * Props para crear una Categoría
 */
export interface CategoryProps {
  id: string
  name: string
  description?: string
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

export type CategoryCreationProps = Omit<
  CategoryProps,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'syncedAt'
> &
  Partial<Pick<CategoryProps, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'syncedAt'>>

/**
 * Entidad: Category (Categoría)
 * 
 * Representa una categoría de productos en la tienda de cotillón.
 * Ejemplos: "Globos", "Cotillón", "Velas", "Decoración", etc.
 */
export class Category extends Entity {
  private _name: string
  private _description: string
  private _isActive: boolean

  private constructor(props: CategoryProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._name = props.name
    this._description = props.description ?? ''
    this._isActive = props.isActive ?? true
  }

  /**
   * Crea una nueva categoría
   */
  static create(props: CategoryCreationProps): Category {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Category name is required')
    }

    if (props.name.length > 100) {
      throw new Error('Category name cannot exceed 100 characters')
    }

    const now = new Date()
    return new Category({
      id: props.id ?? crypto.randomUUID(),
      name: props.name.trim(),
      description: props.description,
      isActive: props.isActive,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
      syncStatus: props.syncStatus ?? 'pending',
      syncedAt: props.syncedAt
    })
  }

  /**
   * Actualiza varios campos de la categoría
   */
  update(props: { name?: string; description?: string; isActive?: boolean }): Category {
    if (props.name !== undefined) {
      this.updateName(props.name)
    }
    if (props.description !== undefined) {
      this.updateDescription(props.description)
    }
    if (props.isActive !== undefined) {
      props.isActive ? this.activate() : this.deactivate()
    }
    return this
  }

  /**
   * Reconstruye una categoría desde persistencia
   */
  static fromPersistence(props: CategoryProps): Category {
    return new Category(props)
  }

  // Getters
  get name(): string {
    return this._name
  }

  get description(): string {
    return this._description
  }

  get isActive(): boolean {
    return this._isActive
  }

  // Métodos de negocio
  /**
   * Actualiza el nombre de la categoría
   */
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Category name is required')
    }

    if (name.length > 100) {
      throw new Error('Category name cannot exceed 100 characters')
    }

    this._name = name.trim()
    this.markAsModified()
  }

  /**
   * Actualiza la descripción
   */
  updateDescription(description: string): void {
    this._description = description.trim()
    this.markAsModified()
  }

  /**
   * Activa la categoría
   */
  activate(): void {
    if (this._isActive) return
    this._isActive = true
    this.markAsModified()
  }

  /**
   * Desactiva la categoría
   */
  deactivate(): void {
    if (!this._isActive) return
    this._isActive = false
    this.markAsModified()
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): CategoryProps {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

