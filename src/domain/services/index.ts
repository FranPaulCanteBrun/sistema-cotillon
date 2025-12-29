/**
 * Capa de Dominio - Servicios de Dominio
 * 
 * Los servicios de dominio encapsulan lógica de negocio
 * que no pertenece naturalmente a ninguna entidad.
 */

export { StockService, type StockAvailability, type StockCheckItem } from './StockService'
export { PricingService, type PriceCalculationItem, type PriceCalculationResult, type CartSummary } from './PricingService'
export { ReceiptNumberGenerator } from './ReceiptNumberGenerator'
