/**
 * Componente para escanear códigos de barras usando la cámara
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, CameraOff } from 'lucide-react'
import { Button, Modal } from '@presentation/components/ui'
import { getErrorMessage } from '@shared/errors'

// Importación dinámica de html5-qrcode para evitar problemas de carga
let Html5Qrcode: typeof import('html5-qrcode').Html5Qrcode | null = null

// Cargar la librería de forma asíncrona
const loadHtml5Qrcode = async () => {
  if (!Html5Qrcode) {
    const module = await import('html5-qrcode')
    Html5Qrcode = module.Html5Qrcode
  }
  return Html5Qrcode
}

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode').Html5Qrcode> | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Función para iniciar el escáner
  const startScanner = useCallback(async () => {
    if (scannerRef.current) {
      // Ya hay un escáner activo
      return
    }

    try {
      // Verificar soporte de cámara
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasPermission(false)
        setError('Tu navegador no soporta acceso a la cámara')
        return
      }

      // Solicitar permisos de cámara
      setError(null)
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        setHasPermission(true)
      } catch (err) {
        setHasPermission(false)
        setError('No se pudo acceder a la cámara. Verifica los permisos.')
        console.error('Error al acceder a la cámara:', err)
        return
      }

      // Cargar la librería si no está cargada
      const Html5QrcodeClass = await loadHtml5Qrcode()
      if (!Html5QrcodeClass) {
        throw new Error('No se pudo cargar la librería de escaneo')
      }

      const scannerId = 'barcode-scanner'
      const scanner = new Html5QrcodeClass(scannerId)
      scannerRef.current = scanner

      // Configuración para códigos de barras
      // html5-qrcode soporta códigos de barras por defecto
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0
      }

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Código escaneado exitosamente
          onScan(decodedText)
          // Detener el escáner después de escanear
          scanner.stop().catch(() => {})
          scanner.clear().catch(() => {})
          scannerRef.current = null
          setIsScanning(false)
          onClose()
        },
        () => {
          // Ignorar errores de escaneo (solo se llama cuando no encuentra código)
        }
      )

      setIsScanning(true)
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
      setIsScanning(false)
      setHasPermission(false)
      console.error('Error al iniciar el escáner:', err)
    }
  }, [onScan, onClose])

  // Limpiar cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      // Limpiar cuando se cierra
      const cleanup = async () => {
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop()
          } catch (err) {
            // Ignorar errores al detener
          }
          try {
            scannerRef.current.clear()
          } catch (err) {
            // Ignorar errores al limpiar
          }
          scannerRef.current = null
        }
        setIsScanning(false)
        setError(null)
        setHasPermission(null)
      }
      cleanup()
      return
    }
  }, [isOpen])

  // Limpiar al desmontar el componente
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [])

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        // Ignorar errores al detener
      }
      try {
        scannerRef.current.clear()
      } catch (err) {
        // Ignorar errores al limpiar
      }
      scannerRef.current = null
      setIsScanning(false)
      setHasPermission(null)
    }
  }

  const handleClose = () => {
    stopScanner()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Escanear código de barras"
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
            {error}
          </div>
        )}

        {hasPermission === null && (
          <div className="p-4 text-center space-y-3">
            <Camera className="h-12 w-12 mx-auto text-surface-400" />
            <p className="text-surface-600">
              Haz clic en "Iniciar escaneo" para comenzar a escanear códigos de barras.
            </p>
            <Button onClick={startScanner} variant="primary" className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Iniciar escaneo
            </Button>
          </div>
        )}

        {hasPermission === false && (
          <div className="p-4 text-center space-y-3">
            <CameraOff className="h-12 w-12 mx-auto text-surface-400" />
            <p className="text-surface-600">
              No se pudo acceder a la cámara. Por favor, verifica los permisos en tu navegador.
            </p>
            <Button onClick={startScanner} variant="secondary">
              Intentar de nuevo
            </Button>
          </div>
        )}

        {hasPermission === true && (
          <>
            <div className="relative bg-surface-900 rounded-lg overflow-hidden">
              <div id="barcode-scanner" className="w-full" style={{ minHeight: '300px' }} />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-primary-500 rounded-lg w-64 h-40" />
                </div>
              )}
            </div>

            <div className="text-center text-sm text-surface-600">
              {isScanning ? (
                <p>Apunta la cámara hacia el código de barras</p>
              ) : (
                <p>Preparando escáner...</p>
              )}
            </div>

            <div className="flex gap-2">
              {isScanning ? (
                <Button
                  onClick={stopScanner}
                  variant="secondary"
                  className="flex-1"
                >
                  <CameraOff className="h-4 w-4 mr-2" />
                  Detener escaneo
                </Button>
              ) : (
                <Button
                  onClick={startScanner}
                  variant="secondary"
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Iniciar escaneo
                </Button>
              )}
              <Button onClick={handleClose} variant="ghost" className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Cerrar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
