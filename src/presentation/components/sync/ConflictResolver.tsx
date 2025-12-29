/**
 * Componente para mostrar y resolver conflictos de sincronización
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, Check, X, RefreshCw, Download, Upload } from 'lucide-react'
import { Card, CardHeader, CardTitle, Button, Badge, Modal, Alert, useToastActions } from '@presentation/components/ui'
import { syncService } from '@infrastructure/sync'
import { db, type SyncConflictRecord, type ConflictResolutionStrategy } from '@infrastructure/persistence/indexeddb/database'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatDateTime } from '@shared/lib/utils'
import { getErrorMessage } from '@shared/errors'

export function ConflictResolver() {
  const toast = useToastActions()
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictRecord | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  // Obtener conflictos pendientes (reactivo)
  // Nota: No podemos usar .where('resolution').equals(undefined) porque Dexie no lo soporta
  // En su lugar, obtenemos todos y filtramos
  const conflicts = useLiveQuery(
    async () => {
      const all = await db.syncConflicts.toArray()
      return all.filter(c => !c.resolution)
    },
    [],
    []
  ) ?? []

  const handleResolve = async (strategy: ConflictResolutionStrategy) => {
    if (!selectedConflict) return

    setIsResolving(true)
    try {
      await syncService.resolveConflict(selectedConflict.id, strategy)
      toast.success('Conflicto resuelto', 'Los cambios se aplicarán en la próxima sincronización')
      setSelectedConflict(null)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    } finally {
      setIsResolving(false)
    }
  }

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      categories: 'Categoría',
      products: 'Producto',
      productVariants: 'Variante',
      paymentMethods: 'Método de pago'
    }
    return labels[tableName] || tableName
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-success-600" />
            Conflictos de Sincronización
          </CardTitle>
        </CardHeader>
        <div className="p-6 text-center text-surface-500">
          <Check className="h-12 w-12 mx-auto mb-3 text-success-500 opacity-50" />
          <p className="font-medium">No hay conflictos pendientes</p>
          <p className="text-sm">Todos los datos están sincronizados correctamente</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
            Conflictos de Sincronización
            <Badge variant="danger" size="sm">{conflicts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <div className="p-4 space-y-3">
          <Alert variant="warning" title="Conflictos detectados">
            Se encontraron {conflicts.length} conflicto(s) que requieren resolución manual. 
            Revisa cada uno y decide qué versión mantener.
          </Alert>

          <div className="space-y-2">
            {conflicts.map(conflict => (
              <div
                key={conflict.id}
                className="p-4 border border-warning-200 rounded-lg bg-warning-50/50 hover:bg-warning-50 transition-colors cursor-pointer"
                onClick={() => setSelectedConflict(conflict)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="warning">{getTableLabel(conflict.tableName)}</Badge>
                      <span className="text-sm font-mono text-surface-600">{conflict.recordId}</span>
                    </div>
                    <p className="text-sm text-surface-600">
                      Detectado: {formatDateTime(new Date(conflict.conflictDetectedAt))}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedConflict(conflict)
                    }}
                  >
                    Resolver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Modal de resolución */}
      {selectedConflict && (
        <ConflictResolutionModal
          conflict={selectedConflict}
          onResolve={handleResolve}
          onClose={() => setSelectedConflict(null)}
          isResolving={isResolving}
        />
      )}
    </>
  )
}

interface ConflictResolutionModalProps {
  conflict: SyncConflictRecord
  onResolve: (strategy: ConflictResolutionStrategy) => Promise<void>
  onClose: () => void
  isResolving: boolean
}

function ConflictResolutionModal({
  conflict,
  onResolve,
  onClose,
  isResolving
}: ConflictResolutionModalProps) {
  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      categories: 'Categoría',
      products: 'Producto',
      productVariants: 'Variante',
      paymentMethods: 'Método de pago'
    }
    return labels[tableName] || tableName
  }

  const getFieldLabel = (key: string) => {
    const labels: Record<string, string> = {
      name: 'Nombre',
      description: 'Descripción',
      code: 'Código',
      basePrice: 'Precio base',
      basePriceCents: 'Precio base (centavos)',
      minStock: 'Stock mínimo',
      isActive: 'Activo',
      categoryId: 'Categoría',
      type: 'Tipo',
      currentStock: 'Stock actual',
      sku: 'SKU',
      color: 'Color',
      size: 'Tamaño',
      price: 'Precio',
      priceCents: 'Precio (centavos)',
      barcode: 'Código de barras'
    }
    return labels[key] || key
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Sí' : 'No'
    if (typeof value === 'number') return value.toLocaleString('es-AR')
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  const localKeys = Object.keys(conflict.localData)
  const serverKeys = Object.keys(conflict.serverData)
  const allKeys = [...new Set([...localKeys, ...serverKeys])]

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Resolver conflicto - ${getTableLabel(conflict.tableName)}`}
      size="lg"
    >
      <div className="space-y-4">
        <Alert variant="warning">
          Este registro fue modificado localmente y en el servidor. 
          Elige qué versión mantener o combina los cambios manualmente.
        </Alert>

        <div className="grid grid-cols-2 gap-4 max-h-96 overflow-auto">
          {/* Versión Local */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Upload className="h-4 w-4 text-primary-600" />
              <h3 className="font-semibold">Versión Local</h3>
              <Badge variant="info" size="sm">
                {formatDateTime(new Date(conflict.localUpdatedAt))}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              {allKeys.map(key => {
                const localValue = conflict.localData[key]
                const serverValue = conflict.serverData[key]
                const isDifferent = localValue !== serverValue

                return (
                  <div
                    key={key}
                    className={`p-2 rounded ${isDifferent ? 'bg-primary-50 border border-primary-200' : 'bg-surface-50'}`}
                  >
                    <div className="font-medium text-surface-700">{getFieldLabel(key)}</div>
                    <div className="text-surface-600">{formatValue(localValue)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Versión Servidor */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Download className="h-4 w-4 text-success-600" />
              <h3 className="font-semibold">Versión Servidor</h3>
              <Badge variant="success" size="sm">
                {formatDateTime(new Date(conflict.serverUpdatedAt))}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              {allKeys.map(key => {
                const localValue = conflict.localData[key]
                const serverValue = conflict.serverData[key]
                const isDifferent = localValue !== serverValue

                return (
                  <div
                    key={key}
                    className={`p-2 rounded ${isDifferent ? 'bg-success-50 border border-success-200' : 'bg-surface-50'}`}
                  >
                    <div className="font-medium text-surface-700">{getFieldLabel(key)}</div>
                    <div className="text-surface-600">{formatValue(serverValue)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-surface-200">
          <Button
            variant="primary"
            onClick={() => onResolve('local')}
            disabled={isResolving}
            className="flex-1"
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Mantener Local
          </Button>
          <Button
            variant="success"
            onClick={() => onResolve('server')}
            disabled={isResolving}
            className="flex-1"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Usar Servidor
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isResolving}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

