import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'
import { Minus, Plus } from 'lucide-react'

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  error?: string
  hint?: string
  min?: number
  max?: number
  step?: number
  value: number
  onChange: (value: number) => void
  showControls?: boolean
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      min = 0,
      max,
      step = 1,
      value,
      onChange,
      showControls = true,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || `number-${Math.random().toString(36).substr(2, 9)}`

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value)
      if (!isNaN(newValue)) {
        onChange(clampValue(newValue))
      }
    }

    const clampValue = (val: number) => {
      let result = val
      if (min !== undefined) result = Math.max(min, result)
      if (max !== undefined) result = Math.min(max, result)
      return result
    }

    const increment = () => {
      onChange(clampValue(value + step))
    }

    const decrement = () => {
      onChange(clampValue(value - step))
    }

    const canDecrement = min === undefined || value > min
    const canIncrement = max === undefined || value < max

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-surface-700 mb-1.5"
          >
            {label}
            {props.required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}

        <div className={cn(
          'flex items-stretch w-full gap-0 rounded-lg overflow-hidden',
          'border',
          error
            ? 'border-danger-500 focus-within:border-danger-500'
            : 'border-surface-300 focus-within:border-primary-500',
          'focus-within:ring-2 focus-within:ring-offset-0',
          error
            ? 'focus-within:ring-danger-500/20'
            : 'focus-within:ring-primary-500/20'
        )}>
          {showControls && (
            <button
              type="button"
              onClick={decrement}
              disabled={disabled || !canDecrement}
              title="Decrementar"
              className={cn(
                'flex items-center justify-center w-10 h-10 shrink-0',
                'bg-surface-50 hover:bg-surface-100 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border-r border-surface-300',
                error && 'border-danger-500'
              )}
            >
              <Minus className="h-4 w-4 text-surface-600" />
            </button>
          )}

          <input
            ref={ref}
            id={inputId}
            type="number"
            value={value}
            onChange={handleChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              'flex-1 min-w-[80px] h-10 bg-white px-3 py-2 text-sm',
              showControls ? 'text-center' : 'text-left',
              'transition-colors duration-200',
              'focus:outline-none',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-50',
              showControls && 'border-x-0',
              className
            )}
            {...props}
          />

          {showControls && (
            <button
              type="button"
              onClick={increment}
              disabled={disabled || !canIncrement}
              title="Incrementar"
              className={cn(
                'flex items-center justify-center w-10 h-10 shrink-0',
                'bg-surface-50 hover:bg-surface-100 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border-l border-surface-300',
                error && 'border-danger-500'
              )}
            >
              <Plus className="h-4 w-4 text-surface-600" />
            </button>
          )}
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

NumberInput.displayName = 'NumberInput'

export { NumberInput }

