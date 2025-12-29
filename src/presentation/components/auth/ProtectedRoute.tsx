import { Navigate } from 'react-router-dom'
import { useAuth } from '@presentation/hooks/useAuth'
import { LoadingSpinner } from '@presentation/components/ui'
import { authService } from '@infrastructure/api'
import { useMemo } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  // Verificar usuario de forma síncrona para no bloquear navegación
  const hasUser = useMemo(() => authService.getUser(), [])

  // Solo mostrar loading en la carga inicial si no hay usuario
  // Una vez que hay usuario, nunca bloquear navegación
  if (isLoading && !hasUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Verificando sesión..." />
      </div>
    )
  }

  // Si no está autenticado, redirigir (pero no bloquear navegación)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Renderizar inmediatamente si está autenticado
  return <>{children}</>
}

