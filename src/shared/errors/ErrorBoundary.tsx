/**
 * Error Boundary de React para capturar errores no manejados
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Alert } from '@presentation/components/ui'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@presentation/components/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error
    console.error('Error capturado por ErrorBoundary:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Notificar al callback si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Renderizar UI de error por defecto
      const error = this.state.error
      const isDevelopment = import.meta.env.DEV

      return (
        <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <Alert variant="danger" title="Algo salió mal">
              <div className="space-y-4">
                <p className="text-sm">
                  Ocurrió un error inesperado. Por favor, intenta recargar la página o volver al inicio.
                </p>

                {isDevelopment && error && (
                  <div className="mt-4 p-3 rounded-lg bg-danger-500/10 border border-danger-500/20">
                    <p className="text-xs font-mono text-danger-400 break-all">
                      {error.message}
                    </p>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="text-xs text-danger-400 cursor-pointer">
                          Detalles técnicos
                        </summary>
                        <pre className="mt-2 text-xs text-danger-300 overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button
                    onClick={this.handleReset}
                    variant="primary"
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Intentar de nuevo
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="secondary"
                    className="flex-1"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Ir al inicio
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    variant="secondary"
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recargar página
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

