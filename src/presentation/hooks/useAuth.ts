/**
 * Hook para gestionar la autenticación
 */

import { useState, useEffect, useCallback } from 'react'
import { authService } from '@infrastructure/api'
import type { AuthUser } from '@infrastructure/api'

export function useAuth() {
  // Inicializar con el usuario del localStorage inmediatamente (síncrono)
  const [user, setUser] = useState<AuthUser | null>(() => authService.getUser())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Suscribirse a cambios de usuario (solo para actualizaciones, no bloquea navegación)
  useEffect(() => {
    const unsubscribe = authService.subscribe(setUser)
    return unsubscribe
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const user = await authService.login(email, password)
      return user
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const user = await authService.register(email, password, name)
      return user
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError
  }
}
