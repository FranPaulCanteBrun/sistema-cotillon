import { type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

// Table Container
export interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export function Table({ className, ...props }: TableProps) {
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border border-surface-200">
      <table
        className={cn('w-full caption-bottom text-sm min-w-[640px]', className)}
        {...props}
      />
    </div>
  )
}

// Table Header
export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableHeader({ className, ...props }: TableHeaderProps) {
  return (
    <thead
      className={cn('bg-surface-50 [&_tr]:border-b', className)}
      {...props}
    />
  )
}

// Table Body
export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({ className, ...props }: TableBodyProps) {
  return (
    <tbody
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

// Table Footer
export interface TableFooterProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableFooter({ className, ...props }: TableFooterProps) {
  return (
    <tfoot
      className={cn('bg-surface-50 font-medium', className)}
      {...props}
    />
  )
}

// Table Row
export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}

export function TableRow({ className, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        'border-b border-surface-200 transition-colors',
        'hover:bg-surface-50/50',
        'data-[state=selected]:bg-primary-50',
        className
      )}
      {...props}
    />
  )
}

// Table Head Cell
export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {}

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        'h-11 px-2 sm:px-4 text-left align-middle font-medium text-surface-600 whitespace-nowrap',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

// Table Cell
export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {}

export function TableCell({ className, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'p-2 sm:p-4 align-middle text-surface-900',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
}

// Table Caption
export interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {}

export function TableCaption({ className, ...props }: TableCaptionProps) {
  return (
    <caption
      className={cn('mt-4 text-sm text-surface-500', className)}
      {...props}
    />
  )
}

// Empty State para tablas
export interface TableEmptyProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  colSpan?: number
}

export function TableEmpty({
  icon,
  title,
  description,
  action,
  colSpan = 1
}: TableEmptyProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48">
        <div className="flex flex-col items-center justify-center text-center">
          {icon && (
            <div className="mb-3 text-surface-300">{icon}</div>
          )}
          <h3 className="font-medium text-surface-900">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-surface-500 max-w-sm">
              {description}
            </p>
          )}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  )
}

