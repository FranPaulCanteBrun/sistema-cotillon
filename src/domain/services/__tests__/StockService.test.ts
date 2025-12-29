/**
 * Tests para StockService
 */

import { describe, it, expect } from 'vitest'
import { StockService } from '../StockService'
import { Product } from '../../entities/Product'
import { ProductVariant } from '../../entities/ProductVariant'
import { Money } from '../../value-objects/Money'
import { Quantity } from '../../value-objects/Quantity'
import { SKU } from '../../value-objects/SKU'

describe('StockService', () => {
  const stockService = new StockService()

  describe('checkAvailability', () => {
    it('debe verificar disponibilidad de stock para múltiples items', () => {
      const variant1 = ProductVariant.create({
        id: 'variant-1',
        productId: 'product-1',
        sku: SKU.create('TEST-001-RED'),
        currentStock: Quantity.create(10)
      })

      const variant2 = ProductVariant.create({
        id: 'variant-2',
        productId: 'product-1',
        sku: SKU.create('TEST-001-BLUE'),
        currentStock: Quantity.create(5)
      })

      const items = [
        { variantId: 'variant-1', variant: variant1, quantity: 8 },
        { variantId: 'variant-2', variant: variant2, quantity: 3 }
      ]

      const result = stockService.checkAvailability(items)
      
      expect(result).toHaveLength(2)
      expect(result[0].available).toBe(true)
      expect(result[1].available).toBe(true)
    })

    it('debe detectar cuando no hay stock suficiente', () => {
      const variant = ProductVariant.create({
        id: 'variant-1',
        productId: 'product-1',
        sku: SKU.create('TEST-001-RED'),
        currentStock: Quantity.create(5)
      })

      const items = [
        { variantId: 'variant-1', variant: variant, quantity: 10 }
      ]

      const result = stockService.checkAvailability(items)
      
      expect(result[0].available).toBe(false)
      expect(result[0].shortage).toBe(5)
    })
  })

  describe('checkAvailability', () => {
    it('debe verificar disponibilidad de stock para múltiples items', () => {
      const variant1 = ProductVariant.create({
        id: 'variant-1',
        productId: 'product-1',
        sku: SKU.create('TEST-001-RED'),
        currentStock: Quantity.create(10)
      })

      const variant2 = ProductVariant.create({
        id: 'variant-2',
        productId: 'product-1',
        sku: SKU.create('TEST-001-BLUE'),
        currentStock: Quantity.create(5)
      })

      const items = [
        { variantId: 'variant-1', variant: variant1, quantity: 8 },
        { variantId: 'variant-2', variant: variant2, quantity: 3 }
      ]

      const result = stockService.checkAvailability(items)
      
      expect(result).toHaveLength(2)
      expect(result[0].available).toBe(true)
      expect(result[1].available).toBe(true)
    })

    it('debe detectar cuando no hay stock suficiente', () => {
      const variant = ProductVariant.create({
        id: 'variant-1',
        productId: 'product-1',
        sku: SKU.create('TEST-001-RED'),
        currentStock: Quantity.create(5)
      })

      const items = [
        { variantId: 'variant-1', variant: variant, quantity: 10 }
      ]

      const result = stockService.checkAvailability(items)
      
      expect(result[0].available).toBe(false)
      expect(result[0].shortage).toBe(5)
    })
  })
})

