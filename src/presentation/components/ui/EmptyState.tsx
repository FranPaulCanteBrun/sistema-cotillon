import { type ReactNode } from 'react'
import { cn } from '@shared/lib/utils'
import { Package, Search, FileText, ShoppingCart } from 'lucide-react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-surface-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-surface-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-surface-500 max-w-md">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

// Estados vacíos predefinidos
export function NoProductsEmpty({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={<Package className="h-8 w-8" />}
      title="No hay productos"
      description="Comienza agregando tu primer producto al inventario"
      action={
        onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Agregar producto
          </button>
        )
      }
    />
  )
}

export function NoSearchResultsEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8" />}
      title="Sin resultados"
      description={`No se encontraron resultados para "${query}". Intenta con otros términos.`}
    />
  )
}

export function NoSalesEmpty() {
  return (
    <EmptyState
      icon={<ShoppingCart className="h-8 w-8" />}
      title="No hay ventas"
      description="Aún no se han registrado ventas para el período seleccionado"
    />
  )
}

export function NoDataEmpty() {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" />}
      title="Sin datos"
      description="No hay información disponible para mostrar"
    />
  )
}

