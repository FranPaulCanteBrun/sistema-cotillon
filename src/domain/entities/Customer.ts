import { Entity } from './Entity'
import { Email } from '../value-objects/Email'
import type { SyncStatus } from '@shared/types'

/**
 * Props para crear un Cliente
 */
export interface CustomerProps {
  id: string
  name: string
  documentNumber?: string
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
 * Entidad: Customer (Cliente)
 * 
 * Representa un cliente de la tienda.
 * Es opcional en las ventas (consumidor final).
 */
export class Customer extends Entity {
  private _name: string
  private _documentNumber?: string
  private _phone?: string
  private _email?: Email | null
  private _address?: string
  private _notes: string
  private _isActive: boolean

  private constructor(props: CustomerProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._name = props.name
    this._documentNumber = props.documentNumber
    this._phone = props.phone
    this._email = props.email
    this._address = props.address
    this._notes = props.notes ?? ''
    this._isActive = props.isActive ?? true
  }

  /**
   * Crea un nuevo cliente
   */
  static create(props: CustomerProps): Customer {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Customer name is required')
    }

    if (props.name.length > 200) {
      throw new Error('Customer name cannot exceed 200 characters')
    }

    return new Customer({
      ...props,
      name: props.name.trim()
    })
  }

  /**
   * Reconstruye desde persistencia
   */
  static fromPersistence(props: CustomerProps): Customer {
    return new Customer(props)
  }

  // Getters
  get name(): string {
    return this._name
  }

  get documentNumber(): string | undefined {
    return this._documentNumber
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

  /**
   * Obtiene el nombre para mostrar (nombre + documento si existe)
   */
  get displayName(): string {
    if (this._documentNumber) {
      return `${this._name} (${this._documentNumber})`
    }
    return this._name
  }

  // Métodos de negocio

  /**
   * Actualiza la información del cliente
   */
  updateInfo(data: {
    name?: string
    documentNumber?: string
    phone?: string
    email?: Email | null
    address?: string
    notes?: string
  }): void {
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error('Customer name is required')
      }
      if (data.name.length > 200) {
        throw new Error('Customer name cannot exceed 200 characters')
      }
      this._name = data.name.trim()
    }

    if (data.documentNumber !== undefined) {
      this._documentNumber = data.documentNumber.trim() || undefined
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
   * Activa el cliente
   */
  activate(): void {
    if (this._isActive) return
    this._isActive = true
    this.markAsModified()
  }

  /**
   * Desactiva el cliente
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
    documentNumber?: string
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
      documentNumber: this._documentNumber,
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

