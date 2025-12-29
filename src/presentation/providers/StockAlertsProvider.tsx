/**
 * Provider para inicializar la detección automática de alertas de stock
 */

import { useEffect, useRef } from 'react'
import { useStockAlertMutations, useStockAlerts } from '@infrastructure/persistence/hooks/useStockAlerts'

// Función para reproducir sonido de notificación suave
function playNotificationSound() {
  try {
    // Crear un sonido suave usando Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Configurar un sonido suave y agradable (nota Do, 523.25 Hz)
    oscillator.frequency.value = 523.25
    oscillator.type = 'sine' // Onda sinusoidal suave

    // Configurar volumen bajo (0.1 = 10% del volumen máximo)
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    // Duración corta (300ms)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    // Si falla, no hacer nada (algunos navegadores pueden bloquear audio)
    console.debug('No se pudo reproducir sonido de notificación:', error)
  }
}

export function StockAlertsProvider({ children }: { children: React.ReactNode }) {
  const { detectAndCreateAlerts } = useStockAlertMutations()
  const { count } = useStockAlerts()
  const previousCountRef = useRef<number>(0)
  const isInitialMountRef = useRef(true)

  // Detectar alertas al montar el componente y periódicamente
  useEffect(() => {
    // Detectar inmediatamente
    detectAndCreateAlerts()

    // Detectar cada 30 segundos para mantener las alertas actualizadas
    const interval = setInterval(() => {
      detectAndCreateAlerts()
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [detectAndCreateAlerts])

  // Detectar nuevas alertas y reproducir sonido
  useEffect(() => {
    // Ignorar el primer render (montaje inicial)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      previousCountRef.current = count
      return
    }

    // Si hay nuevas alertas (el conteo aumentó)
    if (count > previousCountRef.current) {
      // Reproducir sonido suave
      playNotificationSound()
    }

    // Actualizar el conteo anterior
    previousCountRef.current = count
  }, [count])

  return <>{children}</>
}

