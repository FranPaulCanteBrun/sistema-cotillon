/**
 * Hook para manejar errores de forma consistente
 */

import { useCallback } from 'react'
import { useToastActions } from '@presentation/components/ui'
import { getErrorMessage, type AppError } from '@shared/errors'

/**
 * Hook que proporciona funciones para manejar errores de forma consistente
 */
export function useErrorHandler() {
  const toast = useToastActions()

  /**
   * Maneja un error y muestra un toast apropiado
   */
  const handleError = useCallback(
    (error: unknown, defaultMessage?: string) => {
      const message = getErrorMessage(error)
      const finalMessage = defaultMessage || message

      // Si es un error de autenticación, no mostrar toast (se manejará en el router)
      if (error instanceof AppError && error.code === 'AUTH_ERROR') {
        return
      }

      toast.error('Error', finalMessage)
    },
    [toast]
  )

  /**
   * Maneja un error silenciosamente (sin toast)
   */
  const handleErrorSilently = useCallback((error: unknown): string => {
    return getErrorMessage(error)
  }, [])

  /**
   * Wrapper para funciones async que maneja errores automáticamente
   */
  const withErrorHandling = useCallback(
    <T extends (...args: unknown[]) => Promise<unknown>>(
      fn: T,
      errorMessage?: string
    ): T => {
      return (async (...args: Parameters<T>) => {
        try {
          return await fn(...args)
        } catch (error) {
          handleError(error, errorMessage)
          throw error
        }
      }) as T
    },
    [handleError]
  )

  return {
    handleError,
    handleErrorSilently,
    withErrorHandling
  }
}

