import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { SaleMapper } from '../indexeddb/mappers/SaleMapper'
import { SaleRepository } from '../indexeddb/repositories/SaleRepository'
import { StockMovementRepository } from '../indexeddb/repositories/StockMovementRepository'
import { ProductVariantRepository } from '../indexeddb/repositories/ProductVariantRepository'
import type { Sale } from '@domain/entities/Sale'
import type { StockMovement } from '@domain/entities/StockMovement'

const saleRepository = new SaleRepository()
const stockMovementRepository = new StockMovementRepository()
const variantRepository = new ProductVariantRepository()

/**
 * Hook para obtener las ventas del día (reactivo)
 */
export function useTodaySales() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const records = useLiveQuery(() =>
    db.sales
      .where('createdAt')
      .aboveOrEqual(today)
      .toArray()
  )

  const sales = records ? SaleMapper.toDomainList(records) : []
  const completedSales = sales.filter(s => s.status === 'completed')

  return {
    sales,
    completedSales,
    totalSales: completedSales.length,
    totalAmount: completedSales.reduce((sum, s) => sum + s.total.amount, 0),
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener las últimas ventas (reactivo)
 */
export function useRecentSales(limit: number = 10) {
  const records = useLiveQuery(() =>
    db.sales
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray()
  )

  return {
    sales: records ? SaleMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener una venta por ID
 */
export function useSale(id: string | undefined) {
  const record = useLiveQuery(
    () => (id ? db.sales.get(id) : undefined),
    [id]
  )

  return {
    sale: record ? SaleMapper.toDomain(record) : null,
    isLoading: record === undefined && id !== undefined
  }
}

/**
 * Hook para obtener el resumen de ventas del día
 */
export function useDailySalesSummary() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const summary = useLiveQuery(async () => {
    return saleRepository.getSummary({ from: today, to: tomorrow })
  })

  return {
    summary,
    isLoading: summary === undefined
  }
}

/**
 * Funciones de mutación para ventas
 */
export function useSaleMutations() {
  /**
   * Crea una nueva venta y actualiza el stock
   */
  const createSale = async (
    sale: Sale,
    stockMovements: StockMovement[],
    splitPayments?: Array<{ methodId: string; amount: number }>
  ): Promise<void> => {
    // Transacción para asegurar consistencia
    await db.transaction('rw', [db.sales, db.stockMovements, db.productVariants, db.salePayments], async () => {
      // Guardar la venta
      await saleRepository.save(sale)

      // Guardar movimientos de stock
      await stockMovementRepository.saveMany(stockMovements)

      // Actualizar stock de cada variante
      for (const movement of stockMovements) {
        await variantRepository.updateStock(
          movement.variantId,
          movement.newStock.value
        )
      }

      // Guardar pagos divididos si existen
      if (splitPayments && splitPayments.length > 0) {
        const now = new Date()
        const paymentRecords = splitPayments.map(payment => ({
          id: crypto.randomUUID(),
          saleId: sale.id,
          paymentMethodId: payment.methodId,
          amount: payment.amount,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending' as const
        }))
        await db.salePayments.bulkPut(paymentRecords)
      }
    })
  }

  /**
   * Completa una venta pendiente
   */
  const completeSale = async (saleId: string): Promise<void> => {
    const sale = await saleRepository.findById(saleId)
    if (!sale) throw new Error('Venta no encontrada')
    
    sale.complete()
    await saleRepository.save(sale)
  }

  /**
   * Cancela una venta y revierte el stock
   */
  const cancelSale = async (saleId: string, userId: string): Promise<void> => {
    const sale = await saleRepository.findById(saleId)
    if (!sale) throw new Error('Venta no encontrada')

    await db.transaction('rw', [db.sales, db.stockMovements, db.productVariants], async () => {
      // Cancelar la venta
      sale.cancel()
      await saleRepository.save(sale)

      // Si estaba completada, revertir stock
      if (sale.status === 'completed') {
        for (const item of sale.items) {
          const variant = await variantRepository.findById(item.variantId)
          if (variant) {
            // Crear movimiento de devolución por cancelación
            const { StockMovement } = await import('@domain/entities/StockMovement')
            const { Quantity } = await import('@domain/value-objects/Quantity')
            
            const returnMovement = StockMovement.createReturn({
              id: crypto.randomUUID(),
              variantId: item.variantId,
              userId,
              quantity: Quantity.create(item.quantity),
              previousStock: variant.currentStock,
              saleId,
              reason: 'Cancelación de venta'
            })

            await stockMovementRepository.save(returnMovement)
            await variantRepository.updateStock(
              item.variantId,
              returnMovement.newStock.value
            )
          }
        }
      }
    })
  }

  /**
   * Genera el siguiente número de comprobante
   */
  const getNextReceiptNumber = async (): Promise<string> => {
    return saleRepository.getNextReceiptNumber()
  }

  return {
    createSale,
    completeSale,
    cancelSale,
    getNextReceiptNumber
  }
}

