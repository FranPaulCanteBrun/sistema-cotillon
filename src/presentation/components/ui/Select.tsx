import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`
    
    // Extraer clases de ancho del className para aplicarlas también al contenedor
    const widthClasses = className?.match(/\bw-\S+/g) || []
    const otherClasses = className?.replace(/\bw-\S+/g, '').trim() || ''
    const containerWidthClass = widthClasses.length > 0 ? widthClasses[0] : 'w-full'

    return (
      <div className={widthClasses.length > 0 ? containerWidthClass : 'w-full'}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-surface-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}

        <div className={cn('relative', containerWidthClass)}>
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'flex h-10 w-full rounded-lg border bg-white pl-3 pr-10 py-2 text-sm',
              'appearance-none cursor-pointer',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
                : 'border-surface-300 focus:border-primary-500 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-50',
              !props.value && 'text-surface-400',
              otherClasses || undefined
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-surface-400 z-10">
            <ChevronDown className="h-4 w-4 shrink-0" />
          </div>
        </div>

        {(error || hint) && (
          <p
            className={cn(
              'mt-1.5 text-xs',
              error ? 'text-danger-500' : 'text-surface-500'
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select }

