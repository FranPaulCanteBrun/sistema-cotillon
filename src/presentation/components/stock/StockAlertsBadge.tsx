/**
 * Badge de alertas de stock para el Header
 */

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@presentation/components/ui'
import { useStockAlerts } from '@infrastructure/persistence/hooks/useStockAlerts'
import { StockAlertsModal } from './StockAlertsModal'
import { cn } from '@shared/lib/utils'

export function StockAlertsBadge() {
  const { count, criticalCount } = useStockAlerts()
  const [showModal, setShowModal] = useState(false)
  const previousCountRef = useRef<number>(count)
  const wasHiddenRef = useRef<boolean>(count === 0)

  // Detectar cuando el badge aparece después de estar oculto
  useEffect(() => {
    // Si el badge estaba oculto y ahora hay alertas, significa que apareció
    if (wasHiddenRef.current && count > 0) {
      wasHiddenRef.current = false
      // El sonido ya se reproduce en StockAlertsProvider cuando detecta nuevas alertas
    } else if (count === 0) {
      wasHiddenRef.current = true
    }
    
    previousCountRef.current = count
  }, [count])

  // El badge siempre se muestra si hay alertas (no retorna null)
  // Esto asegura que aparezca cuando se detectan nuevas alertas
  return (
    <>
      {count > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowModal(true)}
          className="h-9 w-9 p-0 relative"
          title={`${count} alerta(s) de stock bajo`}
        >
          <Bell className={cn(
            'h-4 w-4',
            criticalCount > 0 ? 'text-danger-500' : 'text-warning-500'
          )} />
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center',
            criticalCount > 0 ? 'bg-danger-500' : 'bg-warning-500'
          )}>
            {count > 9 ? '9+' : count}
          </span>
        </Button>
      )}

      {showModal && (
        <StockAlertsModal onClose={() => setShowModal(false)} />
      )}
    </>
  )
}

