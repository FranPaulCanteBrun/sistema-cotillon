/**
 * Tests para la entidad Product
 */

import { describe, it, expect } from 'vitest'
import { Product } from '../Product'
import { Money } from '../../value-objects/Money'
import { Quantity } from '../../value-objects/Quantity'

describe('Product', () => {
  describe('create', () => {
    it('debe crear un producto válido', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'TEST-001',
        name: 'Producto de prueba',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10)
      })

      expect(product.id).toBe('test-id')
      expect(product.code).toBe('TEST-001')
      expect(product.name).toBe('Producto de prueba')
      expect(product.basePrice.amount).toBe(100)
      expect(product.minStock.value).toBe(10)
      expect(product.isActive).toBe(true)
    })

    it('debe normalizar el código a mayúsculas', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'test-001',
        name: 'Producto',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10)
      })

      expect(product.code).toBe('TEST-001')
    })

    it('debe lanzar error si el código está vacío', () => {
      expect(() => {
        Product.create({
          id: 'test-id',
          code: '',
          name: 'Producto',
          categoryId: 'category-id',
          basePrice: Money.create(100),
          minStock: Quantity.create(10)
        })
      }).toThrow('Product code is required')
    })

    it('debe lanzar error si el nombre está vacío', () => {
      expect(() => {
        Product.create({
          id: 'test-id',
          code: 'TEST-001',
          name: '',
          categoryId: 'category-id',
          basePrice: Money.create(100),
          minStock: Quantity.create(10)
        })
      }).toThrow('Product name is required')
    })

    it('debe lanzar error si el nombre excede 200 caracteres', () => {
      const longName = 'a'.repeat(201)
      expect(() => {
        Product.create({
          id: 'test-id',
          code: 'TEST-001',
          name: longName,
          categoryId: 'category-id',
          basePrice: Money.create(100),
          minStock: Quantity.create(10)
        })
      }).toThrow('Product name cannot exceed 200 characters')
    })

    it('debe lanzar error si el precio base es negativo', () => {
      expect(() => {
        Product.create({
          id: 'test-id',
          code: 'TEST-001',
          name: 'Producto',
          categoryId: 'category-id',
          basePrice: Money.create(-10),
          minStock: Quantity.create(10)
        })
      }).toThrow('Base price cannot be negative')
    })

    it('debe lanzar error si no tiene categoría', () => {
      expect(() => {
        Product.create({
          id: 'test-id',
          code: 'TEST-001',
          name: 'Producto',
          categoryId: '',
          basePrice: Money.create(100),
          minStock: Quantity.create(10)
        })
      }).toThrow('Product category is required')
    })
  })

  describe('update', () => {
    it('debe actualizar el nombre del producto', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'TEST-001',
        name: 'Producto Original',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10)
      })

      const updated = product.update({
        name: 'Producto Actualizado'
      })

      expect(updated.name).toBe('Producto Actualizado')
      expect(updated.code).toBe('TEST-001') // No cambió
    })

    it('debe actualizar el precio base', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'TEST-001',
        name: 'Producto',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10)
      })

      const updated = product.update({
        basePrice: Money.create(150)
      })

      expect(updated.basePrice.amount).toBe(150)
    })

    it('debe actualizar el stock mínimo', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'TEST-001',
        name: 'Producto',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10)
      })

      const updated = product.update({
        minStock: Quantity.create(20)
      })

      expect(updated.minStock.value).toBe(20)
    })
  })

  describe('activate/deactivate', () => {
    it('debe desactivar un producto activo', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'TEST-001',
        name: 'Producto',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10)
      })

      expect(product.isActive).toBe(true)
      product.deactivate()
      expect(product.isActive).toBe(false)
    })

    it('debe activar un producto inactivo', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'TEST-001',
        name: 'Producto',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10),
        isActive: false
      })

      expect(product.isActive).toBe(false)
      product.activate()
      expect(product.isActive).toBe(true)
    })
  })
})

