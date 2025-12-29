/**
 * Capa de Infraestructura - Persistencia IndexedDB
 * 
 * Implementación de los repositorios usando IndexedDB
 * a través de Dexie.js para operaciones offline-first.
 */

// Database
export { db, CotillonDatabase, initializeDatabase } from './database'
export type * from './database'

// Mappers
export * from './mappers'

// Repositories
export * from './repositories'
