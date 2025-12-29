/**
 * Hooks de React para acceso a datos
 * Integran Dexie.js con React de forma reactiva
 */

export { useDatabase } from './useDatabase'
export { useCategories, useActiveCategories, useCategory, useCategoryMutations } from './useCategories'
export { 
  useProducts, 
  useActiveProducts, 
  useProductsByCategory, 
  useProductWithVariants,
  useLowStockProducts,
  useProductSearch,
  useProductMutations 
} from './useProducts'
export { useStockAlerts, useStockAlertMutations } from './useStockAlerts'
export { useUsers, useActiveUsers, useUser, useUserMutations, syncUsersFromServer } from './useUsers'
export { useCustomers, useActiveCustomers, useCustomer, useCustomerMutations } from './useCustomers'
export { useSuppliers, useActiveSuppliers, useSupplier, useSupplierMutations } from './useSuppliers'
export {
  useSalesByPeriod,
  useTopProducts,
  useSalesByCategory,
  useSalesByPaymentMethod,
  useSalesSummary,
  type SalesByPeriodParams,
  type SalesByPeriodResult,
  type TopProduct,
  type SalesByCategory,
  type SalesByPaymentMethod
} from './useReports'
export { 
  useTodaySales, 
  useRecentSales, 
  useSale, 
  useDailySalesSummary,
  useSaleMutations 
} from './useSales'
export { 
  usePaymentMethods, 
  useActivePaymentMethods, 
  usePaymentMethod, 
  usePaymentMethodMutations 
} from './usePaymentMethods'

