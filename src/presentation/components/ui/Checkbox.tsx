import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  description?: string
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, onCheckedChange, onChange, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked)
      }
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <div className="relative h-4 w-4">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              className={cn(
                'peer h-4 w-4 shrink-0 rounded border cursor-pointer',
                'appearance-none bg-white',
                'border-surface-300',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
                'checked:bg-primary-600 checked:border-primary-600',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
              )}
              onChange={handleChange}
              {...props}
            />
            <Check
              className={cn(
                'absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-white pointer-events-none',
                'opacity-0 peer-checked:opacity-100 transition-opacity'
              )}
              strokeWidth={3}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="ml-2.5">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium text-surface-900 cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-surface-500 mt-0.5">{description}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox }

