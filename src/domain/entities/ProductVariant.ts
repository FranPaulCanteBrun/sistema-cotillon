import { Entity } from './Entity'
import { Money } from '../value-objects/Money'
import { SKU } from '../value-objects/SKU'
import { Quantity } from '../value-objects/Quantity'
import type { SyncStatus } from '@shared/types'

/**
 * Props para crear una Variante de Producto
 */
export interface ProductVariantProps {
  id: string
  productId: string
  sku: SKU
  color?: string
  size?: string
  price?: Money  // Si es null, usa el precio base del producto
  currentStock: Quantity
  barcode?: string
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

export type ProductVariantCreationProps = Omit<
  ProductVariantProps,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'syncedAt'
> &
  Partial<Pick<ProductVariantProps, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'syncedAt'>>

/**
 * Entidad: ProductVariant (Variante de Producto)
 * 
 * Representa una variante específica de un producto.
 * Ejemplo: "Globo Perlado 12" - Color Rojo"
 */
export class ProductVariant extends Entity {
  private _productId: string
  private _sku: SKU
  private _color?: string
  private _size?: string
  private _price?: Money
  private _currentStock: Quantity
  private _barcode?: string
  private _isActive: boolean

  private constructor(props: ProductVariantProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._productId = props.productId
    this._sku = props.sku
    this._color = props.color
    this._size = props.size
    this._price = props.price
    this._currentStock = props.currentStock
    this._barcode = props.barcode
    this._isActive = props.isActive ?? true
  }

  /**
   * Crea una nueva variante
   */
  static create(props: ProductVariantCreationProps): ProductVariant {
    if (!props.productId) {
      throw new Error('Product ID is required')
    }

    if (props.price && props.price.isNegative()) {
      throw new Error('Price cannot be negative')
    }

    const now = new Date()
    return new ProductVariant({
      id: props.id ?? crypto.randomUUID(),
      productId: props.productId,
      sku: props.sku,
      color: props.color,
      size: props.size,
      price: props.price,
      currentStock: props.currentStock,
      barcode: props.barcode,
      isActive: props.isActive,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
      syncStatus: props.syncStatus ?? 'pending',
      syncedAt: props.syncedAt
    })
  }

  /**
   * Reconstruye una variante desde persistencia
   */
  static fromPersistence(props: ProductVariantProps): ProductVariant {
    return new ProductVariant(props)
  }

  // Getters
  get productId(): string {
    return this._productId
  }

  get sku(): SKU {
    return this._sku
  }

  get color(): string | undefined {
    return this._color
  }

  get size(): string | undefined {
    return this._size
  }

  get price(): Money | undefined {
    return this._price
  }

  get currentStock(): Quantity {
    return this._currentStock
  }

  get barcode(): string | undefined {
    return this._barcode
  }

  get isActive(): boolean {
    return this._isActive
  }

  /**
   * Obtiene el nombre de la variante (color + tamaño)
   */
  get variantName(): string {
    const parts: string[] = []
    if (this._color) parts.push(this._color)
    if (this._size) parts.push(this._size)
    return parts.join(' - ') || 'Estándar'
  }

  // Métodos de negocio

  /**
   * Verifica si tiene stock suficiente para una cantidad
   */
  hasStockFor(quantity: Quantity): boolean {
    return this._currentStock.isEnoughFor(quantity)
  }

  /**
   * Verifica si el stock está por debajo del mínimo
   */
  isLowStock(minStock: Quantity): boolean {
    return this._currentStock.isBelowMinimum(minStock)
  }

  /**
   * Incrementa el stock (entrada de mercadería)
   */
  addStock(quantity: Quantity): void {
    this._currentStock = this._currentStock.add(quantity)
    this.markAsModified()
  }

  /**
   * Decrementa el stock (venta o ajuste)
   */
  removeStock(quantity: Quantity): void {
    if (!this.hasStockFor(quantity)) {
      throw new Error(
        `Insufficient stock. Available: ${this._currentStock.value}, Required: ${quantity.value}`
      )
    }
    this._currentStock = this._currentStock.subtract(quantity)
    this.markAsModified()
  }

  /**
   * Ajusta el stock a una cantidad específica
   */
  adjustStock(newQuantity: Quantity): void {
    this._currentStock = newQuantity
    this.markAsModified()
  }

  /**
   * Actualiza el precio de la variante
   */
  updatePrice(price: Money | undefined): void {
    if (price && price.isNegative()) {
      throw new Error('Price cannot be negative')
    }
    this._price = price
    this.markAsModified()
  }

  /**
   * Actualiza el código de barras
   */
  updateBarcode(barcode: string | undefined): void {
    this._barcode = barcode?.trim() || undefined
    this.markAsModified()
  }

  /**
   * Actualiza color y tamaño
   */
  updateAttributes(data: { color?: string; size?: string }): void {
    if (data.color !== undefined) {
      this._color = data.color.trim() || undefined
    }
    if (data.size !== undefined) {
      this._size = data.size.trim() || undefined
    }
    this.markAsModified()
  }

  /**
   * Activa la variante
   */
  activate(): void {
    if (this._isActive) return
    this._isActive = true
    this.markAsModified()
  }

  /**
   * Desactiva la variante
   */
  deactivate(): void {
    if (!this._isActive) return
    this._isActive = false
    this.markAsModified()
  }

  /**
   * Actualiza múltiples campos de la variante
   */
  update(data: {
    sku?: SKU
    color?: string | null
    size?: string | null
    price?: Money | null
    barcode?: string | null
    isActive?: boolean
  }): ProductVariant {
    if (data.sku !== undefined) {
      this._sku = data.sku
      this.markAsModified()
    }
    if (data.color !== undefined) {
      this._color = data.color?.trim() || undefined
      this.markAsModified()
    }
    if (data.size !== undefined) {
      this._size = data.size?.trim() || undefined
      this.markAsModified()
    }
    if (data.price !== undefined) {
      this.updatePrice(data.price || undefined)
    }
    if (data.barcode !== undefined) {
      this.updateBarcode(data.barcode || undefined)
    }
    if (data.isActive !== undefined) {
      data.isActive ? this.activate() : this.deactivate()
    }
    return this
  }

  /**
   * Serializa para persistencia
   */
  toPersistence(): {
    id: string
    productId: string
    sku: string
    color?: string
    size?: string
    priceCents?: number
    priceCurrency?: string
    currentStock: number
    barcode?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    syncStatus: SyncStatus
    syncedAt?: Date
  } {
    return {
      id: this._id,
      productId: this._productId,
      sku: this._sku.value,
      color: this._color,
      size: this._size,
      priceCents: this._price?.cents,
      priceCurrency: this._price?.currency,
      currentStock: this._currentStock.value,
      barcode: this._barcode,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

