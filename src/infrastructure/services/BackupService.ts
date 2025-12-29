/**
 * Servicio para backup y restauración de datos
 * Exporta e importa todos los datos de IndexedDB
 */

import { db } from '../persistence/indexeddb/database'

export interface BackupData {
  version: string
  timestamp: string
  deviceId: string
  data: {
    categories: unknown[]
    products: unknown[]
    productVariants: unknown[]
    paymentMethods: unknown[]
    sales: unknown[]
    stockMovements: unknown[]
    customers: unknown[]
    suppliers: unknown[]
    users: unknown[]
    syncQueue: unknown[]
    syncConflicts: unknown[]
    stockAlerts: unknown[]
  }
}

/**
 * Exporta todos los datos de IndexedDB a un objeto JSON
 */
export async function exportBackup(): Promise<BackupData> {
  const [
    categories,
    products,
    productVariants,
    paymentMethods,
    sales,
    stockMovements,
    customers,
    suppliers,
    users,
    syncQueue,
    syncConflicts,
    stockAlerts
  ] = await Promise.all([
    db.categories.toArray(),
    db.products.toArray(),
    db.productVariants.toArray(),
    db.paymentMethods.toArray(),
    db.sales.toArray(),
    db.stockMovements.toArray(),
    db.customers.toArray(),
    db.suppliers.toArray(),
    db.users.toArray(),
    db.syncQueue.toArray(),
    db.syncConflicts.toArray(),
    db.stockAlerts.toArray()
  ])

  // Los saleItems están dentro de sales, así que los extraemos
  const saleItems = sales.flatMap(sale => sale.items || [])

  const deviceId = localStorage.getItem('device_id') || 'unknown'

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    deviceId,
    data: {
      categories,
      products,
      productVariants,
      paymentMethods,
      sales,
      saleItems,
      stockMovements,
      customers,
      suppliers,
      users,
      syncQueue,
      syncConflicts,
      stockAlerts
    }
  }
}

/**
 * Descarga el backup como archivo JSON
 */
export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `backup-inventario-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Valida el formato de un archivo de backup
 */
export function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const backup = data as Partial<BackupData>
  
  if (!backup.version || !backup.timestamp || !backup.data) {
    return false
  }

  const requiredTables = [
    'categories',
    'products',
    'productVariants',
    'paymentMethods',
    'sales',
    'stockMovements',
    'customers',
    'suppliers',
    'users',
    'syncQueue',
    'syncConflicts',
    'stockAlerts'
  ]

  for (const table of requiredTables) {
    if (!Array.isArray(backup.data[table as keyof typeof backup.data])) {
      return false
    }
  }

  return true
}

/**
 * Lee un archivo de backup desde un File
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string
        const data = JSON.parse(json)
        
        if (!validateBackup(data)) {
          reject(new Error('El archivo no es un backup válido'))
          return
        }

        resolve(data)
      } catch (error) {
        reject(new Error('Error al leer el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido')))
      }
    }
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }
    reader.readAsText(file)
  })
}

/**
 * Restaura datos desde un backup
 * @param backup Datos del backup a restaurar
 * @param options Opciones de restauración
 */
export interface RestoreOptions {
  clearBeforeRestore?: boolean // Limpiar datos existentes antes de restaurar
  tables?: string[] // Tablas específicas a restaurar (si no se especifica, restaura todas)
}

export async function restoreBackup(
  backup: BackupData,
  options: RestoreOptions = {}
): Promise<{ restored: number; errors: string[] }> {
  const { clearBeforeRestore = false, tables } = options
  const errors: string[] = []
  let restored = 0

  try {
    // Limpiar datos existentes si se solicita
    if (clearBeforeRestore) {
      await Promise.all([
        db.categories.clear(),
        db.products.clear(),
        db.productVariants.clear(),
        db.paymentMethods.clear(),
        db.sales.clear(),
        db.stockMovements.clear(),
        db.customers.clear(),
        db.suppliers.clear(),
        db.users.clear(),
        db.syncQueue.clear(),
        db.syncConflicts.clear(),
        db.stockAlerts.clear()
      ])
    }

    // Restaurar tablas
    const restoreTable = async (tableName: keyof BackupData['data'], data: unknown[]) => {
      if (tables && !tables.includes(tableName)) {
        return // Saltar esta tabla si no está en la lista
      }

      // Saltar saleItems ya que están dentro de sales
      if (tableName === 'saleItems') {
        return
      }

      try {
        // Limpiar solo esta tabla si no se limpió todo antes
        if (!clearBeforeRestore) {
          await db[tableName].clear()
        }

        // Insertar datos
        if (data.length > 0) {
          await db[tableName].bulkAdd(data)
          restored += data.length
        }
      } catch (error) {
        const errorMsg = `Error al restaurar ${tableName}: ${error instanceof Error ? error.message : 'Error desconocido'}`
        errors.push(errorMsg)
        console.error(errorMsg, error)
      }
    }

    // Restaurar todas las tablas
    await Promise.all([
      restoreTable('categories', backup.data.categories),
      restoreTable('products', backup.data.products),
      restoreTable('productVariants', backup.data.productVariants),
      restoreTable('paymentMethods', backup.data.paymentMethods),
      restoreTable('sales', backup.data.sales),
      restoreTable('stockMovements', backup.data.stockMovements),
      restoreTable('customers', backup.data.customers),
      restoreTable('suppliers', backup.data.suppliers),
      restoreTable('users', backup.data.users),
      restoreTable('syncQueue', backup.data.syncQueue),
      restoreTable('syncConflicts', backup.data.syncConflicts),
      restoreTable('stockAlerts', backup.data.stockAlerts)
    ])

    return { restored, errors }
  } catch (error) {
    errors.push(`Error general: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    return { restored, errors }
  }
}

/**
 * Obtiene estadísticas del backup
 */
export function getBackupStats(backup: BackupData): {
  totalRecords: number
  tables: Record<string, number>
  timestamp: string
  version: string
} {
  const tables: Record<string, number> = {}
  let totalRecords = 0

  for (const [tableName, records] of Object.entries(backup.data)) {
    const count = Array.isArray(records) ? records.length : 0
    tables[tableName] = count
    totalRecords += count
  }

  return {
    totalRecords,
    tables,
    timestamp: backup.timestamp,
    version: backup.version
  }
}

