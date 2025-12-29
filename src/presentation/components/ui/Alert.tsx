import { type HTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  onClose?: () => void
}

const variantConfig = {
  info: {
    containerClass: 'bg-primary-50 border-primary-200',
    iconClass: 'text-primary-600',
    titleClass: 'text-primary-800',
    textClass: 'text-primary-700',
    Icon: Info
  },
  success: {
    containerClass: 'bg-success-500/10 border-success-200',
    iconClass: 'text-success-600',
    titleClass: 'text-success-800',
    textClass: 'text-success-700',
    Icon: CheckCircle
  },
  warning: {
    containerClass: 'bg-warning-500/10 border-warning-200',
    iconClass: 'text-warning-600',
    titleClass: 'text-warning-800',
    textClass: 'text-warning-700',
    Icon: AlertTriangle
  },
  danger: {
    containerClass: 'bg-danger-500/10 border-danger-200',
    iconClass: 'text-danger-600',
    titleClass: 'text-danger-800',
    textClass: 'text-danger-700',
    Icon: AlertCircle
  }
}

export function Alert({
  className,
  variant = 'info',
  title,
  children,
  onClose,
  ...props
}: AlertProps) {
  const config = variantConfig[variant]
  const Icon = config.Icon

  return (
    <div
      className={cn(
        'relative flex gap-3 rounded-lg border p-4',
        config.containerClass,
        className
      )}
      role="alert"
      {...props}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconClass)} />

      <div className="flex-1">
        {title && (
          <h3 className={cn('font-medium', config.titleClass)}>{title}</h3>
        )}
        {children && (
          <div className={cn('text-sm', title && 'mt-1', config.textClass)}>
            {children}
          </div>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'p-1 rounded hover:bg-black/5 transition-colors',
            config.iconClass
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

