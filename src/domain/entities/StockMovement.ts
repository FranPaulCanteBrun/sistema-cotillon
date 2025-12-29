import { Entity } from './Entity'
import { Quantity } from '../value-objects/Quantity'
import type { SyncStatus, StockMovementType } from '@shared/types'

/**
 * Props para crear un Movimiento de Stock
 */
export interface StockMovementProps {
  id: string
  variantId: string
  userId: string
  type: StockMovementType
  quantity: Quantity
  previousStock: Quantity
  newStock: Quantity
  reason: string
  referenceId?: string  // ID de la venta, compra, etc.
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

/**
 * Entidad: StockMovement (Movimiento de Stock)
 * 
 * Registra cada movimiento de stock para trazabilidad completa.
 * Es inmutable una vez creado.
 */
export class StockMovement extends Entity {
  private readonly _variantId: string
  private readonly _userId: string
  private readonly _type: StockMovementType
  private readonly _quantity: Quantity
  private readonly _previousStock: Quantity
  private readonly _newStock: Quantity
  private readonly _reason: string
  private readonly _referenceId?: string

  private constructor(props: StockMovementProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._variantId = props.variantId
    this._userId = props.userId
    this._type = props.type
    this._quantity = props.quantity
    this._previousStock = props.previousStock
    this._newStock = props.newStock
    this._reason = props.reason
    this._referenceId = props.referenceId
  }

  /**
   * Crea un movimiento de entrada (compra/ingreso)
   */
  static createPurchase(props: {
    id: string
    variantId: string
    userId: string
    quantity: Quantity
    previousStock: Quantity
    reason?: string
    referenceId?: string
  }): StockMovement {
    const newStock = props.previousStock.add(props.quantity)
    const now = new Date()
    
    return new StockMovement({
      ...props,
      type: 'purchase',
      newStock,
      reason: props.reason ?? 'Ingreso de mercadería',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    })
  }

  /**
   * Crea un movimiento de salida por venta
   */
  static createSale(props: {
    id: string
    variantId: string
    userId: string
    quantity: Quantity
    previousStock: Quantity
    saleId: string
  }): StockMovement {
    const newStock = props.previousStock.subtract(props.quantity)
    const now = new Date()
    
    return new StockMovement({
      id: props.id,
      variantId: props.variantId,
      userId: props.userId,
      type: 'sale',
      quantity: props.quantity,
      previousStock: props.previousStock,
      newStock,
      reason: 'Venta',
      referenceId: props.saleId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    })
  }

  /**
   * Crea un movimiento de ajuste manual
   */
  static createAdjustment(props: {
    id: string
    variantId: string
    userId: string
    quantity: Quantity
    previousStock: Quantity
    newStock: Quantity
    reason: string
  }): StockMovement {
    const now = new Date()
    
    return new StockMovement({
      ...props,
      type: 'adjustment',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    })
  }

  /**
   * Crea un movimiento de devolución
   */
  static createReturn(props: {
    id: string
    variantId: string
    userId: string
    quantity: Quantity
    previousStock: Quantity
    saleId: string
    reason?: string
  }): StockMovement {
    const newStock = props.previousStock.add(props.quantity)
    const now = new Date()
    
    return new StockMovement({
      id: props.id,
      variantId: props.variantId,
      userId: props.userId,
      type: 'return',
      quantity: props.quantity,
      previousStock: props.previousStock,
      newStock,
      reason: props.reason ?? 'Devolución de cliente',
      referenceId: props.saleId,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    })
  }

  /**
   * Crea un movimiento por daño/pérdida
   */
  static createDamage(props: {
    id: string
    variantId: string
    userId: string
    quantity: Quantity
    previousStock: Quantity
    reason: string
  }): StockMovement {
    const newStock = props.previousStock.subtract(props.quantity)
    const now = new Date()
    
    return new StockMovement({
      ...props,
      type: 'damage',
      newStock,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    })
  }

  /**
   * Reconstruye desde persistencia
   */
  static fromPersistence(props: StockMovementProps): StockMovement {
    return new StockMovement(props)
  }

  // Getters
  get variantId(): string {
    return this._variantId
  }

  get userId(): string {
    return this._userId
  }

  get type(): StockMovementType {
    return this._type
  }

  get quantity(): Quantity {
    return this._quantity
  }

  get previousStock(): Quantity {
    return this._previousStock
  }

  get newStock(): Quantity {
    return this._newStock
  }

  get reason(): string {
    return this._reason
  }

  get referenceId(): string | undefined {
    return this._referenceId
  }

  /**
   * Verifica si es un movimiento de entrada (aumenta stock)
   */
  get isInbound(): boolean {
    return ['purchase', 'return'].includes(this._type)
  }

  /**
   * Verifica si es un movimiento de salida (disminuye stock)
   */
  get isOutbound(): boolean {
    return ['sale', 'damage'].includes(this._type)
  }

  /**
   * Calcula la diferencia de stock
   */
  get stockDifference(): number {
    return this._newStock.value - this._previousStock.value
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): {
    id: string
    variantId: string
    userId: string
    type: StockMovementType
    quantity: number
    previousStock: number
    newStock: number
    reason: string
    referenceId?: string
    createdAt: Date
    updatedAt: Date
    syncStatus: SyncStatus
    syncedAt?: Date
  } {
    return {
      id: this._id,
      variantId: this._variantId,
      userId: this._userId,
      type: this._type,
      quantity: this._quantity.value,
      previousStock: this._previousStock.value,
      newStock: this._newStock.value,
      reason: this._reason,
      referenceId: this._referenceId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

