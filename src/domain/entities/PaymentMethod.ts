import { Entity } from './Entity'
import type { SyncStatus, PaymentMethodType } from '@shared/types'

/**
 * Configuración específica para cada tipo de método de pago
 */
export interface PaymentMethodConfig {
  // Para tarjetas
  requiresCardType?: boolean
  acceptedCardTypes?: string[]
  
  // Para QR/Mercado Pago
  merchantId?: string
  accessToken?: string
  
  // Comisiones
  commissionPercentage?: number
  fixedFee?: number
}

/**
 * Props para crear un Método de Pago
 */
export interface PaymentMethodProps {
  id: string
  name: string
  type: PaymentMethodType
  isActive?: boolean
  config?: PaymentMethodConfig
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

/**
 * Entidad: PaymentMethod (Método de Pago)
 * 
 * Representa un método de pago configurado en el sistema.
 */
export class PaymentMethod extends Entity {
  private _name: string
  private _type: PaymentMethodType
  private _isActive: boolean
  private _config: PaymentMethodConfig

  private constructor(props: PaymentMethodProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._name = props.name
    this._type = props.type
    this._isActive = props.isActive ?? true
    this._config = props.config ?? {}
  }

  /**
   * Crea un nuevo método de pago
   */
  static create(props: PaymentMethodProps): PaymentMethod {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Payment method name is required')
    }

    return new PaymentMethod({
      ...props,
      name: props.name.trim()
    })
  }

  /**
   * Crea los métodos de pago por defecto
   */
  static createDefaults(): PaymentMethod[] {
    return [
      PaymentMethod.create({
        id: crypto.randomUUID(),
        name: 'Efectivo',
        type: 'cash',
        isActive: true
      }),
      PaymentMethod.create({
        id: crypto.randomUUID(),
        name: 'Tarjeta de Débito',
        type: 'debit',
        isActive: true
      }),
      PaymentMethod.create({
        id: crypto.randomUUID(),
        name: 'Tarjeta de Crédito',
        type: 'credit',
        isActive: true
      }),
      PaymentMethod.create({
        id: crypto.randomUUID(),
        name: 'Transferencia',
        type: 'transfer',
        isActive: true
      }),
      PaymentMethod.create({
        id: crypto.randomUUID(),
        name: 'Mercado Pago',
        type: 'qr',
        isActive: true
      })
    ]
  }

  /**
   * Reconstruye desde persistencia
   */
  static fromPersistence(props: PaymentMethodProps): PaymentMethod {
    return new PaymentMethod(props)
  }

  // Getters
  get name(): string {
    return this._name
  }

  get type(): PaymentMethodType {
    return this._type
  }

  get isActive(): boolean {
    return this._isActive
  }

  get config(): PaymentMethodConfig {
    return { ...this._config }
  }

  /**
   * Verifica si requiere procesamiento externo
   */
  get requiresExternalProcessing(): boolean {
    return ['credit', 'debit', 'qr'].includes(this._type)
  }

  /**
   * Verifica si es efectivo
   */
  get isCash(): boolean {
    return this._type === 'cash'
  }

  // Métodos de negocio

  /**
   * Actualiza el nombre
   */
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Payment method name is required')
    }
    this._name = name.trim()
    this.markAsModified()
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(config: PaymentMethodConfig): void {
    this._config = { ...this._config, ...config }
    this.markAsModified()
  }

  /**
   * Activa el método de pago
   */
  activate(): void {
    if (this._isActive) return
    this._isActive = true
    this.markAsModified()
  }

  /**
   * Desactiva el método de pago
   */
  deactivate(): void {
    if (!this._isActive) return
    this._isActive = false
    this.markAsModified()
  }

  /**
   * Calcula la comisión para un monto dado
   */
  calculateCommission(amount: number): number {
    let commission = 0

    if (this._config.commissionPercentage) {
      commission += amount * (this._config.commissionPercentage / 100)
    }

    if (this._config.fixedFee) {
      commission += this._config.fixedFee
    }

    return Math.round(commission * 100) / 100
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): PaymentMethodProps & { config: string } {
    return {
      id: this._id,
      name: this._name,
      type: this._type,
      isActive: this._isActive,
      config: JSON.stringify(this._config),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

