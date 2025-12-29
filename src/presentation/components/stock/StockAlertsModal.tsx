/**
 * Modal para mostrar y gestionar alertas de stock
 */

import { AlertTriangle, Check, X, Package } from 'lucide-react'
import { Modal, Button, Badge, useToastActions } from '@presentation/components/ui'
import { useStockAlerts, useStockAlertMutations } from '@infrastructure/persistence/hooks/useStockAlerts'
import { formatDateTime } from '@shared/lib/utils'
import { getErrorMessage } from '@shared/errors'

interface StockAlertsModalProps {
  onClose: () => void
}

export function StockAlertsModal({ onClose }: StockAlertsModalProps) {
  const { alerts, allAlerts } = useStockAlerts()
  const { acknowledgeAlert, acknowledgeAllAlerts, deleteAlert, detectAndCreateAlerts } = useStockAlertMutations()
  const toast = useToastActions()

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId)
      toast.success('Alerta reconocida')
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  const handleAcknowledgeAll = async () => {
    try {
      await acknowledgeAllAlerts()
      toast.success('Todas las alertas reconocidas')
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  const handleDelete = async (alertId: string) => {
    try {
      await deleteAlert(alertId)
      toast.success('Alerta eliminada')
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  const getSeverityConfig = (severity: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical':
        return {
          variant: 'danger' as const,
          label: 'Crítico',
          className: 'bg-danger-50 border-danger-200'
        }
      case 'warning':
        return {
          variant: 'warning' as const,
          label: 'Advertencia',
          className: 'bg-warning-50 border-warning-200'
        }
      default:
        return {
          variant: 'info' as const,
          label: 'Info',
          className: 'bg-primary-50 border-primary-200'
        }
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Alertas de Stock Bajo"
      size="lg"
    >
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-surface-500">
            <Check className="h-12 w-12 mx-auto mb-3 text-success-500 opacity-50" />
            <p className="font-medium">No hay alertas activas</p>
            <p className="text-sm">Todo el stock está en orden</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-surface-600">
                {alerts.length} alerta(s) pendiente(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await detectAndCreateAlerts()
                      toast.success('Alertas actualizadas', 'Se revisaron todos los productos')
                    } catch (error) {
                      toast.error('Error', getErrorMessage(error))
                    }
                  }}
                  title="Forzar detección de alertas"
                >
                  🔄 Actualizar
                </Button>
                {alerts.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAcknowledgeAll}
                  >
                    Reconocer todas
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-auto">
              {alerts.map(alert => {
                const severityConfig = getSeverityConfig(alert.severity)
                const percentage = Math.round((alert.currentStock / alert.minStock) * 100)

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${severityConfig.className}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={severityConfig.variant} size="sm">
                            {severityConfig.label}
                          </Badge>
                          <span className="font-medium">{alert.productName}</span>
                        </div>
                        {alert.variantName !== 'Estándar' && (
                          <p className="text-sm text-surface-600">{alert.variantName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          title="Reconocer alerta"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(alert.id)}
                          title="Eliminar alerta"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-600">Stock actual:</span>
                        <span className="font-semibold">{alert.currentStock} unidades</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-600">Stock mínimo:</span>
                        <span>{alert.minStock} unidades</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-surface-600">Porcentaje:</span>
                        <span>{percentage}% del mínimo</span>
                      </div>
                      {alert.currentStock === 0 && (
                        <div className="mt-2 p-2 bg-danger-100 rounded text-sm text-danger-700 font-medium">
                          ⚠️ Stock agotado
                        </div>
                      )}
                      <p className="text-xs text-surface-500 mt-2">
                        Detectado: {formatDateTime(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {allAlerts.length > alerts.length && (
          <div className="pt-4 border-t border-surface-200">
            <p className="text-sm text-surface-500 mb-2">
              {allAlerts.length - alerts.length} alerta(s) reconocida(s)
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}

