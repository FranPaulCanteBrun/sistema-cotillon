import { Entity } from './Entity'
import { Email } from '../value-objects/Email'
import type { SyncStatus } from '@shared/types'

/**
 * Props para crear un Proveedor
 */
export interface SupplierProps {
  id: string
  name: string
  contactName?: string
  phone?: string
  email?: Email | null
  address?: string
  notes?: string
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

/**
 * Entidad: Supplier (Proveedor)
 * 
 * Representa un proveedor de productos.
 */
export class Supplier extends Entity {
  private _name: string
  private _contactName?: string
  private _phone?: string
  private _email?: Email | null
  private _address?: string
  private _notes: string
  private _isActive: boolean

  private constructor(props: SupplierProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._name = props.name
    this._contactName = props.contactName
    this._phone = props.phone
    this._email = props.email
    this._address = props.address
    this._notes = props.notes ?? ''
    this._isActive = props.isActive ?? true
  }

  /**
   * Crea un nuevo proveedor
   */
  static create(props: SupplierProps): Supplier {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Supplier name is required')
    }

    if (props.name.length > 200) {
      throw new Error('Supplier name cannot exceed 200 characters')
    }

    return new Supplier({
      ...props,
      name: props.name.trim()
    })
  }

  /**
   * Reconstruye desde persistencia
   */
  static fromPersistence(props: SupplierProps): Supplier {
    return new Supplier(props)
  }

  // Getters
  get name(): string {
    return this._name
  }

  get contactName(): string | undefined {
    return this._contactName
  }

  get phone(): string | undefined {
    return this._phone
  }

  get email(): Email | null | undefined {
    return this._email
  }

  get address(): string | undefined {
    return this._address
  }

  get notes(): string {
    return this._notes
  }

  get isActive(): boolean {
    return this._isActive
  }

  // Métodos de negocio

  /**
   * Actualiza la información del proveedor
   */
  updateInfo(data: {
    name?: string
    contactName?: string
    phone?: string
    email?: Email | null
    address?: string
    notes?: string
  }): void {
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error('Supplier name is required')
      }
      if (data.name.length > 200) {
        throw new Error('Supplier name cannot exceed 200 characters')
      }
      this._name = data.name.trim()
    }

    if (data.contactName !== undefined) {
      this._contactName = data.contactName.trim() || undefined
    }

    if (data.phone !== undefined) {
      this._phone = data.phone.trim() || undefined
    }

    if (data.email !== undefined) {
      this._email = data.email
    }

    if (data.address !== undefined) {
      this._address = data.address.trim() || undefined
    }

    if (data.notes !== undefined) {
      this._notes = data.notes.trim()
    }

    this.markAsModified()
  }

  /**
   * Activa el proveedor
   */
  activate(): void {
    if (this._isActive) return
    this._isActive = true
    this.markAsModified()
  }

  /**
   * Desactiva el proveedor
   */
  deactivate(): void {
    if (!this._isActive) return
    this._isActive = false
    this.markAsModified()
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): {
    id: string
    name: string
    contactName?: string
    phone?: string
    email?: string
    address?: string
    notes: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    syncStatus: SyncStatus
    syncedAt?: Date
  } {
    return {
      id: this._id,
      name: this._name,
      contactName: this._contactName,
      phone: this._phone,
      email: this._email?.value,
      address: this._address,
      notes: this._notes,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

