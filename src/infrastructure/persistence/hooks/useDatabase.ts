import { useEffect, useState } from 'react'
import { db, initializeDatabase } from '../indexeddb/database'

/**
 * Hook para inicializar y verificar el estado de la base de datos
 */
export function useDatabase() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // Abrir la base de datos
        await db.open()
        
        // Inicializar datos por defecto
        await initializeDatabase()
        
        setIsReady(true)
      } catch (err) {
        console.error('Error inicializando base de datos:', err)
        setError(err instanceof Error ? err : new Error('Error desconocido'))
      }
    }

    init()
  }, [])

  return { isReady, error, db }
}

