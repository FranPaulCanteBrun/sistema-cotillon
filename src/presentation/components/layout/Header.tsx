import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn, formatRelativeTime } from '@shared/lib/utils'
import { getErrorMessage } from '@shared/errors'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  User,
  CloudOff,
  Check,
  Menu,
  LogOut
} from 'lucide-react'
import { Button } from '../ui/Button'
import { useToastActions } from '../ui/Toast'
import { StockAlertsBadge } from '../stock/StockAlertsBadge'
import { useAuth } from '@presentation/hooks/useAuth'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToastActions()

  // Monitorear estado de conexión
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

  // Actualizar contador de pendientes
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        // Importación dinámica para evitar problemas de inicialización
        const { db } = await import('@infrastructure/persistence/indexeddb/database')
        const count = await db.syncQueue.where('status').anyOf(['pending', 'error']).count()
        setPendingCount(count)
      } catch {
        // DB no lista aún
      }
    }

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSync = async () => {
    if (!isOnline) {
      toast.warning('Sin conexión', 'Espera a tener conexión para sincronizar')
      return
    }

    setIsSyncing(true)
    try {
      const { syncService } = await import('@infrastructure/sync')
      const result = await syncService.sync()
      
      if (result.success) {
        toast.success('Sincronizado', result.message)
      } else {
        toast.error('Error de sincronización', result.message)
      }
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    } finally {
      setIsSyncing(false)
    }
  }

  const lastSyncAtStr = localStorage.getItem('last_sync_at')
  const lastSyncAt = lastSyncAtStr ? new Date(lastSyncAtStr) : null

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 backdrop-blur-sm px-4 lg:px-6">
      {/* Left side - Menu button and Sync status */}
      <div className="flex items-center gap-3">
        {/* Menu button para móviles */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 p-0"
          title="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="hidden lg:flex items-center gap-2 text-xs text-surface-500">
          {lastSyncAt && (
            <span>Última sync: {formatRelativeTime(lastSyncAt)}</span>
          )}
        </div>
      </div>

      {/* Right side - Status and actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Connection Status */}
        <div
          className={cn(
            'flex items-center gap-2 rounded-full px-2 sm:px-3 py-1.5 text-xs font-medium',
            isOnline
              ? 'bg-success-500/10 text-success-600'
              : 'bg-warning-500/10 text-warning-600'
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Sin conexión</span>
            </>
          )}
        </div>

        {/* Sync Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={!isOnline || isSyncing}
          className="h-9 w-9 p-0"
          title={isSyncing ? 'Sincronizando...' : 'Sincronizar datos'}
        >
          <RefreshCw
            className={cn('h-4 w-4', isSyncing && 'animate-spin')}
          />
        </Button>

        {/* Stock Alerts */}
        <StockAlertsBadge />

        {/* Pending Operations */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 relative"
          title={`${pendingCount} operaciones pendientes de sincronizar`}
        >
          {pendingCount > 0 ? (
            <CloudOff className="h-4 w-4 text-warning-500" />
          ) : (
            <Check className="h-4 w-4 text-success-500" />
          )}
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-warning-500 text-[10px] font-bold text-white flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg">
            <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <User className="h-3.5 w-3.5 text-primary-600" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">
              {user?.name || 'Usuario'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout()
              toast.success('Sesión cerrada')
              navigate('/login')
            }}
            className="h-9 w-9 p-0"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
