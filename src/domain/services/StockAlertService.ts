/**
 * Servicio de alertas de stock
 * Detecta y gestiona alertas cuando el stock baja del mínimo
 */

import type { ProductVariant } from '../entities/ProductVariant'
import type { Product } from '../entities/Product'
import { Quantity } from '../value-objects/Quantity'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface StockAlert {
  id: string
  variantId: string
  productId: string
  productName: string
  variantName: string
  currentStock: number
  minStock: number
  severity: AlertSeverity
  createdAt: Date
  acknowledgedAt?: Date
  isAcknowledged: boolean
}

export class StockAlertService {
  /**
   * Calcula la severidad de la alerta basándose en el porcentaje de stock restante
   */
  private calculateSeverity(currentStock: number, minStock: number): AlertSeverity {
    if (currentStock === 0) {
      return 'critical'
    }
    
    const percentage = (currentStock / minStock) * 100
    
    if (percentage < 25) {
      return 'critical'
    } else if (percentage < 50) {
      return 'warning'
    }
    
    return 'info'
  }

  /**
   * Crea una alerta de stock bajo
   */
  createAlert(
    variant: ProductVariant,
    product: Product
  ): StockAlert {
    const variantName = [variant.color, variant.size]
      .filter(Boolean)
      .join(' - ') || 'Estándar'

    return {
      id: `${variant.id}-${Date.now()}`,
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantName,
      currentStock: variant.currentStock.value,
      minStock: product.minStock.value,
      severity: this.calculateSeverity(
        variant.currentStock.value,
        product.minStock.value
      ),
      createdAt: new Date(),
      isAcknowledged: false
    }
  }

  /**
   * Verifica si una variante necesita una alerta
   */
  needsAlert(variant: ProductVariant, product: Product): boolean {
    return variant.currentStock.value <= product.minStock.value
  }

  /**
   * Obtiene el mensaje de la alerta
   */
  getAlertMessage(alert: StockAlert): string {
    if (alert.currentStock === 0) {
      return `${alert.productName} (${alert.variantName}) está sin stock`
    }
    
    const percentage = Math.round((alert.currentStock / alert.minStock) * 100)
    return `${alert.productName} (${alert.variantName}) tiene stock bajo: ${alert.currentStock} unidades (${percentage}% del mínimo)`
  }

  /**
   * Obtiene el título de la alerta
   */
  getAlertTitle(alert: StockAlert): string {
    if (alert.currentStock === 0) {
      return 'Stock agotado'
    }
    return 'Stock bajo'
  }
}

export const stockAlertService = new StockAlertService()

