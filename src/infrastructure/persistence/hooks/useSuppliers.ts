import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { SupplierMapper } from '../indexeddb/mappers/SupplierMapper'
import { SupplierRepository } from '../indexeddb/repositories/SupplierRepository'
import { Supplier } from '@domain/entities/Supplier'
import { Email } from '@domain/value-objects/Email'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@infrastructure/api/client'
import { syncService } from '@infrastructure/sync'
import { getErrorMessage } from '@shared/errors'

const supplierRepository = new SupplierRepository()

/**
 * Hook para obtener todos los proveedores (reactivo)
 */
export function useSuppliers() {
  const records = useLiveQuery(() => db.suppliers.toArray())

  return {
    suppliers: records ? SupplierMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener proveedores activos (reactivo)
 */
export function useActiveSuppliers() {
  const records = useLiveQuery(() => 
    db.suppliers.filter(s => s.isActive).toArray()
  )

  return {
    suppliers: records ? SupplierMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener un proveedor por ID
 */
export function useSupplier(id: string | undefined) {
  const record = useLiveQuery(
    () => (id ? db.suppliers.get(id) : undefined),
    [id]
  )

  return {
    supplier: record ? SupplierMapper.toDomain(record) : null,
    isLoading: record === undefined && id !== undefined
  }
}

/**
 * Funciones de mutación para proveedores
 */
export function useSupplierMutations() {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: async (data: {
      name: string
      contactName?: string
      phone?: string
      email?: string
      address?: string
      notes?: string
      isActive?: boolean
    }) => {
      // Crear en el servidor
      const response = await apiClient.post('/suppliers', data) as {
        supplier: {
          id: string
          name: string
          contactName?: string | null
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
      const supplier = Supplier.fromPersistence({
        id: response.supplier.id,
        name: response.supplier.name,
        contactName: response.supplier.contactName || undefined,
        phone: response.supplier.phone || undefined,
        email: response.supplier.email ? Email.create(response.supplier.email) : null,
        address: response.supplier.address || undefined,
        notes: response.supplier.notes || '',
        isActive: response.supplier.isActive,
        createdAt: new Date(response.supplier.createdAt),
        updatedAt: new Date(response.supplier.updatedAt),
        syncStatus: 'synced'
      })
      
      await supplierRepository.save(supplier)
      
      // Encolar para sincronización
      await syncService.queueOperation('create', 'suppliers', supplier.id, supplier.toPersistence())
      
      return supplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    }
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: {
      id: string
      data: Partial<{
        name: string
        contactName: string
        phone: string
        email: string
        address: string
        notes: string
        isActive: boolean
      }>
    }) => {
      // Actualizar en el servidor
      const response = await apiClient.put(`/suppliers/${id}`, data) as {
        supplier: {
          id: string
          name: string
          contactName?: string | null
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
      const supplier = Supplier.fromPersistence({
        id: response.supplier.id,
        name: response.supplier.name,
        contactName: response.supplier.contactName || undefined,
        phone: response.supplier.phone || undefined,
        email: response.supplier.email ? Email.create(response.supplier.email) : null,
        address: response.supplier.address || undefined,
        notes: response.supplier.notes || '',
        isActive: response.supplier.isActive,
        createdAt: new Date(response.supplier.createdAt),
        updatedAt: new Date(response.supplier.updatedAt),
        syncStatus: 'synced'
      })
      
      await supplierRepository.save(supplier)
      
      // Encolar para sincronización
      await syncService.queueOperation('update', 'suppliers', supplier.id, supplier.toPersistence())
      
      return supplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Desactivar en el servidor (soft delete)
      const response = await apiClient.delete(`/suppliers/${id}`) as {
        supplier: {
          id: string
          name: string
          contactName?: string | null
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
      const supplier = Supplier.fromPersistence({
        id: response.supplier.id,
        name: response.supplier.name,
        contactName: response.supplier.contactName || undefined,
        phone: response.supplier.phone || undefined,
        email: response.supplier.email ? Email.create(response.supplier.email) : null,
        address: response.supplier.address || undefined,
        notes: response.supplier.notes || '',
        isActive: response.supplier.isActive,
        createdAt: new Date(response.supplier.createdAt),
        updatedAt: new Date(response.supplier.updatedAt),
        syncStatus: 'synced'
      })
      
      await supplierRepository.save(supplier)
      
      // Encolar para sincronización
      await syncService.queueOperation('update', 'suppliers', supplier.id, supplier.toPersistence())
      
      return supplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    }
  })

  const removePermanently = useMutation({
    mutationFn: async (id: string) => {
      // Eliminar permanentemente en el servidor (hard delete)
      await apiClient.delete(`/suppliers/${id}/permanent`)
      
      // Eliminar de IndexedDB
      await supplierRepository.delete(id)
      
      // Encolar para sincronización
      await syncService.queueOperation('delete', 'suppliers', id, null)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
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

