/**
 * Capa de Dominio - Entidades
 * 
 * Este módulo exporta todas las entidades del dominio.
 * Las entidades son objetos con identidad que representan
 * conceptos del negocio con su comportamiento asociado.
 */

export { Entity } from './Entity'
export { Category, type CategoryProps } from './Category'
export { Product, type ProductProps } from './Product'
export { ProductVariant, type ProductVariantProps } from './ProductVariant'
export { Sale, SaleItem, type SaleProps, type SaleItemProps } from './Sale'
export { StockMovement, type StockMovementProps } from './StockMovement'
export { PaymentMethod, type PaymentMethodProps, type PaymentMethodConfig } from './PaymentMethod'
export { User, type UserProps } from './User'
export { Customer, type CustomerProps } from './Customer'
export { Supplier, type SupplierProps } from './Supplier'
