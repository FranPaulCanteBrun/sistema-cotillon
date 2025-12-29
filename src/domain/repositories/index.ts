/**
 * Capa de Dominio - Interfaces de Repositorios
 * 
 * Define las interfaces (contratos) que deben implementar
 * los repositorios de la capa de infraestructura.
 * Esto permite la inversión de dependencias (DIP).
 */

export type { IRepository, IPaginatedRepository } from './IRepository'
export type { ICategoryRepository } from './ICategoryRepository'
export type { IProductRepository, ProductFilters } from './IProductRepository'
export type { IProductVariantRepository } from './IProductVariantRepository'
export type { ISaleRepository, SaleFilters, SalesSummary } from './ISaleRepository'
export type { IStockMovementRepository, StockMovementFilters } from './IStockMovementRepository'
export type { IPaymentMethodRepository } from './IPaymentMethodRepository'
export type { IUserRepository } from './IUserRepository'
export type { ICustomerRepository, CustomerFilters } from './ICustomerRepository'
export type { ISupplierRepository } from './ISupplierRepository'
