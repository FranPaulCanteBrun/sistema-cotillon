/**
 * Cliente HTTP para comunicación con el backend
 */

import {
  AppError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ServerError,
  toAppError
} from '@shared/errors/AppError'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

interface RequestConfig extends RequestInit {
  params?: Record<string, string>
  timeout?: number
}

interface ApiErrorResponse {
  error: true
  message: string
  statusCode: number
  fields?: Record<string, string[]>
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private defaultTimeout = 30000 // 30 segundos

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.loadToken()
  }

  private loadToken() {
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    return this.token
  }

  isAuthenticated(): boolean {
    return !!this.token
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          url.searchParams.append(key, value)
        }
      })
    }
    return url.toString()
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { params, timeout = this.defaultTimeout, ...fetchConfig } = config

    // Recargar token antes de cada request por si cambió
    this.loadToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config.headers
    }

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    const url = this.buildUrl(endpoint, params)

    // Crear AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Intentar parsear JSON, pero manejar errores de parseo
      let data: unknown
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch (parseError) {
          // Si falla el parseo pero la respuesta es OK, puede ser vacía
          if (response.ok) {
            return undefined as T
          }
          throw new NetworkError('Respuesta inválida del servidor')
        }
      } else {
        // Si no es JSON, leer como texto
        const text = await response.text()
        if (!response.ok) {
          throw new ServerError(text || `HTTP ${response.status}`, response.status)
        }
        return (text ? JSON.parse(text) : undefined) as T
      }

      if (!response.ok) {
        const errorData = data as ApiErrorResponse
        
        // Mapear códigos de estado HTTP a errores específicos
        switch (response.status) {
          case 401:
            throw new AuthenticationError(errorData.message || 'No autenticado', errorData)
          case 403:
            throw new AuthorizationError(errorData.message || 'Sin permisos', errorData)
          case 404:
            throw new NotFoundError(errorData.message || 'Recurso no encontrado', errorData)
          case 400:
            throw new ValidationError(
              errorData.message || 'Datos inválidos',
              errorData.fields,
              errorData
            )
          case 500:
          case 502:
          case 503:
          case 504:
            throw new ServerError(
              errorData.message || 'Error del servidor',
              response.status,
              errorData
            )
          default:
            throw new AppError(
              errorData.message || `HTTP ${response.status}`,
              'API_ERROR',
              response.status,
              errorData
            )
        }
      }

      return data as T
    } catch (error) {
      clearTimeout(timeoutId)

      // Si es un error de abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError('La solicitud tardó demasiado tiempo')
      }

      // Si ya es un AppError, relanzarlo
      if (error instanceof AppError) {
        throw error
      }

      // Convertir errores de fetch a NetworkError
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError('Error de conexión', error)
      }

      // Convertir cualquier otro error
      throw toAppError(error)
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Verificar conectividad con el servidor
  async checkConnection(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl.replace('/api', '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      return true
    } catch {
      return false
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export type { ApiErrorResponse as ApiError }

