import { type HTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md'
}

const variantClasses = {
  default: 'bg-surface-100 text-surface-700',
  success: 'bg-success-500/10 text-success-600',
  warning: 'bg-warning-500/10 text-warning-600',
  danger: 'bg-danger-500/10 text-danger-600',
  info: 'bg-primary-500/10 text-primary-600',
  outline: 'border border-surface-300 text-surface-600'
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs'
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

// Badges específicos para estados comunes
export function StatusBadge({ status }: { status: 'pending' | 'completed' | 'cancelled' | 'refunded' }) {
  const config = {
    pending: { variant: 'warning' as const, label: 'Pendiente' },
    completed: { variant: 'success' as const, label: 'Completada' },
    cancelled: { variant: 'danger' as const, label: 'Cancelada' },
    refunded: { variant: 'info' as const, label: 'Reembolsada' }
  }

  const { variant, label } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
  if (stock === 0) {
    return <Badge variant="danger">Sin stock</Badge>
  }
  if (stock < minStock) {
    return <Badge variant="warning">Stock bajo ({stock})</Badge>
  }
  return <Badge variant="success">{stock} unidades</Badge>
}

export function SyncBadge({ status }: { status: 'pending' | 'synced' | 'error' | 'conflict' }) {
  const config = {
    pending: { variant: 'warning' as const, label: 'Pendiente' },
    synced: { variant: 'success' as const, label: 'Sincronizado' },
    error: { variant: 'danger' as const, label: 'Error' },
    conflict: { variant: 'danger' as const, label: 'Conflicto' }
  }

  const { variant, label } = config[status]
  return <Badge variant={variant} size="sm">{label}</Badge>
}

