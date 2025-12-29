/**
 * Servicio de sincronización offline-first
 * 
 * Estrategia:
 * 1. Todas las operaciones se guardan primero en IndexedDB
 * 2. Se registran en una cola de sincronización (syncQueue)
 * 3. Cuando hay conexión, se procesan las operaciones pendientes
 * 4. Se hace pull de cambios del servidor
 */

import { db, type SyncConflictRecord, type ConflictResolutionStrategy } from '../persistence/indexeddb/database'
import { apiClient } from '../api/client'

export type SyncOperation = 'create' | 'update' | 'delete'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error'

export interface SyncQueueItem {
  id: string
  operation: SyncOperation
  tableName: string
  recordId: string
  data: Record<string, unknown> | null
  timestamp: string
  status: SyncStatus
  retries: number
  error?: string
}

interface SyncPullResponse {
  syncedAt: string
  changes: {
    categories: unknown[]
    products: unknown[]
    variants: unknown[]
    paymentMethods: unknown[]
  }
}

interface SyncPushResult {
  id: string
  status: 'success' | 'error'
  error?: string
}

interface SyncPushResponse {
  message: string
  results: SyncPushResult[]
}

class SyncService {
  private isOnline: boolean = navigator.onLine
  private isSyncing: boolean = false
  private deviceId: string
  private listeners: Set<(status: SyncServiceStatus) => void> = new Set()

  constructor() {
    this.deviceId = this.getOrCreateDeviceId()
    this.setupNetworkListeners()
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('device_id', deviceId)
    }
    return deviceId
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners()
      // No sincronizar automáticamente aquí para evitar loops
      // El SyncProvider manejará la sincronización automática
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners()
    })
  }

  // Registrar listener para cambios de estado
  subscribe(listener: (status: SyncServiceStatus) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    const status = this.getStatus()
    this.listeners.forEach(listener => listener(status))
  }

  getStatus(): SyncServiceStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      deviceId: this.deviceId
    }
  }

  // Encolar operación para sincronización
  async queueOperation(
    operation: SyncOperation,
    tableName: string,
    recordId: string,
    data: Record<string, unknown> | null
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      operation,
      tableName,
      recordId,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending',
      retries: 0
    }

    await db.syncQueue.add(queueItem)
    this.notifyListeners()

    // Intentar sincronizar inmediatamente si hay conexión
    if (this.isOnline && !this.isSyncing) {
      this.sync()
    }
  }

  // Obtener operaciones pendientes
  async getPendingOperations(): Promise<SyncQueueItem[]> {
    return db.syncQueue
      .where('status')
      .anyOf(['pending', 'error'])
      .toArray()
  }

  // Contar operaciones pendientes
  async getPendingCount(): Promise<number> {
    return db.syncQueue
      .where('status')
      .anyOf(['pending', 'error'])
      .count()
  }

  // Sincronizar con el servidor
  async sync(): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, message: 'Sin conexión' }
    }

    if (this.isSyncing) {
      return { success: false, message: 'Sincronización en progreso' }
    }

    if (!apiClient.isAuthenticated()) {
      return { success: false, message: 'No autenticado' }
    }

    this.isSyncing = true
    this.notifyListeners()

    try {
      // 1. Push: enviar cambios locales al servidor
      const pushResult = await this.pushChanges()

      // 2. Pull: obtener cambios del servidor
      const pullResult = await this.pullChanges()

      this.isSyncing = false
      this.notifyListeners()

      return {
        success: true,
        message: `Push: ${pushResult.pushed} operaciones. Pull: ${pullResult.pulled} cambios.`,
        pushed: pushResult.pushed,
        pulled: pullResult.pulled
      }
    } catch (error) {
      this.isSyncing = false
      this.notifyListeners()
      
      const { getErrorMessage } = await import('@shared/errors')
      const message = getErrorMessage(error)
      return {
        success: false,
        message
      }
    }
  }

  // Push: enviar cambios locales al servidor
  private async pushChanges(): Promise<{ pushed: number }> {
    const pendingOps = await this.getPendingOperations()
    
    if (pendingOps.length === 0) {
      return { pushed: 0 }
    }

    // Marcar como syncing
    await Promise.all(
      pendingOps.map(op => 
        db.syncQueue.update(op.id, { status: 'syncing' })
      )
    )

    try {
      const response = await apiClient.post<SyncPushResponse>('/sync/push', {
        deviceId: this.deviceId,
        operations: pendingOps.map(op => ({
          id: op.id,
          operation: op.operation,
          tableName: op.tableName,
          recordId: op.recordId,
          data: op.data,
          timestamp: op.timestamp
        }))
      })

      // Procesar resultados
      let successCount = 0
      for (const result of response.results) {
        const op = pendingOps.find(o => o.id === result.id)
        if (!op) continue

        if (result.status === 'success') {
          // Eliminar de la cola
          await db.syncQueue.delete(op.id)
          successCount++
        } else {
          // Marcar como error
          await db.syncQueue.update(op.id, {
            status: 'error',
            retries: op.retries + 1,
            error: result.error
          })
        }
      }

      return { pushed: successCount }
    } catch (error) {
      // Revertir a pending
      await Promise.all(
        pendingOps.map(op => 
          db.syncQueue.update(op.id, { 
            status: 'error',
            retries: op.retries + 1,
            error: error instanceof Error ? error.message : 'Error de red'
          })
        )
      )
      throw error
    }
  }

  // Pull: obtener cambios del servidor
  private async pullChanges(): Promise<{ pulled: number }> {
    const lastSyncAt = localStorage.getItem('last_sync_at')

    const response = await apiClient.post<SyncPullResponse>('/sync/pull', {
      deviceId: this.deviceId,
      lastSyncAt: lastSyncAt || undefined // Enviar undefined en lugar de null
    })

    let pulledCount = 0

    // Procesar categorías
    for (const cat of response.changes.categories) {
      await this.mergeCategory(cat as ServerCategory)
      pulledCount++
    }

    // Procesar productos
    for (const prod of response.changes.products) {
      await this.mergeProduct(prod as ServerProduct)
      pulledCount++
    }

    // Procesar variantes
    for (const variant of response.changes.variants) {
      await this.mergeVariant(variant as ServerVariant)
      pulledCount++
    }

    // Procesar métodos de pago
    for (const pm of response.changes.paymentMethods) {
      await this.mergePaymentMethod(pm as ServerPaymentMethod)
      pulledCount++
    }

    // Guardar timestamp de última sincronización
    localStorage.setItem('last_sync_at', response.syncedAt)

    return { pulled: pulledCount }
  }

  // Detectar si hay un conflicto
  private async detectConflict(
    tableName: string,
    recordId: string,
    localUpdatedAt: Date,
    serverUpdatedAt: Date
  ): Promise<boolean> {
    // Verificar si hay operaciones pendientes para este registro
    const pendingOps = await db.syncQueue
      .where('[tableName+recordId]')
      .equals([tableName, recordId])
      .and(op => op.status === 'pending' || op.status === 'syncing')
      .toArray()

    // Si hay operaciones pendientes y el servidor tiene una versión más reciente, hay conflicto
    if (pendingOps.length > 0 && serverUpdatedAt > localUpdatedAt) {
      return true
    }

    return false
  }

  // Guardar conflicto
  private async saveConflict(
    tableName: string,
    recordId: string,
    localData: Record<string, unknown>,
    serverData: Record<string, unknown>,
    localUpdatedAt: string,
    serverUpdatedAt: string
  ): Promise<void> {
    // Verificar si ya existe un conflicto sin resolver
    // Nota: No podemos usar .and() con funciones en Dexie, así que obtenemos todos y filtramos
    const allConflicts = await db.syncConflicts
      .where('[tableName+recordId]')
      .equals([tableName, recordId])
      .toArray()
    const existing = allConflicts.find(c => !c.resolution)

    if (existing) {
      // Actualizar conflicto existente
      await db.syncConflicts.update(existing.id, {
        localData,
        serverData,
        localUpdatedAt,
        serverUpdatedAt
      })
    } else {
      // Crear nuevo conflicto
      await db.syncConflicts.add({
        id: crypto.randomUUID(),
        tableName,
        recordId,
        localData,
        serverData,
        localUpdatedAt,
        serverUpdatedAt,
        conflictDetectedAt: new Date().toISOString()
      })
    }
  }

  // Merge helpers con detección de conflictos
  private async mergeCategory(serverCat: ServerCategory) {
    const local = await db.categories.get(serverCat.id)
    
    if (!local) {
      // No existe localmente, simplemente crear
      await db.categories.put({
        id: serverCat.id,
        name: serverCat.name,
        description: serverCat.description ?? '',
        isActive: serverCat.isActive,
        createdAt: serverCat.createdAt,
        updatedAt: serverCat.updatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
      return
    }

    const localUpdatedAt = new Date(local.updatedAt)
    const serverUpdatedAt = new Date(serverCat.updatedAt)

    // Detectar conflicto
    const hasConflict = await this.detectConflict('categories', serverCat.id, localUpdatedAt, serverUpdatedAt)

    if (hasConflict) {
      // Guardar conflicto
      await this.saveConflict(
        'categories',
        serverCat.id,
        {
          id: local.id,
          name: local.name,
          description: local.description,
          isActive: local.isActive,
          updatedAt: local.updatedAt.toISOString()
        },
        {
          id: serverCat.id,
          name: serverCat.name,
          description: serverCat.description ?? '',
          isActive: serverCat.isActive,
          updatedAt: serverCat.updatedAt
        },
        local.updatedAt.toISOString(),
        serverCat.updatedAt
      )
      // No aplicar cambios automáticamente, esperar resolución manual
      return
    }

    // Sin conflicto, aplicar cambios normalmente
    if (serverUpdatedAt > localUpdatedAt) {
      await db.categories.put({
        ...local,
        name: serverCat.name,
        description: serverCat.description ?? '',
        isActive: serverCat.isActive,
        updatedAt: serverUpdatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
    }
  }

  private async mergeProduct(serverProd: ServerProduct) {
    const local = await db.products.get(serverProd.id)
    
    if (!local) {
      await db.products.put({
        id: serverProd.id,
        code: serverProd.code,
        name: serverProd.name,
        description: serverProd.description ?? '',
        categoryId: serverProd.categoryId,
        basePriceCents: Math.round(Number(serverProd.basePrice) * 100),
        basePriceCurrency: 'ARS',
        minStock: serverProd.minStock,
        imageUrl: serverProd.imageUrl ?? undefined,
        isActive: serverProd.isActive,
        createdAt: serverProd.createdAt,
        updatedAt: serverProd.updatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
      return
    }

    const localUpdatedAt = new Date(local.updatedAt)
    const serverUpdatedAt = new Date(serverProd.updatedAt)

    const hasConflict = await this.detectConflict('products', serverProd.id, localUpdatedAt, serverUpdatedAt)

    if (hasConflict) {
      await this.saveConflict(
        'products',
        serverProd.id,
        {
          id: local.id,
          code: local.code,
          name: local.name,
          description: local.description,
          categoryId: local.categoryId,
          basePriceCents: local.basePriceCents,
          minStock: local.minStock,
          isActive: local.isActive,
          updatedAt: local.updatedAt.toISOString()
        },
        {
          id: serverProd.id,
          code: serverProd.code,
          name: serverProd.name,
          description: serverProd.description ?? '',
          categoryId: serverProd.categoryId,
          basePrice: serverProd.basePrice,
          minStock: serverProd.minStock,
          isActive: serverProd.isActive,
          updatedAt: serverProd.updatedAt
        },
        local.updatedAt.toISOString(),
        serverProd.updatedAt
      )
      return
    }

    if (serverUpdatedAt > localUpdatedAt) {
      await db.products.put({
        ...local,
        code: serverProd.code,
        name: serverProd.name,
        description: serverProd.description ?? '',
        categoryId: serverProd.categoryId,
        basePriceCents: Math.round(Number(serverProd.basePrice) * 100),
        minStock: serverProd.minStock,
        imageUrl: serverProd.imageUrl ?? undefined,
        isActive: serverProd.isActive,
        updatedAt: serverUpdatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
    }
  }

  private async mergeVariant(serverVar: ServerVariant) {
    const local = await db.productVariants.get(serverVar.id)
    
    if (!local) {
      await db.productVariants.put({
        id: serverVar.id,
        productId: serverVar.productId,
        sku: serverVar.sku,
        color: serverVar.color ?? undefined,
        size: serverVar.size ?? undefined,
        priceCents: serverVar.price ? Math.round(Number(serverVar.price) * 100) : undefined,
        priceCurrency: 'ARS',
        currentStock: serverVar.currentStock,
        barcode: serverVar.barcode ?? undefined,
        isActive: serverVar.isActive,
        createdAt: serverVar.createdAt,
        updatedAt: serverVar.updatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
      return
    }

    const localUpdatedAt = new Date(local.updatedAt)
    const serverUpdatedAt = new Date(serverVar.updatedAt)

    const hasConflict = await this.detectConflict('productVariants', serverVar.id, localUpdatedAt, serverUpdatedAt)

    if (hasConflict) {
      await this.saveConflict(
        'productVariants',
        serverVar.id,
        {
          id: local.id,
          productId: local.productId,
          sku: local.sku,
          color: local.color,
          size: local.size,
          priceCents: local.priceCents,
          currentStock: local.currentStock,
          barcode: local.barcode,
          isActive: local.isActive,
          updatedAt: local.updatedAt.toISOString()
        },
        {
          id: serverVar.id,
          productId: serverVar.productId,
          sku: serverVar.sku,
          color: serverVar.color,
          size: serverVar.size,
          price: serverVar.price,
          currentStock: serverVar.currentStock,
          barcode: serverVar.barcode,
          isActive: serverVar.isActive,
          updatedAt: serverVar.updatedAt
        },
        local.updatedAt.toISOString(),
        serverVar.updatedAt
      )
      return
    }

    if (serverUpdatedAt > localUpdatedAt) {
      await db.productVariants.put({
        ...local,
        productId: serverVar.productId,
        sku: serverVar.sku,
        color: serverVar.color ?? undefined,
        size: serverVar.size ?? undefined,
        priceCents: serverVar.price ? Math.round(Number(serverVar.price) * 100) : undefined,
        currentStock: serverVar.currentStock,
        barcode: serverVar.barcode ?? undefined,
        isActive: serverVar.isActive,
        updatedAt: serverUpdatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
    }
  }

  private async mergePaymentMethod(serverPm: ServerPaymentMethod) {
    const local = await db.paymentMethods.get(serverPm.id)
    
    if (!local) {
      await db.paymentMethods.put({
        id: serverPm.id,
        name: serverPm.name,
        type: serverPm.type.toLowerCase() as 'cash' | 'debit' | 'credit' | 'transfer' | 'qr' | 'other',
        config: '{}',
        isActive: serverPm.isActive,
        createdAt: serverPm.createdAt,
        updatedAt: serverPm.updatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
      return
    }

    const localUpdatedAt = new Date(local.updatedAt)
    const serverUpdatedAt = new Date(serverPm.updatedAt)

    const hasConflict = await this.detectConflict('paymentMethods', serverPm.id, localUpdatedAt, serverUpdatedAt)

    if (hasConflict) {
      await this.saveConflict(
        'paymentMethods',
        serverPm.id,
        {
          id: local.id,
          name: local.name,
          type: local.type,
          isActive: local.isActive,
          updatedAt: local.updatedAt.toISOString()
        },
        {
          id: serverPm.id,
          name: serverPm.name,
          type: serverPm.type,
          isActive: serverPm.isActive,
          updatedAt: serverPm.updatedAt
        },
        local.updatedAt.toISOString(),
        serverPm.updatedAt
      )
      return
    }

    if (serverUpdatedAt > localUpdatedAt) {
      await db.paymentMethods.put({
        ...local,
        name: serverPm.name,
        type: serverPm.type.toLowerCase() as 'cash' | 'debit' | 'credit' | 'transfer' | 'qr' | 'other',
        isActive: serverPm.isActive,
        updatedAt: serverUpdatedAt,
        syncStatus: 'synced',
        syncedAt: new Date()
      })
    }
  }

  // Limpiar cola de operaciones exitosas
  async clearSyncedOperations(): Promise<void> {
    await db.syncQueue.where('status').equals('synced').delete()
  }

  // Reintentar operaciones fallidas
  async retryFailedOperations(): Promise<void> {
    await db.syncQueue
      .where('status')
      .equals('error')
      .modify({ status: 'pending', retries: 0, error: undefined })
    
    this.sync()
  }

  // Obtener conflictos pendientes
  async getPendingConflicts(): Promise<SyncConflictRecord[]> {
    const all = await db.syncConflicts.toArray()
    return all.filter(c => !c.resolution)
  }

  // Resolver conflicto
  async resolveConflict(
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    resolvedData?: Record<string, unknown>
  ): Promise<void> {
    const conflict = await db.syncConflicts.get(conflictId)
    if (!conflict) {
      throw new Error('Conflicto no encontrado')
    }

    let dataToApply: Record<string, unknown>

    switch (strategy) {
      case 'local':
        dataToApply = conflict.localData
        break
      case 'server':
        dataToApply = conflict.serverData
        break
      case 'merge':
      case 'manual':
        dataToApply = resolvedData || conflict.localData
        break
      default:
        throw new Error('Estrategia de resolución no válida')
    }

    // Aplicar datos resueltos a la tabla correspondiente
    await this.applyResolvedData(conflict.tableName, conflict.recordId, dataToApply)

    // Marcar conflicto como resuelto
    await db.syncConflicts.update(conflictId, {
      resolution: strategy,
      resolvedAt: new Date().toISOString(),
      resolvedData: dataToApply
    })

    // Eliminar operaciones pendientes relacionadas si se resolvió con 'server'
    if (strategy === 'server') {
      await db.syncQueue
        .where('[tableName+recordId]')
        .equals([conflict.tableName, conflict.recordId])
        .delete()
    }
  }

  // Aplicar datos resueltos a la tabla correspondiente
  private async applyResolvedData(
    tableName: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    switch (tableName) {
      case 'categories':
        await db.categories.put({
          ...(await db.categories.get(recordId)),
          ...data,
          updatedAt: new Date(),
          syncStatus: 'pending',
          syncedAt: undefined
        } as any)
        break
      case 'products':
        await db.products.put({
          ...(await db.products.get(recordId)),
          ...data,
          updatedAt: new Date(),
          syncStatus: 'pending',
          syncedAt: undefined
        } as any)
        break
      case 'productVariants':
        await db.productVariants.put({
          ...(await db.productVariants.get(recordId)),
          ...data,
          updatedAt: new Date(),
          syncStatus: 'pending',
          syncedAt: undefined
        } as any)
        break
      case 'paymentMethods':
        await db.paymentMethods.put({
          ...(await db.paymentMethods.get(recordId)),
          ...data,
          updatedAt: new Date(),
          syncStatus: 'pending',
          syncedAt: undefined
        } as any)
        break
      default:
        throw new Error(`Tabla no soportada: ${tableName}`)
    }

    // Reencolar para sincronización
    await this.queueOperation('update', tableName, recordId, data)
  }
}

// Tipos para respuestas del servidor
interface ServerCategory {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ServerProduct {
  id: string
  code: string
  name: string
  description?: string
  categoryId: string
  basePrice: string | number
  minStock: number
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ServerVariant {
  id: string
  productId: string
  sku: string
  color?: string
  size?: string
  price?: string | number
  currentStock: number
  barcode?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ServerPaymentMethod {
  id: string
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SyncServiceStatus {
  isOnline: boolean
  isSyncing: boolean
  deviceId: string
}

export interface SyncResult {
  success: boolean
  message: string
  pushed?: number
  pulled?: number
}

// Instancia singleton
export const syncService = new SyncService()

