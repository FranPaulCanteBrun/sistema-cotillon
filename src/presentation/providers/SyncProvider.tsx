/**
 * Provider para el servicio de sincronización
 * Maneja la sincronización automática y expone el estado
 */

import { createContext, useContext, useEffect, useCallback, useState, useRef, type ReactNode } from 'react'
import { syncService } from '@infrastructure/sync'
import type { SyncServiceStatus, SyncResult } from '@infrastructure/sync'

interface SyncContextType {
  status: SyncServiceStatus
  pendingCount: number
  lastSyncAt: Date | null
  sync: () => Promise<SyncResult>
  retryFailed: () => Promise<void>
}

const SyncContext = createContext<SyncContextType | null>(null)

interface SyncProviderProps {
  children: ReactNode
  autoSyncInterval?: number // en milisegundos, 0 para desactivar
}

export function SyncProvider({ 
  children, 
  autoSyncInterval = 5 * 60 * 1000 // 5 minutos por defecto
}: SyncProviderProps) {
  const [status, setStatus] = useState<SyncServiceStatus>(syncService.getStatus())
  const [pendingCount, setPendingCount] = useState(0)

  // Suscribirse a cambios de estado del servicio
  useEffect(() => {
    const unsubscribe = syncService.subscribe(setStatus)
    return unsubscribe
  }, [])

  // Actualizar contador de pendientes periódicamente
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await syncService.getPendingCount()
      setPendingCount(count)
    }

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 10000) // cada 10 segundos

    return () => clearInterval(interval)
  }, [])

  // Sincronización automática (no bloqueante)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    if (autoSyncInterval <= 0) return

    isMountedRef.current = true

    const autoSync = async () => {
      if (!isMountedRef.current) return
      
      // Solo sincronizar si estamos online y no hay una sincronización en curso
      const currentStatus = syncService.getStatus()
      if (currentStatus.isOnline && !currentStatus.isSyncing) {
        try {
          // Ejecutar sincronización de forma no bloqueante
          syncService.sync().then(() => {
            if (isMountedRef.current) {
              syncService.getPendingCount().then(count => {
                if (isMountedRef.current) {
                  setPendingCount(count)
                }
              })
            }
          }).catch(() => {
            // Silenciar errores de sincronización automática
          })
        } catch (error) {
          // Silenciar errores de sincronización automática
        }
      }
    }

    // Limpiar intervalo anterior si existe
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current)
    }

    // Sincronizar al montar solo si hay conexión (con un delay más largo para no bloquear navegación inicial)
    const initialTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        const currentStatus = syncService.getStatus()
        if (currentStatus.isOnline) {
          // Ejecutar de forma no bloqueante
          autoSync()
        }
      }
    }, 5000) // Esperar 5 segundos antes de la primera sincronización para no bloquear navegación

    // Configurar intervalo
    syncIntervalRef.current = setInterval(autoSync, autoSyncInterval)

    return () => {
      isMountedRef.current = false
      clearTimeout(initialTimeout)
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
        syncIntervalRef.current = null
      }
    }
  }, [autoSyncInterval]) // Solo depende del intervalo, no del status

  const sync = useCallback(async () => {
    const result = await syncService.sync()
    const count = await syncService.getPendingCount()
    setPendingCount(count)
    return result
  }, [])

  const retryFailed = useCallback(async () => {
    await syncService.retryFailedOperations()
    const count = await syncService.getPendingCount()
    setPendingCount(count)
  }, [])

  const lastSyncAtStr = localStorage.getItem('last_sync_at')
  const lastSyncAt = lastSyncAtStr ? new Date(lastSyncAtStr) : null

  return (
    <SyncContext.Provider
      value={{
        status,
        pendingCount,
        lastSyncAt,
        sync,
        retryFailed
      }}
    >
      {children}
    </SyncContext.Provider>
  )
}

export function useSyncContext() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider')
  }
  return context
}
