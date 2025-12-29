/**
 * Hook para gestionar alertas de stock
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db, type StockAlertRecord } from '../indexeddb/database'
import { stockAlertService } from '@domain/services/StockAlertService'
import { ProductMapper } from '../indexeddb/mappers/ProductMapper'
import { ProductVariantMapper } from '../indexeddb/mappers/ProductVariantMapper'
import { useLowStockProducts } from './useProducts'
import { useCallback, useEffect } from 'react'

/**
 * Hook para obtener alertas de stock activas
 */
export function useStockAlerts() {
  // Obtener alertas no reconocidas (reactivo)
  const unacknowledgedAlerts = useLiveQuery(
    async () => {
      const all = await db.stockAlerts.toArray()
      return all.filter(a => !a.isAcknowledged)
    },
    [],
    []
  ) ?? []

  // Obtener todas las alertas
  const allAlerts = useLiveQuery(
    () => db.stockAlerts.orderBy('createdAt').reverse().toArray(),
    [],
    []
  ) ?? []

  return {
    alerts: unacknowledgedAlerts,
    allAlerts,
    count: unacknowledgedAlerts.length,
    criticalCount: unacknowledgedAlerts.filter(a => a.severity === 'critical').length,
    warningCount: unacknowledgedAlerts.filter(a => a.severity === 'warning').length
  }
}

/**
 * Hook para gestionar alertas de stock (crear, reconocer, etc.)
 */
export function useStockAlertMutations() {
  const { variants } = useLowStockProducts()

  // Detectar y crear alertas automáticamente
  const detectAndCreateAlerts = useCallback(async () => {
    const productRecords = await db.products.toArray()
    const variantRecords = await db.productVariants.toArray()
    const existingAlerts = await db.stockAlerts.toArray()
    const existingVariantIds = new Set(existingAlerts.filter(a => !a.isAcknowledged).map(a => a.variantId))

    const newAlerts: StockAlertRecord[] = []

    for (const variant of variants) {
      // Solo crear alerta si no existe una activa para esta variante
      if (!existingVariantIds.has(variant.id)) {
        const productRecord = productRecords.find(p => p.id === variant.productId)
        if (productRecord) {
          const product = ProductMapper.toDomain(productRecord)
          if (stockAlertService.needsAlert(variant, product)) {
            const alert = stockAlertService.createAlert(variant, product)
            newAlerts.push({
              id: alert.id,
              variantId: alert.variantId,
              productId: alert.productId,
              productName: alert.productName,
              variantName: alert.variantName,
              currentStock: alert.currentStock,
              minStock: alert.minStock,
              severity: alert.severity,
              createdAt: alert.createdAt,
              isAcknowledged: false
            })
          }
        }
      }
    }

    if (newAlerts.length > 0) {
      await db.stockAlerts.bulkAdd(newAlerts)
    }

    // Actualizar alertas existentes si el stock cambió
    for (const alert of existingAlerts.filter(a => !a.isAcknowledged)) {
      const variant = variants.find(v => v.id === alert.variantId)
      const productRecord = productRecords.find(p => p.id === alert.productId)
      
      if (variant && productRecord) {
        const product = ProductMapper.toDomain(productRecord)
        const needsUpdate = stockAlertService.needsAlert(variant, product)
        if (needsUpdate) {
          const updatedAlert = stockAlertService.createAlert(variant, product)
          await db.stockAlerts.update(alert.id, {
            currentStock: updatedAlert.currentStock,
            severity: updatedAlert.severity,
            createdAt: new Date() // Actualizar fecha para mostrar como nueva
          })
        } else {
          // El stock ya no está bajo, eliminar alerta
          await db.stockAlerts.delete(alert.id)
        }
      }
    }
  }, [variants])

  // Detectar alertas cuando cambian las variantes
  useEffect(() => {
    if (variants.length > 0) {
      detectAndCreateAlerts()
    }
  }, [variants, detectAndCreateAlerts])

  // Reconocer una alerta
  const acknowledgeAlert = useCallback(async (alertId: string) => {
    await db.stockAlerts.update(alertId, {
      isAcknowledged: true,
      acknowledgedAt: new Date()
    })
  }, [])

  // Reconocer todas las alertas
  const acknowledgeAllAlerts = useCallback(async () => {
    // Obtener todas las alertas no reconocidas
    const unacknowledgedAlerts = await db.stockAlerts
      .toArray()
      .then(alerts => alerts.filter(a => !a.isAcknowledged))
    
    // Actualizar cada una
    const updates = unacknowledgedAlerts.map(alert => 
      db.stockAlerts.update(alert.id, {
        isAcknowledged: true,
        acknowledgedAt: new Date()
      })
    )
    
    await Promise.all(updates)
  }, [])

  // Eliminar alerta
  const deleteAlert = useCallback(async (alertId: string) => {
    await db.stockAlerts.delete(alertId)
  }, [])

  // Eliminar alertas reconocidas antiguas (más de 7 días)
  const cleanupOldAlerts = useCallback(async () => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Obtener todas las alertas reconocidas y filtrar por fecha
    const oldAlerts = await db.stockAlerts
      .toArray()
      .then(alerts => alerts.filter(a => 
        a.isAcknowledged && 
        a.acknowledgedAt && 
        a.acknowledgedAt < sevenDaysAgo
      ))
    
    // Eliminar cada una
    const deletions = oldAlerts.map(alert => db.stockAlerts.delete(alert.id))
    await Promise.all(deletions)
  }, [])

  return {
    acknowledgeAlert,
    acknowledgeAllAlerts,
    deleteAlert,
    cleanupOldAlerts,
    detectAndCreateAlerts
  }
}

