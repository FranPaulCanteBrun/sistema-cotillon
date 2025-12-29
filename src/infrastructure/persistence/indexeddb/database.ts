import Dexie, { type EntityTable } from 'dexie'
import type { SyncStatus, SaleStatus, PaymentMethodType, StockMovementType, UserRole } from '@shared/types'

/**
 * Esquemas de las tablas para IndexedDB
 * Estos tipos representan cómo se almacenan los datos en la base de datos
 */

export interface CategoryRecord {
  id: string
  name: string
  description: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface ProductRecord {
  id: string
  code: string
  name: string
  description: string
  categoryId: string
  supplierId?: string
  basePriceCents: number
  basePriceCurrency: string
  minStock: number
  isActive: boolean
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface ProductVariantRecord {
  id: string
  productId: string
  sku: string
  color?: string
  size?: string
  priceCents?: number
  priceCurrency?: string
  currentStock: number
  barcode?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface SaleItemRecord {
  id: string
  variantId: string
  productName: string
  variantName: string
  quantity: number
  unitPriceCents: number
  unitPriceCurrency: string
  discountPercentage: number
}

export interface SaleRecord {
  id: string
  receiptNumber: string
  userId: string
  customerId?: string
  items: SaleItemRecord[]
  paymentMethodId: string
  paymentMethodType: PaymentMethodType
  status: SaleStatus
  notes: string
  subtotalCents: number
  discountCents: number
  totalCents: number
  currency: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface StockMovementRecord {
  id: string
  variantId: string
  userId: string
  type: StockMovementType
  quantity: number
  previousStock: number
  newStock: number
  reason: string
  referenceId?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface PaymentMethodRecord {
  id: string
  name: string
  type: PaymentMethodType
  config: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface UserRecord {
  id: string
  name: string
  email: string
  passwordHash?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface CustomerRecord {
  id: string
  name: string
  documentNumber?: string
  phone?: string
  email?: string
  address?: string
  notes: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

export interface SupplierRecord {
  id: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
  notes: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

type SyncOperation = 'create' | 'update' | 'delete'
type SyncQueueStatus = 'pending' | 'syncing' | 'synced' | 'error'

/**
 * Tabla para almacenar operaciones pendientes de sincronización
 */
export interface SyncQueueRecord {
  id: string
  tableName: string
  recordId: string
  operation: SyncOperation
  data: Record<string, unknown> | null
  timestamp: string
  status: SyncQueueStatus
  retries: number
  error?: string
}

export type ConflictResolutionStrategy = 'local' | 'server' | 'merge' | 'manual'

export interface SyncConflictRecord {
  id: string
  tableName: string
  recordId: string
  localData: Record<string, unknown>
  serverData: Record<string, unknown>
  localUpdatedAt: string
  serverUpdatedAt: string
  conflictDetectedAt: string
  resolution?: ConflictResolutionStrategy
  resolvedAt?: string
  resolvedData?: Record<string, unknown>
}

export interface StockAlertRecord {
  id: string
  variantId: string
  productId: string
  productName: string
  variantName: string
  currentStock: number
  minStock: number
  severity: 'info' | 'warning' | 'critical'
  createdAt: Date
  acknowledgedAt?: Date
  isAcknowledged: boolean
}

export interface SalePaymentRecord {
  id: string
  saleId: string
  paymentMethodId: string
  amount: number
  createdAt: Date
  updatedAt: Date
  syncStatus: SyncStatus
  syncedAt?: Date
}

/**
 * Base de datos IndexedDB usando Dexie
 */
class CotillonDatabase extends Dexie {
  categories!: EntityTable<CategoryRecord, 'id'>
  products!: EntityTable<ProductRecord, 'id'>
  productVariants!: EntityTable<ProductVariantRecord, 'id'>
  sales!: EntityTable<SaleRecord, 'id'>
  stockMovements!: EntityTable<StockMovementRecord, 'id'>
  paymentMethods!: EntityTable<PaymentMethodRecord, 'id'>
  users!: EntityTable<UserRecord, 'id'>
  customers!: EntityTable<CustomerRecord, 'id'>
  suppliers!: EntityTable<SupplierRecord, 'id'>
  salePayments!: EntityTable<SalePaymentRecord, 'id'>
  syncQueue!: EntityTable<SyncQueueRecord, 'id'>
  syncConflicts!: EntityTable<SyncConflictRecord, 'id'>
  stockAlerts!: EntityTable<StockAlertRecord, 'id'>

  constructor() {
    super('CotillonDB')

    // Definición del esquema versión 1
    // Sintaxis: 'clavePrimaria, indice1, indice2, ...'
    // & = índice único, * = índice multi-valor, ++ = auto-increment
    this.version(1).stores({
      // Categorías: índices por nombre y estado activo
      categories: 'id, name, isActive, syncStatus',

      // Productos: índices por código, categoría, proveedor, estado
      products: 'id, code, name, categoryId, supplierId, isActive, syncStatus',

      // Variantes: índices por producto, SKU, código de barras
      productVariants: 'id, productId, sku, barcode, isActive, syncStatus',

      // Ventas: índices por número, usuario, cliente, fecha, estado
      sales: 'id, receiptNumber, userId, customerId, status, createdAt, syncStatus',

      // Movimientos de stock: índices por variante, usuario, tipo, fecha
      stockMovements: 'id, variantId, userId, type, referenceId, createdAt, syncStatus',

      // Métodos de pago: índices por nombre, tipo, estado
      paymentMethods: 'id, name, type, isActive, syncStatus',

      // Usuarios: índices por email, rol, estado
      users: 'id, email, role, isActive, syncStatus',

      // Clientes: índices por documento, email, estado
      customers: 'id, documentNumber, email, isActive, syncStatus',

      // Proveedores: índices por nombre, estado
      suppliers: 'id, name, isActive, syncStatus',

      // Cola de sincronización: índices por estado, tabla y operación
      syncQueue: 'id, tableName, operation, timestamp',
      
      // Pagos de ventas: índices por venta y método de pago
      salePayments: 'id, saleId, paymentMethodId, createdAt, syncStatus'
    })

    this.version(2)
      .stores({
        syncQueue: 'id, status, tableName, operation, timestamp'
      })
      .upgrade(async (tx) => {
        await tx.table('syncQueue').toCollection().modify((obj: any) => {
          obj.status = obj.status ?? 'pending'
          obj.timestamp = obj.timestamp ?? obj.createdAt ?? new Date().toISOString()
          obj.retries = obj.retries ?? 0
          obj.error = obj.error ?? null
          obj.data = obj.data ?? null
        })
      })

    this.version(3)
      .stores({
        salePayments: 'id, saleId, paymentMethodId, createdAt, syncStatus'
      })

    this.version(4)
      .stores({
        syncConflicts: 'id, tableName, recordId, resolution, conflictDetectedAt'
      })
      .upgrade(async (tx) => {
        // Migración: crear tabla de conflictos vacía
        console.log('Creando tabla de conflictos de sincronización...')
      })

    this.version(5)
      .stores({
        stockAlerts: 'id, variantId, productId, isAcknowledged, severity, createdAt'
      })
      .upgrade(async (tx) => {
        // Migración: crear tabla de alertas de stock vacía
        console.log('Creando tabla de alertas de stock...')
      })
  }
}

// Instancia singleton de la base de datos
export const db = new CotillonDatabase()

/**
 * Inicializa la base de datos con datos por defecto si está vacía
 * Verifica cada tabla individualmente para evitar duplicados
 */
export async function initializeDatabase(): Promise<void> {
  console.log('Verificando inicialización de base de datos...')

  // Verificar y crear usuario administrador si no existe
  const userCount = await db.users.count()
  if (userCount === 0) {
    console.log('Creando usuario administrador por defecto...')
    await db.users.add({
      id: crypto.randomUUID(),
      name: 'Administrador',
      email: 'admin@cotillon.local',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending'
    })
  }

  // Verificar y crear métodos de pago si no existen
  const paymentMethodCount = await db.paymentMethods.count()
  if (paymentMethodCount === 0) {
    console.log('Creando métodos de pago por defecto...')
    const defaultPaymentMethods: PaymentMethodRecord[] = [
      {
        id: crypto.randomUUID(),
        name: 'Efectivo',
        type: 'cash',
        config: '{}',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending'
      },
      {
        id: crypto.randomUUID(),
        name: 'Tarjeta de Débito',
        type: 'debit',
        config: '{}',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending'
      },
      {
        id: crypto.randomUUID(),
        name: 'Tarjeta de Crédito',
        type: 'credit',
        config: '{}',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending'
      },
      {
        id: crypto.randomUUID(),
        name: 'Transferencia',
        type: 'transfer',
        config: '{}',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending'
      },
      {
        id: crypto.randomUUID(),
        name: 'QR/Mercado Pago',
        type: 'qr',
        config: '{}',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending'
      }
    ]

    await db.paymentMethods.bulkAdd(defaultPaymentMethods)
  }

  console.log('Base de datos inicializada correctamente')
}
