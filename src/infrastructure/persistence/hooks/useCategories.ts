import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../indexeddb/database'
import { CategoryMapper } from '../indexeddb/mappers/CategoryMapper'
import { CategoryRepository } from '../indexeddb/repositories/CategoryRepository'
import type { Category } from '@domain/entities/Category'

const categoryRepository = new CategoryRepository()

/**
 * Hook para obtener todas las categorías (reactivo)
 */
export function useCategories() {
  const records = useLiveQuery(() => db.categories.toArray())

  return {
    categories: records ? CategoryMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener categorías activas (reactivo)
 */
export function useActiveCategories() {
  const records = useLiveQuery(() => 
    db.categories.filter(c => c.isActive).toArray()
  )

  return {
    categories: records ? CategoryMapper.toDomainList(records) : [],
    isLoading: records === undefined
  }
}

/**
 * Hook para obtener una categoría por ID
 */
export function useCategory(id: string | undefined) {
  const record = useLiveQuery(
    () => (id ? db.categories.get(id) : undefined),
    [id]
  )

  return {
    category: record ? CategoryMapper.toDomain(record) : null,
    isLoading: record === undefined && id !== undefined
  }
}

/**
 * Funciones de mutación para categorías
 */
export function useCategoryMutations() {
  const create = async (category: Category): Promise<void> => {
    await categoryRepository.save(category)
  }

  const update = async (category: Category): Promise<void> => {
    await categoryRepository.save(category)
  }

  const remove = async (id: string): Promise<void> => {
    await categoryRepository.delete(id)
  }

  return { create, update, remove }
}

