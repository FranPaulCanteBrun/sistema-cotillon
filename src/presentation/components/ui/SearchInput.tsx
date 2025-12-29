import { forwardRef, type InputHTMLAttributes, useState, useEffect, useRef } from 'react'
import { cn } from '@shared/lib/utils'
import { Search, X, Loader2 } from 'lucide-react'

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  debounceMs?: number
  isLoading?: boolean
  value?: string
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onClear, debounceMs = 300, isLoading, value: controlledValue, ...props }, ref) => {
    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = useState(() => controlledValue?.toString() || '')
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
    const isUpdatingFromUserRef = useRef(false)

    // Sincronizar valor controlado solo cuando NO viene del usuario escribiendo
    useEffect(() => {
      if (isControlled && !isUpdatingFromUserRef.current) {
        const controlledStr = controlledValue?.toString() || ''
        if (controlledStr !== internalValue) {
          setInternalValue(controlledStr)
        }
      }
      // Resetear el flag después de sincronizar
      isUpdatingFromUserRef.current = false
    }, [controlledValue, isControlled]) // Removido internalValue para evitar loops

    // Limpiar timeout al desmontar
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      isUpdatingFromUserRef.current = true
      setInternalValue(newValue)

      // Debounce para búsqueda
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        onSearch?.(newValue)
        isUpdatingFromUserRef.current = false
      }, debounceMs)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Si presiona Enter, ejecutar búsqueda inmediatamente
      if (e.key === 'Enter') {
        e.preventDefault()
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        onSearch?.(internalValue)
        isUpdatingFromUserRef.current = false
      }
    }

    const handleClear = () => {
      isUpdatingFromUserRef.current = true
      setInternalValue('')
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      onClear?.()
      onSearch?.('')
      isUpdatingFromUserRef.current = false
    }

    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        <input
          ref={ref}
          type="search"
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-white pl-10 pr-10 py-2 text-sm',
            'placeholder:text-surface-400',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'border-surface-300 focus:border-primary-500 focus:ring-primary-500/20',
            '[&::-webkit-search-cancel-button]:hidden',
            className
          )}
          {...props}
        />

        {internalValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-400 hover:text-surface-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'

export { SearchInput }

