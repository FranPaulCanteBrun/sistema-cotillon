import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { CustomerMapper } from '../indexeddb/mappers/CustomerMapper'
import { CustomerRepository } from '../indexeddb/repositories/CustomerRepository'
import { Customer } from '@domain/entities/Customer'
import { Email } from '@domain/value-objects/Email'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@infrastructure/api/client'
import { syncService } from '@infrastructure/sync'
import { getErrorMessage } from '@shared/errors'

const customerRepository = new CustomerRepository()

/**
 * Hook para obtener todos los clientes (reactivo)
 */
export function useCustomers() {
  const records = useLiveQuery(() => db.customers.toArray())

  return {
    customers: records ? CustomerMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener clientes activos (reactivo)
 */
export function useActiveCustomers() {
  const records = useLiveQuery(() => 
    db.customers.filter(c => c.isActive).toArray()
  )

  return {
    customers: records ? CustomerMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener un cliente por ID
 */
export function useCustomer(id: string | undefined) {
  const record = useLiveQuery(
    () => (id ? db.customers.get(id) : undefined),
    [id]
  )

  return {
    customer: record ? CustomerMapper.toDomain(record) : null,
    isLoading: record === undefined && id !== undefined
  }
}

/**
 * Funciones de mutación para clientes
 */
export function useCustomerMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: async (data: {
      name: string
      documentNumber?: string
      phone?: string
      email?: string
      address?: string
      notes?: string
      isActive?: boolean
    }) => {
      // Crear en el servidor
      const response = await apiClient.post('/customers', data) as {
        customer: {
          id: string
          name: string
          documentNumber?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
      }
      
      // Guardar en IndexedDB
      const customer = Customer.fromPersistence({
        id: response.customer.id,
        name: response.customer.name,
        documentNumber: response.customer.documentNumber || undefined,
        phone: response.customer.phone || undefined,
        email: response.customer.email ? Email.create(response.customer.email) : null,
        address: response.customer.address || undefined,
        notes: response.customer.notes || '',
        isActive: response.customer.isActive,
        createdAt: new Date(response.customer.createdAt),
        updatedAt: new Date(response.customer.updatedAt),
        syncStatus: 'synced'
      })
      
      await customerRepository.save(customer)
      
      // Encolar para sincronización
      await syncService.queueOperation('create', 'customers', customer.id, customer.toPersistence())
      
      return customer
    },
    onError: (error) => {
      // Si es un error de autenticación, no limpiar los campos
      if (error instanceof Error && error.message.includes('No autorizado')) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: {
      id: string
      data: Partial<{
        name: string
        documentNumber: string
        phone: string
        email: string
        address: string
        notes: string
        isActive: boolean
      }>
    }) => {
      // Actualizar en el servidor
      const response = await apiClient.put(`/customers/${id}`, data) as {
        customer: {
          id: string
          name: string
          documentNumber?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
      }
      
      // Actualizar en IndexedDB
      const customer = Customer.fromPersistence({
        id: response.customer.id,
        name: response.customer.name,
        documentNumber: response.customer.documentNumber || undefined,
        phone: response.customer.phone || undefined,
        email: response.customer.email ? Email.create(response.customer.email) : null,
        address: response.customer.address || undefined,
        notes: response.customer.notes || '',
        isActive: response.customer.isActive,
        createdAt: new Date(response.customer.createdAt),
        updatedAt: new Date(response.customer.updatedAt),
        syncStatus: 'synced'
      })
      
      await customerRepository.save(customer)
      
      // Encolar para sincronización
      await syncService.queueOperation('update', 'customers', customer.id, customer.toPersistence())
      
      return customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Desactivar en el servidor (soft delete)
      const response = await apiClient.delete(`/customers/${id}`) as {
        customer: {
          id: string
          name: string
          documentNumber?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          notes?: string | null
          isActive: boolean
          createdAt: string
          updatedAt: string
        }
      }
      
      // Actualizar en IndexedDB
      const customer = Customer.fromPersistence({
        id: response.customer.id,
        name: response.customer.name,
        documentNumber: response.customer.documentNumber || undefined,
        phone: response.customer.phone || undefined,
        email: response.customer.email ? Email.create(response.customer.email) : null,
        address: response.customer.address || undefined,
        notes: response.customer.notes || '',
        isActive: response.customer.isActive,
        createdAt: new Date(response.customer.createdAt),
        updatedAt: new Date(response.customer.updatedAt),
        syncStatus: 'synced'
      })
      
      await customerRepository.save(customer)
      
      // Encolar para sincronización
      await syncService.queueOperation('update', 'customers', customer.id, customer.toPersistence())
      
      return customer
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })

  const removePermanently = useMutation({
    mutationFn: async (id: string) => {
      // Eliminar permanentemente en el servidor (hard delete)
      await apiClient.delete(`/customers/${id}/permanent`)
      
      // Eliminar de IndexedDB
      await customerRepository.delete(id)
      
      // Encolar para sincronización
      await syncService.queueOperation('delete', 'customers', id, null)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    }
  })

  return {
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    removePermanently: removePermanently.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isRemoving: remove.isPending,
    isRemovingPermanently: removePermanently.isPending,
    createError: create.error ? getErrorMessage(create.error) : null,
    updateError: update.error ? getErrorMessage(update.error) : null,
    removeError: remove.error ? getErrorMessage(remove.error) : null,
    removePermanentlyError: removePermanently.error ? getErrorMessage(removePermanently.error) : null
  }
}

