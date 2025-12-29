/**
 * Componente de spinner de carga reutilizable
 */

import { cn } from '@shared/lib/utils'
import { Loader2 } from 'lucide-react'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary-600', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-surface-500">{text}</p>
      )}
    </div>
  )
}

// Spinner inline para usar dentro de texto o botones
export function InlineSpinner({ size = 'sm', className }: Omit<LoadingSpinnerProps, 'text'>) {
  return (
    <Loader2 className={cn('animate-spin text-current', sizeClasses[size], className)} />
  )
}

