import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@shared/lib/utils'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

// Tipos
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

// Context
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Helper functions para crear toasts fácilmente
export function useToastActions() {
  const { addToast } = useToast()

  return {
    success: (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      addToast({ type: 'info', title, message })
  }
}

// Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

// Container que renderiza los toasts
function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  )
}

// Componente individual de Toast
const toastConfig = {
  success: {
    icon: CheckCircle,
    className: 'bg-success-500',
    iconClassName: 'text-success-500'
  },
  error: {
    icon: AlertCircle,
    className: 'bg-danger-500',
    iconClassName: 'text-danger-500'
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-warning-500',
    iconClassName: 'text-warning-500'
  },
  info: {
    icon: Info,
    className: 'bg-primary-500',
    iconClassName: 'text-primary-500'
  }
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast()
  const config = toastConfig[toast.type]
  const Icon = config.icon
  const duration = toast.duration ?? 5000

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeToast(toast.id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, duration, removeToast])

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg bg-white p-4 shadow-lg border border-surface-200',
        'animate-in slide-in-from-right-full fade-in duration-300'
      )}
      role="alert"
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          config.className + '/10'
        )}
      >
        <Icon className={cn('h-4 w-4', config.iconClassName)} />
      </div>

      <div className="flex-1 pt-0.5">
        <p className="font-medium text-surface-900">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm text-surface-500">{toast.message}</p>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 p-1 rounded text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

