import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { SaleMapper } from '../indexeddb/mappers/SaleMapper'
import type { Sale } from '@domain/entities/Sale'

export interface SalesByPeriodParams {
  from: Date
  to: Date
}

export interface SalesByPeriodResult {
  totalSales: number
  totalAmount: number
  totalItems: number
  averageSale: number
  sales: Sale[]
}

export interface TopProduct {
  variantId: string
  productName: string
  variantName: string
  totalQuantity: number
  totalRevenue: number
  saleCount: number
}

export interface SalesByCategory {
  categoryId: string
  categoryName: string
  totalSales: number
  totalAmount: number
  itemCount: number
}

export interface SalesByPaymentMethod {
  paymentMethodId: string
  paymentMethodType: string
  totalSales: number
  totalAmount: number
}

/**
 * Hook para obtener ventas por período
 */
export function useSalesByPeriod({ from, to }: SalesByPeriodParams) {
  const records = useLiveQuery(async () => {
    const fromTime = from.getTime()
    const toTime = to.getTime()
    
    // Obtener todas las ventas y filtrar por fecha
    const allSales = await db.sales
      .where('status')
      .equals('completed')
      .toArray()
    
    return allSales.filter(sale => {
      const saleTime = sale.createdAt.getTime()
      return saleTime >= fromTime && saleTime <= toTime
    })
  }, [from, to])

  const result = useMemo<SalesByPeriodResult>(() => {
    if (!records) {
      return {
        totalSales: 0,
        totalAmount: 0,
        totalItems: 0,
        averageSale: 0,
        sales: []
      }
    }

    const sales = SaleMapper.toDomainList(records)
    const totalSales = sales.length
    const totalAmount = sales.reduce((sum, s) => sum + s.total.amount, 0)
    const totalItems = sales.reduce((sum, s) => sum + s.items.length, 0)
    const averageSale = totalSales > 0 ? totalAmount / totalSales : 0

    return {
      totalSales,
      totalAmount,
      totalItems,
      averageSale,
      sales
    }
  }, [records])

  return {
    ...result,
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener productos más vendidos
 */
export function useTopProducts({ from, to }: SalesByPeriodParams, limit: number = 10) {
  const salesData = useSalesByPeriod({ from, to })

  const topProducts = useMemo<TopProduct[]>(() => {
    if (!salesData.sales.length) return []

    const productMap = new Map<string, TopProduct>()

    salesData.sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.variantId
        const existing = productMap.get(key)

        if (existing) {
          existing.totalQuantity += item.quantity
          existing.totalRevenue += item.subtotal.amount
          existing.saleCount += 1
        } else {
          productMap.set(key, {
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            totalQuantity: item.quantity,
            totalRevenue: item.subtotal.amount,
            saleCount: 1
          })
        }
      })
    })

    return Array.from(productMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, limit)
  }, [salesData.sales, limit])

  return {
    topProducts,
    isLoading: salesData.isLoading
  }
}

/**
 * Hook para obtener ventas por categoría
 */
export function useSalesByCategory({ from, to }: SalesByPeriodParams) {
  const salesData = useSalesByPeriod({ from, to })

  // Obtener datos de referencia de forma reactiva
  const categories = useLiveQuery(() => db.categories.toArray())
  const products = useLiveQuery(() => db.products.toArray())
  const variants = useLiveQuery(() => db.productVariants.toArray())

  const salesByCategory = useMemo<SalesByCategory[]>(() => {
    if (!salesData.sales.length || !categories || !products || !variants) return []

    const categoryMap = new Map<string, SalesByCategory>()

    // Mapear IDs a nombres
    const categoryMapById = new Map(categories.map(c => [c.id, c.name]))
    const productMapById = new Map(products.map(p => [p.id, p.categoryId]))
    const variantToProductMap = new Map(variants.map(v => [v.id, v.productId]))

    salesData.sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = variantToProductMap.get(item.variantId)
        if (!productId) return

        const categoryId = productMapById.get(productId)
        if (!categoryId) return

        const categoryName = categoryMapById.get(categoryId) || 'Sin categoría'
        const existing = categoryMap.get(categoryId)

        if (existing) {
          existing.totalSales += 1
          existing.totalAmount += item.subtotal.amount
          existing.itemCount += item.quantity
        } else {
          categoryMap.set(categoryId, {
            categoryId,
            categoryName,
            totalSales: 1,
            totalAmount: item.subtotal.amount,
            itemCount: item.quantity
          })
        }
      })
    })

    return Array.from(categoryMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [salesData.sales, categories, products, variants])

  return {
    salesByCategory,
    isLoading: salesData.isLoading || categories === undefined || products === undefined || variants === undefined
  }
}

/**
 * Hook para obtener ventas por método de pago
 */
export function useSalesByPaymentMethod({ from, to }: SalesByPeriodParams) {
  const salesData = useSalesByPeriod({ from, to })

  const salesByPaymentMethod = useMemo<SalesByPaymentMethod[]>(() => {
    if (!salesData.sales.length) return []

    const methodMap = new Map<string, SalesByPaymentMethod>()

    salesData.sales.forEach(sale => {
      const key = sale.paymentMethodId
      const existing = methodMap.get(key)

      if (existing) {
        existing.totalSales += 1
        existing.totalAmount += sale.total.amount
      } else {
        methodMap.set(key, {
          paymentMethodId: sale.paymentMethodId,
          paymentMethodType: sale.paymentMethodType,
          totalSales: 1,
          totalAmount: sale.total.amount
        })
      }
    })

    return Array.from(methodMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [salesData.sales])

  return {
    salesByPaymentMethod,
    isLoading: salesData.isLoading
  }
}

/**
 * Hook para obtener resumen de ventas (diario, semanal, mensual)
 */
export function useSalesSummary() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay()) // Domingo
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  monthStart.setHours(0, 0, 0, 0)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  monthEnd.setHours(0, 0, 0, 0)

  const daily = useSalesByPeriod({ from: today, to: tomorrow })
  const weekly = useSalesByPeriod({ from: weekStart, to: weekEnd })
  const monthly = useSalesByPeriod({ from: monthStart, to: monthEnd })

  return {
    daily,
    weekly,
    monthly,
    isLoading: daily.isLoading || weekly.isLoading || monthly.isLoading
  }
}

