import { createContext, useContext, type ReactNode } from 'react'
import { useDatabase } from '@infrastructure/persistence/hooks/useDatabase'
import type { CotillonDatabase } from '@infrastructure/persistence/indexeddb/database'

interface DatabaseContextValue {
  isReady: boolean
  error: Error | null
  db: CotillonDatabase | null
}

const DatabaseContext = createContext<DatabaseContextValue>({
  isReady: false,
  error: null,
  db: null
})

export function useDatabaseContext() {
  return useContext(DatabaseContext)
}

interface DatabaseProviderProps {
  children: ReactNode
}

/**
 * Componente de carga mientras se inicializa la DB
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Logo animado */}
        <div className="relative">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center animate-pulse">
            <span className="text-3xl">🎉</span>
          </div>
        </div>
        
        {/* Texto */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Cotillón Manager</h1>
          <p className="text-surface-400 text-sm mt-1">Iniciando base de datos...</p>
        </div>

        {/* Spinner */}
        <div className="mt-4">
          <div className="h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}

/**
 * Componente de error
 */
function ErrorScreen({ error }: { error: Error }) {
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="h-16 w-16 mx-auto rounded-xl bg-danger-500/20 flex items-center justify-center mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        
        <h1 className="text-xl font-bold text-white">Error de inicialización</h1>
        <p className="text-surface-400 text-sm mt-2">
          No se pudo inicializar la base de datos local.
        </p>
        
        <div className="mt-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20">
          <p className="text-danger-400 text-sm font-mono">{error.message}</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

/**
 * Provider que inicializa la base de datos y muestra estados de carga/error
 */
export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { isReady, error, db } = useDatabase()

  // Mostrar pantalla de carga mientras se inicializa
  if (!isReady && !error) {
    return <LoadingScreen />
  }

  // Mostrar error si falla la inicialización
  if (error) {
    return <ErrorScreen error={error} />
  }

  return (
    <DatabaseContext.Provider value={{ isReady, error, db }}>
      {children}
    </DatabaseContext.Provider>
  )
}

