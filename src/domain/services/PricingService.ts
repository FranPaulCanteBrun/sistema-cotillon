import { Money } from '../value-objects/Money'
import { Percentage } from '../value-objects/Percentage'
import type { Product } from '../entities/Product'
import type { ProductVariant } from '../entities/ProductVariant'

/**
 * Item para cálculo de precio
 */
export interface PriceCalculationItem {
  product: Product
  variant: ProductVariant
  quantity: number
  discountPercentage?: number
}

/**
 * Resultado del cálculo de precio
 */
export interface PriceCalculationResult {
  unitPrice: Money
  quantity: number
  subtotal: Money
  discount: Money
  total: Money
}

/**
 * Resumen de cálculo para múltiples items
 */
export interface CartSummary {
  items: PriceCalculationResult[]
  subtotal: Money
  totalDiscount: Money
  total: Money
  itemCount: number
}

/**
 * Servicio de Dominio: PricingService
 * 
 * Encapsula la lógica de cálculo de precios.
 */
export class PricingService {
  /**
   * Obtiene el precio efectivo de una variante
   * (usa precio de variante si existe, sino el base del producto)
   */
  getEffectivePrice(product: Product, variant: ProductVariant): Money {
    return variant.price ?? product.basePrice
  }

  /**
   * Calcula el precio de un item con descuento
   */
  calculateItemPrice(item: PriceCalculationItem): PriceCalculationResult {
    const unitPrice = this.getEffectivePrice(item.product, item.variant)
    const subtotal = unitPrice.multiply(item.quantity)

    const discountPercentage = Percentage.create(item.discountPercentage ?? 0)
    const discount = subtotal.calculateDiscount(discountPercentage.value)
    const total = subtotal.subtract(discount)

    return {
      unitPrice,
      quantity: item.quantity,
      subtotal,
      discount,
      total
    }
  }

  /**
   * Calcula el resumen de un carrito de compras
   */
  calculateCartSummary(items: PriceCalculationItem[]): CartSummary {
    const calculatedItems = items.map((item) => this.calculateItemPrice(item))

    const subtotal = calculatedItems.reduce(
      (sum, item) => sum.add(item.subtotal),
      Money.zero()
    )

    const totalDiscount = calculatedItems.reduce(
      (sum, item) => sum.add(item.discount),
      Money.zero()
    )

    const total = calculatedItems.reduce(
      (sum, item) => sum.add(item.total),
      Money.zero()
    )

    const itemCount = calculatedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    )

    return {
      items: calculatedItems,
      subtotal,
      totalDiscount,
      total,
      itemCount
    }
  }

  /**
   * Calcula el porcentaje de margen de ganancia
   */
  calculateMarginPercentage(costPrice: Money, salePrice: Money): Percentage {
    if (costPrice.isZero()) {
      return Percentage.full()
    }

    const margin = salePrice.subtract(costPrice)
    const marginPercentage = (margin.amount / costPrice.amount) * 100

    return Percentage.create(Math.min(100, Math.max(0, marginPercentage)))
  }

  /**
   * Sugiere un precio de venta basado en el costo y margen deseado
   */
  suggestSalePrice(costPrice: Money, desiredMarginPercentage: Percentage): Money {
    const multiplier = 1 + desiredMarginPercentage.decimal
    return costPrice.multiply(multiplier)
  }

  /**
   * Aplica un descuento global a un total
   */
  applyGlobalDiscount(total: Money, discountPercentage: Percentage): Money {
    return total.applyDiscount(discountPercentage.value)
  }
}

