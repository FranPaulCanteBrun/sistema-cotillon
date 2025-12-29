import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { UserMapper } from '../indexeddb/mappers/UserMapper'
import { UserRepository } from '../indexeddb/repositories/UserRepository'
import { User } from '@domain/entities/User'
import { Email } from '@domain/value-objects/Email'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@infrastructure/api/client'
import { syncService } from '@infrastructure/sync'
import { getErrorMessage } from '@shared/errors'

const userRepository = new UserRepository()

/**
 * Función para sincronizar usuarios desde el servidor
 */
export async function syncUsersFromServer(): Promise<void> {
  try {
    const usersResponse = await apiClient.get<{ users: Array<{
      id: string
      name: string
      email: string
      role: 'ADMIN' | 'MANAGER' | 'SELLER'
      isActive: boolean
      lastLoginAt: string | null
      createdAt: string
      updatedAt: string
    }> }>('/users')
    
    // Sincronizar todos los usuarios del servidor a IndexedDB
    for (const serverUser of usersResponse.users) {
      try {
        const user = User.fromPersistence({
          id: serverUser.id,
          name: serverUser.name,
          email: Email.create(serverUser.email),
          role: serverUser.role.toLowerCase() as any,
          isActive: serverUser.isActive,
          lastLoginAt: serverUser.lastLoginAt ? new Date(serverUser.lastLoginAt) : undefined,
          createdAt: new Date(serverUser.createdAt),
          updatedAt: new Date(serverUser.updatedAt),
          syncStatus: 'synced'
        })
        
        await userRepository.save(user)
      } catch (saveError) {
        // Continuar con el siguiente usuario si hay un error al guardar uno
        console.warn(`Error al guardar usuario ${serverUser.email}:`, saveError)
      }
    }
  } catch (error) {
    console.error('Error al sincronizar usuarios desde el servidor:', error)
    throw error
  }
}

/**
 * Hook para obtener todos los usuarios (reactivo)
 */
export function useUsers() {
  const records = useLiveQuery(() => db.users.toArray())

  return {
    users: records ? UserMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener usuarios activos (reactivo)
 */
export function useActiveUsers() {
  const records = useLiveQuery(() => 
    db.users.filter(u => u.isActive).toArray()
  )

  return {
    users: records ? UserMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener un usuario por ID
 */
export function useUser(id: string | undefined) {
  const record = useLiveQuery(
    () => (id ? db.users.get(id) : undefined),
    [id]
  )

  return {
    user: record ? UserMapper.toDomain(record) : null,
    isLoading: record === undefined && id !== undefined
  }
}

/**
 * Funciones de mutación para usuarios
 */
export function useUserMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; role: 'ADMIN' | 'MANAGER' | 'SELLER' | 'admin' | 'manager' | 'seller'; isActive?: boolean }) => {
      // Convertir rol a mayúsculas si viene en minúsculas
      const roleUpper = typeof data.role === 'string' ? data.role.toUpperCase() as 'ADMIN' | 'MANAGER' | 'SELLER' : data.role
      const dataWithUpperRole = { ...data, role: roleUpper }
      
      try {
        // Crear en el servidor
        const response = await apiClient.post<{ user: {
          id: string
          name: string
          email: string
          role: 'ADMIN' | 'MANAGER' | 'SELLER'
          isActive: boolean
          lastLoginAt: string | null
          createdAt: string
          updatedAt: string
        } }>('/users', dataWithUpperRole)
        
        // Validar que la respuesta tenga la estructura esperada
        if (!response || !response.user) {
          throw new Error('Respuesta inválida del servidor: usuario no encontrado en la respuesta')
        }
        
        // Guardar en IndexedDB
        const user = User.fromPersistence({
          id: response.user.id,
          name: response.user.name,
          email: Email.create(response.user.email),
          role: response.user.role.toLowerCase() as any,
          isActive: response.user.isActive,
          lastLoginAt: response.user.lastLoginAt ? new Date(response.user.lastLoginAt) : undefined,
          createdAt: new Date(response.user.createdAt),
          updatedAt: new Date(response.user.updatedAt),
          syncStatus: 'synced'
        })
        
        try {
          await userRepository.save(user)
        } catch (error) {
          // Si falla el guardado, intentar actualizar si ya existe
          const existing = await userRepository.findById(user.id)
          if (existing) {
            await userRepository.save(user)
          } else {
            throw new Error(`Error al guardar usuario en IndexedDB: ${error instanceof Error ? error.message : 'Error desconocido'}`)
          }
        }
        
        // Encolar para sincronización (aunque ya esté sincronizado, mantener consistencia)
        try {
          await syncService.queueOperation('create', 'users', user.id, user.toPersistence())
        } catch (error) {
          // No fallar si la cola de sincronización tiene problemas
          console.warn('Error al encolar operación de sincronización:', error)
        }
        
        return user
      } catch (error) {
        // Si el error es que el usuario ya existe, sincronizar todos los usuarios del servidor
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes('ya existe') || errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
          // Sincronizar todos los usuarios del servidor para asegurar que IndexedDB esté actualizado
          try {
            const usersResponse = await apiClient.get<{ users: Array<{
              id: string
              name: string
              email: string
              role: 'ADMIN' | 'MANAGER' | 'SELLER'
              isActive: boolean
              lastLoginAt: string | null
              createdAt: string
              updatedAt: string
            }> }>('/users')
            
            // Sincronizar todos los usuarios del servidor a IndexedDB
            for (const serverUser of usersResponse.users) {
              try {
                const user = User.fromPersistence({
                  id: serverUser.id,
                  name: serverUser.name,
                  email: Email.create(serverUser.email),
                  role: serverUser.role.toLowerCase() as any,
                  isActive: serverUser.isActive,
                  lastLoginAt: serverUser.lastLoginAt ? new Date(serverUser.lastLoginAt) : undefined,
                  createdAt: new Date(serverUser.createdAt),
                  updatedAt: new Date(serverUser.updatedAt),
                  syncStatus: 'synced'
                })
                
                await userRepository.save(user)
              } catch (saveError) {
                // Continuar con el siguiente usuario si hay un error al guardar uno
                console.warn(`Error al guardar usuario ${serverUser.email}:`, saveError)
              }
            }
            
            // Buscar el usuario que se intentó crear para retornarlo
            const foundUser = usersResponse.users.find(u => u.email.toLowerCase() === data.email.toLowerCase())
            if (foundUser) {
              const user = User.fromPersistence({
                id: foundUser.id,
                name: foundUser.name,
                email: Email.create(foundUser.email),
                role: foundUser.role.toLowerCase() as any,
                isActive: foundUser.isActive,
                lastLoginAt: foundUser.lastLoginAt ? new Date(foundUser.lastLoginAt) : undefined,
                createdAt: new Date(foundUser.createdAt),
                updatedAt: new Date(foundUser.updatedAt),
                syncStatus: 'synced'
              })
              
              return user
            }
          } catch (syncError) {
            // Si falla la sincronización, lanzar el error original
            throw error
          }
        }
        // Si no es un error de duplicado o si no se pudo sincronizar, lanzar el error original
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; email: string; password: string; role: 'ADMIN' | 'MANAGER' | 'SELLER' | 'admin' | 'manager' | 'seller'; isActive: boolean }> }) => {
      // Convertir rol a mayúsculas si viene en minúsculas
      const dataWithUpperRole = data.role 
        ? { ...data, role: typeof data.role === 'string' ? data.role.toUpperCase() as 'ADMIN' | 'MANAGER' | 'SELLER' : data.role }
        : data
      
      // Actualizar en el servidor
      const response = await apiClient.put(`/users/${id}`, dataWithUpperRole)
      
      // Actualizar en IndexedDB
      const user = User.fromPersistence({
        id: response.user.id,
        name: response.user.name,
        email: Email.create(response.user.email),
        role: response.user.role.toLowerCase() as any,
        isActive: response.user.isActive,
        lastLoginAt: response.user.lastLoginAt ? new Date(response.user.lastLoginAt) : undefined,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
        syncStatus: 'synced'
      })
      
      await userRepository.save(user)
      
      // Encolar para sincronización
      await syncService.queueOperation('update', 'users', user.id, user.toPersistence())
      
      return user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Desactivar en el servidor (soft delete)
      const response = await apiClient.delete(`/users/${id}`)
      
      // Actualizar en IndexedDB
      const user = User.fromPersistence({
        id: response.user.id,
        name: response.user.name,
        email: Email.create(response.user.email),
        role: response.user.role.toLowerCase() as any,
        isActive: response.user.isActive,
        lastLoginAt: response.user.lastLoginAt ? new Date(response.user.lastLoginAt) : undefined,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
        syncStatus: 'synced'
      })
      
      await userRepository.save(user)
      
      // Encolar para sincronización
      await syncService.queueOperation('update', 'users', user.id, user.toPersistence())
      
      return user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    }
  })

  return {
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isRemoving: remove.isPending,
    createError: create.error ? getErrorMessage(create.error) : null,
    updateError: update.error ? getErrorMessage(update.error) : null,
    removeError: remove.error ? getErrorMessage(remove.error) : null
  }
}

