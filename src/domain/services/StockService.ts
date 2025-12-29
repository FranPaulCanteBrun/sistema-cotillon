import { ProductVariant } from '../entities/ProductVariant'
import { StockMovement } from '../entities/StockMovement'
import { Quantity } from '../value-objects/Quantity'

/**
 * Resultado de verificación de disponibilidad de stock
 */
export interface StockAvailability {
  variantId: string
  available: boolean
  currentStock: number
  requested: number
  shortage: number
}

/**
 * Item para verificar stock
 */
export interface StockCheckItem {
  variantId: string
  variant: ProductVariant
  quantity: number
}

/**
 * Servicio de Dominio: StockService
 * 
 * Encapsula la lógica de negocio relacionada con el control de stock
 * que no pertenece a una entidad específica.
 */
export class StockService {
  /**
   * Verifica la disponibilidad de stock para múltiples items
   */
  checkAvailability(items: StockCheckItem[]): StockAvailability[] {
    return items.map((item) => {
      const currentStock = item.variant.currentStock.value
      const requested = item.quantity
      const shortage = Math.max(0, requested - currentStock)

      return {
        variantId: item.variantId,
        available: currentStock >= requested,
        currentStock,
        requested,
        shortage
      }
    })
  }

  /**
   * Verifica si hay stock suficiente para todos los items
   */
  hasStockForAll(items: StockCheckItem[]): boolean {
    return this.checkAvailability(items).every((check) => check.available)
  }

  /**
   * Obtiene los items sin stock suficiente
   */
  getItemsWithoutStock(items: StockCheckItem[]): StockAvailability[] {
    return this.checkAvailability(items).filter((check) => !check.available)
  }

  /**
   * Crea movimientos de stock para una venta
   */
  createSaleMovements(
    saleId: string,
    userId: string,
    items: Array<{ variant: ProductVariant; quantity: number }>
  ): StockMovement[] {
    return items.map((item) =>
      StockMovement.createSale({
        id: crypto.randomUUID(),
        variantId: item.variant.id,
        userId,
        quantity: Quantity.create(item.quantity),
        previousStock: item.variant.currentStock,
        saleId
      })
    )
  }

  /**
   * Crea movimiento de stock para ingreso de mercadería
   */
  createPurchaseMovement(
    variantId: string,
    userId: string,
    quantity: number,
    currentStock: Quantity,
    reason?: string
  ): StockMovement {
    return StockMovement.createPurchase({
      id: crypto.randomUUID(),
      variantId,
      userId,
      quantity: Quantity.create(quantity),
      previousStock: currentStock,
      reason
    })
  }

  /**
   * Crea movimiento de ajuste de stock
   */
  createAdjustmentMovement(
    variantId: string,
    userId: string,
    newStockValue: number,
    currentStock: Quantity,
    reason: string
  ): StockMovement {
    const newStock = Quantity.create(newStockValue)
    const difference = Math.abs(newStockValue - currentStock.value)

    return StockMovement.createAdjustment({
      id: crypto.randomUUID(),
      variantId,
      userId,
      quantity: Quantity.create(difference),
      previousStock: currentStock,
      newStock,
      reason
    })
  }

  /**
   * Verifica si una variante está por debajo del stock mínimo
   */
  isLowStock(variant: ProductVariant, minStock: Quantity): boolean {
    return variant.isLowStock(minStock)
  }

  /**
   * Calcula la cantidad a reponer para alcanzar el stock mínimo
   */
  calculateReorderQuantity(
    currentStock: Quantity,
    minStock: Quantity,
    reorderMultiple: number = 1
  ): Quantity {
    if (!currentStock.isBelowMinimum(minStock)) {
      return Quantity.zero()
    }

    const shortage = minStock.value - currentStock.value
    // Redondea hacia arriba al múltiplo más cercano
    const quantity = Math.ceil(shortage / reorderMultiple) * reorderMultiple

    return Quantity.create(quantity)
  }
}

