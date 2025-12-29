import { Entity } from './Entity'
import { Email } from '../value-objects/Email'
import type { SyncStatus, UserRole } from '@shared/types'

/**
 * Props para crear un Usuario
 */
export interface UserProps {
  id: string
  name: string
  email: Email
  passwordHash?: string
  role: UserRole
  isActive?: boolean
  lastLoginAt?: Date
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

/**
 * Entidad: User (Usuario)
 * 
 * Representa un usuario del sistema con su rol y permisos.
 */
export class User extends Entity {
  private _name: string
  private _email: Email
  private _passwordHash?: string
  private _role: UserRole
  private _isActive: boolean
  private _lastLoginAt?: Date

  private constructor(props: UserProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._name = props.name
    this._email = props.email
    this._passwordHash = props.passwordHash
    this._role = props.role
    this._isActive = props.isActive ?? true
    this._lastLoginAt = props.lastLoginAt
  }

  /**
   * Crea un nuevo usuario
   */
  static create(props: UserProps): User {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('User name is required')
    }

    if (props.name.length > 100) {
      throw new Error('User name cannot exceed 100 characters')
    }

    return new User({
      ...props,
      name: props.name.trim()
    })
  }

  /**
   * Crea el usuario administrador por defecto
   */
  static createDefaultAdmin(): User {
    return User.create({
      id: crypto.randomUUID(),
      name: 'Administrador',
      email: Email.create('admin@cotillon.local'),
      role: 'admin',
      isActive: true
    })
  }

  /**
   * Reconstruye desde persistencia
   */
  static fromPersistence(props: UserProps): User {
    return new User(props)
  }

  // Getters
  get name(): string {
    return this._name
  }

  get email(): Email {
    return this._email
  }

  get role(): UserRole {
    return this._role
  }

  get isActive(): boolean {
    return this._isActive
  }

  get lastLoginAt(): Date | undefined {
    return this._lastLoginAt
  }

  /**
   * Verifica si es administrador
   */
  get isAdmin(): boolean {
    return this._role === 'admin'
  }

  /**
   * Verifica si puede vender
   */
  get canSell(): boolean {
    return ['admin', 'seller'].includes(this._role)
  }

  /**
   * Verifica si puede ver reportes
   */
  get canViewReports(): boolean {
    return ['admin', 'viewer'].includes(this._role)
  }

  /**
   * Verifica si puede modificar inventario
   */
  get canModifyInventory(): boolean {
    return this._role === 'admin'
  }

  // Métodos de negocio

  /**
   * Actualiza el nombre
   */
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('User name is required')
    }
    if (name.length > 100) {
      throw new Error('User name cannot exceed 100 characters')
    }
    this._name = name.trim()
    this.markAsModified()
  }

  /**
   * Actualiza el email
   */
  updateEmail(email: Email): void {
    this._email = email
    this.markAsModified()
  }

  /**
   * Actualiza el hash de contraseña
   */
  updatePassword(passwordHash: string): void {
    this._passwordHash = passwordHash
    this.markAsModified()
  }

  /**
   * Cambia el rol del usuario
   */
  changeRole(role: UserRole): void {
    this._role = role
    this.markAsModified()
  }

  /**
   * Registra un login exitoso
   */
  recordLogin(): void {
    this._lastLoginAt = new Date()
    this.markAsModified()
  }

  /**
   * Activa el usuario
   */
  activate(): void {
    if (this._isActive) return
    this._isActive = true
    this.markAsModified()
  }

  /**
   * Desactiva el usuario
   */
  deactivate(): void {
    if (!this._isActive) return
    this._isActive = false
    this.markAsModified()
  }

  /**
   * Serializa para persistencia (sin password hash para seguridad)
   */
  toPersistence(): {
    id: string
    name: string
    email: string
    passwordHash?: string
    role: UserRole
    isActive: boolean
    lastLoginAt?: Date
    createdAt: Date
    updatedAt: Date
    syncStatus: SyncStatus
    syncedAt?: Date
  } {
    return {
      id: this._id,
      name: this._name,
      email: this._email.value,
      passwordHash: this._passwordHash,
      role: this._role,
      isActive: this._isActive,
      lastLoginAt: this._lastLoginAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

