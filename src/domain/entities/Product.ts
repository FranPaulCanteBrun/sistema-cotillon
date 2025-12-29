import { Entity } from './Entity'
import { Money } from '../value-objects/Money'
import { Quantity } from '../value-objects/Quantity'
import type { SyncStatus } from '@shared/types'

/**
 * Props para crear un Producto
 */
export interface ProductProps {
  id: string
  code: string
  name: string
  description?: string
  categoryId: string
  supplierId?: string
  basePrice: Money
  minStock: Quantity
  isActive?: boolean
  imageUrl?: string
  createdAt?: Date
  updatedAt?: Date
  syncStatus?: SyncStatus
  syncedAt?: Date
}

export type ProductCreationProps = Omit<
  ProductProps,
  'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'syncedAt'
> &
  Partial<Pick<ProductProps, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'syncedAt'>>

/**
 * Entidad: Product (Producto)
 * 
 * Representa un producto base en el catálogo.
 * Un producto puede tener múltiples variantes (colores, tamaños).
 */
export class Product extends Entity {
  private _code: string
  private _name: string
  private _description: string
  private _categoryId: string
  private _supplierId?: string
  private _basePrice: Money
  private _minStock: Quantity
  private _isActive: boolean
  private _imageUrl?: string

  private constructor(props: ProductProps) {
    super(
      props.id,
      props.createdAt,
      props.updatedAt,
      props.syncStatus,
      props.syncedAt
    )
    this._code = props.code
    this._name = props.name
    this._description = props.description ?? ''
    this._categoryId = props.categoryId
    this._supplierId = props.supplierId
    this._basePrice = props.basePrice
    this._minStock = props.minStock
    this._isActive = props.isActive ?? true
    this._imageUrl = props.imageUrl
  }

  /**
   * Crea un nuevo producto
   */
  static create(props: ProductCreationProps): Product {
    if (!props.code || props.code.trim().length === 0) {
      throw new Error('Product code is required')
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Product name is required')
    }

    if (props.name.length > 200) {
      throw new Error('Product name cannot exceed 200 characters')
    }

    if (!props.categoryId) {
      throw new Error('Product category is required')
    }

    if (props.basePrice.isNegative()) {
      throw new Error('Base price cannot be negative')
    }

    const now = new Date()
    return new Product({
      id: props.id ?? crypto.randomUUID(),
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      description: props.description,
      categoryId: props.categoryId,
      supplierId: props.supplierId,
      basePrice: props.basePrice,
      minStock: props.minStock,
      isActive: props.isActive,
      imageUrl: props.imageUrl,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
      syncStatus: props.syncStatus ?? 'pending',
      syncedAt: props.syncedAt
    })
  }

  /**
   * Actualiza información básica en una sola operación
   */
  update(data: {
    code?: string
    name?: string
    description?: string
    categoryId?: string
    basePrice?: Money
    minStock?: Quantity
    imageUrl?: string
    supplierId?: string
    isActive?: boolean
  }): Product {
    if (data.code !== undefined) {
      if (!data.code.trim()) {
        throw new Error('Product code is required')
      }
      this._code = data.code.trim().toUpperCase()
      this.markAsModified()
    }
    if (data.name !== undefined || data.description !== undefined || data.imageUrl !== undefined) {
      this.updateInfo({
        name: data.name ?? this._name,
        description: data.description ?? this._description,
        imageUrl: data.imageUrl ?? this._imageUrl
      })
    }
    if (data.categoryId !== undefined) {
      this.changeCategory(data.categoryId)
    }
    if (data.basePrice !== undefined) {
      this.updateBasePrice(data.basePrice)
    }
    if (data.minStock !== undefined) {
      this.updateMinStock(data.minStock)
    }
    if (data.supplierId !== undefined) {
      data.supplierId ? this.assignSupplier(data.supplierId) : this.removeSupplier()
    }
    if (data.isActive !== undefined) {
      data.isActive ? this.activate() : this.deactivate()
    }
    return this
  }

  /**
   * Reconstruye un producto desde persistencia
   */
  static fromPersistence(props: ProductProps): Product {
    return new Product(props)
  }

  // Getters
  get code(): string {
    return this._code
  }

  get name(): string {
    return this._name
  }

  get description(): string {
    return this._description
  }

  get categoryId(): string {
    return this._categoryId
  }

  get supplierId(): string | undefined {
    return this._supplierId
  }

  get basePrice(): Money {
    return this._basePrice
  }

  get minStock(): Quantity {
    return this._minStock
  }

  get isActive(): boolean {
    return this._isActive
  }

  get imageUrl(): string | undefined {
    return this._imageUrl
  }

  // Métodos de negocio
  /**
   * Actualiza la información básica del producto
   */
  updateInfo(data: { name?: string; description?: string; imageUrl?: string }): void {
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new Error('Product name is required')
      }
      if (data.name.length > 200) {
        throw new Error('Product name cannot exceed 200 characters')
      }
      this._name = data.name.trim()
    }

    if (data.description !== undefined) {
      this._description = data.description.trim()
    }

    if (data.imageUrl !== undefined) {
      this._imageUrl = data.imageUrl || undefined
    }

    this.markAsModified()
  }

  /**
   * Actualiza el precio base
   */
  updateBasePrice(price: Money): void {
    if (price.isNegative()) {
      throw new Error('Base price cannot be negative')
    }
    this._basePrice = price
    this.markAsModified()
  }

  /**
   * Actualiza el stock mínimo
   */
  updateMinStock(quantity: Quantity): void {
    this._minStock = quantity
    this.markAsModified()
  }

  /**
   * Cambia la categoría del producto
   */
  changeCategory(categoryId: string): void {
    if (!categoryId) {
      throw new Error('Category ID is required')
    }
    this._categoryId = categoryId
    this.markAsModified()
  }

  /**
   * Asigna un proveedor
   */
  assignSupplier(supplierId: string): void {
    this._supplierId = supplierId
    this.markAsModified()
  }

  /**
   * Remueve el proveedor
   */
  removeSupplier(): void {
    this._supplierId = undefined
    this.markAsModified()
  }

  /**
   * Activa el producto
   */
  activate(): void {
    if (this._isActive) return
    this._isActive = true
    this.markAsModified()
  }

  /**
   * Desactiva el producto
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
    code: string
    name: string
    description: string
    categoryId: string
    supplierId?: string
    basePriceCents: number
    basePriceCurrency: string
    minStock: number
    isActive: boolean
    imageUrl?: string
    createdAt: Date
    updatedAt: Date
    syncStatus: SyncStatus
    syncedAt?: Date
  } {
    return {
      id: this._id,
      code: this._code,
      name: this._name,
      description: this._description,
      categoryId: this._categoryId,
      supplierId: this._supplierId,
      basePriceCents: this._basePrice.cents,
      basePriceCurrency: this._basePrice.currency,
      minStock: this._minStock.value,
      isActive: this._isActive,
      imageUrl: this._imageUrl,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      syncStatus: this._syncStatus,
      syncedAt: this._syncedAt
    }
  }
}

