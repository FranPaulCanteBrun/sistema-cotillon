/**
 * Servicio de autenticación
 */

import { apiClient } from './client'

interface LoginResponse {
  token: string
  user: AuthUser
}

interface AuthUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'SELLER'
}

class AuthService {
  private currentUser: AuthUser | null = null
  private listeners: Set<(user: AuthUser | null) => void> = new Set()

  constructor() {
    this.loadUser()
  }

  private loadUser() {
    const userData = localStorage.getItem('auth_user')
    if (userData) {
      try {
        this.currentUser = JSON.parse(userData)
      } catch {
        this.currentUser = null
      }
    }
  }

  private saveUser(user: AuthUser | null) {
    this.currentUser = user
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('auth_user')
    }
    this.notifyListeners()
  }

  subscribe(listener: (user: AuthUser | null) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser))
  }

  getUser(): AuthUser | null {
    return this.currentUser
  }

  isAuthenticated(): boolean {
    return !!this.currentUser && apiClient.isAuthenticated()
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password
    })

    apiClient.setToken(response.token)
    this.saveUser(response.user)

    return response.user
  }

  async register(email: string, password: string, name: string): Promise<AuthUser> {
    const response = await apiClient.post<LoginResponse>('/auth/register', {
      email,
      password,
      name
    })

    apiClient.setToken(response.token)
    this.saveUser(response.user)

    return response.user
  }

  async logout(): Promise<void> {
    apiClient.setToken(null)
    this.saveUser(null)
  }

  async refreshUser(): Promise<AuthUser | null> {
    if (!apiClient.isAuthenticated()) {
      return null
    }

    try {
      const response = await apiClient.get<{ user: AuthUser }>('/auth/me')
      this.saveUser(response.user)
      return response.user
    } catch {
      // Token inválido
      this.logout()
      return null
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put('/auth/password', {
      currentPassword,
      newPassword
    })
  }
}

export const authService = new AuthService()
export type { AuthUser }

