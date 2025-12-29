import { cn } from '@shared/lib/utils'

export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    rounded: 'rounded-lg'
  }

  return (
    <div
      className={cn(
        'skeleton bg-surface-200',
        variantClasses[variant],
        className
      )}
    />
  )
}

// Skeletons predefinidos
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-surface-200 p-6', className)}>
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  )
}

export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-surface-200">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-5 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border border-surface-200 overflow-hidden">
      {/* Header */}
      <div className="bg-surface-50 border-b border-surface-200">
        <div className="flex">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 p-4">
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
      {/* Body */}
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={columns} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonProductCard() {
  return (
    <div className="rounded-xl border border-surface-200 p-4">
      <Skeleton className="h-32 w-full rounded-lg mb-3" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-3" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  )
}

// Skeleton para StatCard
export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-surface-200 p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton variant="circular" className="h-10 w-10" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-4 w-16" />
    </div>
  )
}

// Skeleton para tabla de ventas
export function SkeletonSaleRow() {
  return (
    <tr className="border-b border-surface-200">
      <td className="p-4"><Skeleton className="h-4 w-28" /></td>
      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4 text-center"><Skeleton className="h-5 w-20 mx-auto" /></td>
      <td className="p-4 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
      <td className="p-4 w-12"></td>
    </tr>
  )
}

// Skeleton para tabla de productos
export function SkeletonProductRow() {
  return (
    <tr className="border-b border-surface-200">
      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
      <td className="p-4"><Skeleton className="h-4 w-20 ml-auto" /></td>
      <td className="p-4"><Skeleton className="h-5 w-16 mx-auto" /></td>
      <td className="p-4 w-12"></td>
    </tr>
  )
}

// Skeleton para lista de productos (grid)
export function SkeletonProductGrid({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} />
      ))}
    </>
  )
}

// Skeleton para formulario
export function SkeletonFormField() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

