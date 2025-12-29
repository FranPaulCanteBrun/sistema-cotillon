import { Entity } from './Entity'
import { Money } from '../value-objects/Money'
import { Percentage } from '../value-objects/Percentage'
import type { SyncStatus, SaleStatus, PaymentMethodType } from '@shared/types'

/**
 * Props para un item de venta
 */
export interface SaleItemProps {
  id: string
  variantId: string
  productName: string
  variantName: string
  quantity: number
  unitPrice: Money
  discount: Percentage
}

/**
 * Item de una venta
 */
export class SaleItem {
  readonly id: string
  readonly variantId: string
  readonly productName: string
  readonly variantName: string
  readonly quantity: number
  readonly unitPrice: Money
  readonly discount: Percentage

  constructor(props: SaleItemProps) {
    this.id = props.id
    this.variantId = props.variantId
    this.productName = props.productName
    this.variantName = props.variantName
    this.quantity = props.quantity
    this.unitPrice = props.unitPrice
    this.discount = props.discount
  }

  /**
   * Calcula el subtotal del item (precio * cantidad)
   */
  get subtotalBeforeDiscount(): Money {
    return this.unitPrice.multiply(this.quantity)
  }

  /**
   * Calcula el monto del descuento
   */
  get discountAmount(): Money {
    return this.subtotalBeforeDiscount.calculateDiscount(this.discount.value)
  }

  /**
   * Calcula el subtotal final (con descuento aplicado)
   */
  get subtotal(): Money {
    return this.subtotalBeforeDiscount.subtract(this.discountAmount)
  }
}

/**
 * Props para crear una Venta
 */
export interface SaleProps {
  id: string
  receiptNumber: string
  userId: string
  customerId?: string
  items: SaleItem[]
  paymentMethodId: string
  paymentMethodType: PaymentMethodType
  status: SaleStatus
  notes?: string
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

/**
 * Entidad: Sale (Venta)
 * 
 * Representa una venta completa con todos sus items.
 * Una vez completada, la venta es inmutable.
 */
export class Sale extends Entity {
  private _receiptNumber: string
  private _userId: string
  private _customerId?: string
  private _items: SaleItem[]
  private _paymentMethodId: string
  private _paymentMethodType: PaymentMethodType
  private _status: SaleStatus
  private _notes: string

  private constructor(props: SaleProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._receiptNumber = props.receiptNumber
    this._userId = props.userId
    this._customerId = props.customerId
    this._items = props.items
    this._paymentMethodId = props.paymentMethodId
    this._paymentMethodType = props.paymentMethodType
    this._status = props.status
    this._notes = props.notes ?? ''
  }

  /**
   * Crea una nueva venta
   */
  static create(props: SaleProps): Sale {
    if (!props.receiptNumber) {
      throw new Error('Receipt number is required')
    }

    if (!props.userId) {
      throw new Error('User ID is required')
    }

    if (!props.items || props.items.length === 0) {
      throw new Error('Sale must have at least one item')
    }

    if (!props.paymentMethodId) {
      throw new Error('Payment method is required')
    }

    return new Sale({
      ...props,
      status: props.status ?? 'pending'
    })
  }

  /**
   * Reconstruye una venta desde persistencia
   */
  static fromPersistence(props: SaleProps): Sale {
    return new Sale(props)
  }

  // Getters
  get receiptNumber(): string {
    return this._receiptNumber
  }

  get userId(): string {
    return this._userId
  }

  get customerId(): string | undefined {
    return this._customerId
  }

  get items(): readonly SaleItem[] {
    return this._items
  }

  get paymentMethodId(): string {
    return this._paymentMethodId
  }

  get paymentMethodType(): PaymentMethodType {
    return this._paymentMethodType
  }

  get status(): SaleStatus {
    return this._status
  }

  get notes(): string {
    return this._notes
  }

  /**
   * Cantidad total de items
   */
  get totalItems(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0)
  }

  /**
   * Subtotal antes de descuentos
   */
  get subtotal(): Money {
    return this._items.reduce(
      (sum, item) => sum.add(item.subtotalBeforeDiscount),
      Money.zero()
    )
  }

  /**
   * Total de descuentos
   */
  get totalDiscount(): Money {
    return this._items.reduce(
      (sum, item) => sum.add(item.discountAmount),
      Money.zero()
    )
  }

  /**
   * Total final de la venta
   */
  get total(): Money {
    return this._items.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero()
    )
  }

  // Métodos de negocio

  /**
   * Completa la venta
   */
  complete(): void {
    if (this._status === 'completed') {
      throw new Error('Sale is already completed')
    }

    if (this._status === 'cancelled') {
      throw new Error('Cannot complete a cancelled sale')
    }

    this._status = 'completed'
    this.markAsModified()
  }

  /**
   * Cancela la venta
   */
  cancel(): void {
    if (this._status === 'completed') {
      throw new Error('Cannot cancel a completed sale. Use refund instead.')
    }

    if (this._status === 'cancelled') {
      throw new Error('Sale is already cancelled')
    }

    this._status = 'cancelled'
    this.markAsModified()
  }

  /**
   * Registra un reembolso
   */
  refund(): void {
    if (this._status !== 'completed') {
      throw new Error('Only completed sales can be refunded')
    }

    this._status = 'refunded'
    this.markAsModified()
  }

  /**
   * Verifica si la venta puede ser modificada
   */
  get canBeModified(): boolean {
    return this._status === 'pending'
  }

  /**
   * Verifica si la venta está finalizada
   */
  get isFinalized(): boolean {
    return ['completed', 'cancelled', 'refunded'].includes(this._status)
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): {
    id: string
    receiptNumber: string
    userId: string
    customerId?: string
    items: Array<{
      id: string
      variantId: string
      productName: string
      variantName: string
      quantity: number
      unitPriceCents: number
      unitPriceCurrency: string
      discountPercentage: number
    }>
    paymentMethodId: string
    paymentMethodType: PaymentMethodType
    status: SaleStatus
    notes: string
    subtotalCents: number
    discountCents: number
    totalCents: number
    currency: string
    createdAt: Date
    updatedAt: Date
    syncStatus: SyncStatus
    syncedAt?: Date
  } {
    return {
      id: this._id,
      receiptNumber: this._receiptNumber,
      userId: this._userId,
      customerId: this._customerId,
      items: this._items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceCents: item.unitPrice.cents,
        unitPriceCurrency: item.unitPrice.currency,
        discountPercentage: item.discount.value
      })),
      paymentMethodId: this._paymentMethodId,
      paymentMethodType: this._paymentMethodType,
      status: this._status,
      notes: this._notes,
      subtotalCents: this.subtotal.cents,
      discountCents: this.totalDiscount.cents,
      totalCents: this.total.cents,
      currency: this.total.currency,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

