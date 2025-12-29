/**
 * Hook para gestionar la sincronización
 */

import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { syncService } from '@infrastructure/sync'
import type { SyncServiceStatus, SyncResult } from '@infrastructure/sync'
import { db } from '@infrastructure/persistence/indexeddb/database'

export function useSync() {
  const [status, setStatus] = useState<SyncServiceStatus>(syncService.getStatus())
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  // Contador de operaciones pendientes (reactivo)
  const pendingCount = useLiveQuery(
    () => db.syncQueue.where('status').anyOf(['pending', 'error']).count(),
    [],
    0
  )

  // Suscribirse a cambios de estado
  useEffect(() => {
    const unsubscribe = syncService.subscribe(setStatus)
    return unsubscribe
  }, [])

  // Sincronizar manualmente
  const sync = useCallback(async () => {
    const result = await syncService.sync()
    setLastSyncResult(result)
    return result
  }, [])

  // Reintentar operaciones fallidas
  const retryFailed = useCallback(async () => {
    await syncService.retryFailedOperations()
  }, [])

  // Obtener última sincronización
  const lastSyncAt = localStorage.getItem('last_sync_at')

  return {
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: pendingCount ?? 0,
    lastSyncAt: lastSyncAt ? new Date(lastSyncAt) : null,
    lastSyncResult,
    sync,
    retryFailed
  }
}

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
