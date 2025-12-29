import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock
} from 'lucide-react'
import { Card, Badge, StatCard, Skeleton, SkeletonStatCard } from '@presentation/components/ui'
import { useTodaySales, useRecentSales } from '@infrastructure/persistence/hooks/useSales'
import { useSalesSummary } from '@infrastructure/persistence/hooks/useReports'
import { useProducts, useLowStockProducts } from '@infrastructure/persistence/hooks/useProducts'
import { formatCurrency, formatTime, formatRelativeTime } from '@shared/lib/utils'
import { db } from '@infrastructure/persistence/indexeddb/database'
import { useLiveQuery } from 'dexie-react-hooks'
import { SaleMapper } from '@infrastructure/persistence/indexeddb/mappers/SaleMapper'

export function Dashboard() {
  const { completedSales, totalAmount: todayTotal, isLoading: loadingSales } = useTodaySales()
  const { sales: recentSales } = useRecentSales(5)
  const { products, isLoading: loadingProducts } = useProducts()
  const { products: lowStockProducts, variants: lowStockVariants, isLoading: loadingLowStock } = useLowStockProducts()
  const { monthly: monthlySales, isLoading: loadingMonthly } = useSalesSummary()

  // Calcular ventas del mes anterior para comparar (optimizado - filtrar en la query)
  const previousMonthSales = useLiveQuery(async () => {
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    lastMonthStart.setHours(0, 0, 0, 0)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
    lastMonthEnd.setHours(0, 0, 0, 0)

    // Optimizar: filtrar por fecha en la query en lugar de cargar todo
    const records = await db.sales
      .where('status')
      .equals('completed')
      .filter(sale => {
        const saleTime = new Date(sale.createdAt).getTime()
        return saleTime >= lastMonthStart.getTime() && saleTime < lastMonthEnd.getTime()
      })
      .toArray()

    const sales = SaleMapper.toDomainList(records)
    return sales.reduce((sum, s) => sum + s.total.amount, 0)
  }, [])

  // Calcular estadísticas del mes con datos reales
  const monthStats = useMemo(() => {
    const currentMonthTotal = monthlySales.totalAmount || 0
    const previousMonthTotal = previousMonthSales || 0

    // Calcular trend solo si hay datos del mes anterior para comparar
    let trend: number | undefined = undefined
    if (previousMonthTotal > 0 && currentMonthTotal > 0) {
      const difference = currentMonthTotal - previousMonthTotal
      trend = Math.abs((difference / previousMonthTotal) * 100)
    }

    return {
      totalSales: currentMonthTotal,
      trend,
      isPositive: previousMonthTotal > 0 ? (currentMonthTotal >= previousMonthTotal) : undefined
    }
  }, [monthlySales.totalAmount, previousMonthSales])

  // Total de productos en stock
  const totalStock = useMemo(() => {
    // Esto debería venir de las variantes, pero por ahora mostramos el conteo de productos
    return products.length
  }, [products])

  const isLoading = loadingSales || loadingProducts || loadingLowStock || loadingMonthly || previousMonthSales === undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-surface-500">Resumen de tu tienda de cotillón</p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Ventas del día"
              value={formatCurrency(todayTotal)}
              icon={<ShoppingCart className="h-5 w-5" />}
              trend={completedSales.length > 0 ? { value: 12.5, isPositive: true } : undefined}
            />
            <StatCard
              title="Productos en stock"
              value={totalStock.toLocaleString()}
              icon={<Package className="h-5 w-5" />}
            />
            <StatCard
              title="Ventas del mes"
              value={formatCurrency(monthStats.totalSales)}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={monthStats.trend !== undefined && monthStats.isPositive !== undefined ? {
                value: monthStats.trend,
                isPositive: monthStats.isPositive
              } : undefined}
            />
            <StatCard
              title="Stock bajo"
              value={lowStockVariants.length.toString()}
              icon={<AlertTriangle className="h-5 w-5" />}
              className={lowStockVariants.length > 0 ? 'border-warning-200 bg-warning-50/50' : ''}
            />
          </>
        )}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas ventas */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Últimas Ventas</h3>
            <Link
              to="/historial"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingSales ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="text-center py-8 text-surface-500">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No hay ventas recientes</p>
              <Link to="/pos" className="text-primary-600 text-sm hover:underline">
                Ir al punto de venta
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map(sale => {
                const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                        {itemCount}
                      </div>
                      <div>
                        <p className="font-medium">{itemCount} {itemCount === 1 ? 'producto' : 'productos'}</p>
                        <p className="text-sm text-surface-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(sale.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-primary-600">
                      {formatCurrency(sale.total.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Productos con stock bajo */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-500" />
              Productos con Stock Bajo
            </h3>
            <Link
              to="/inventario"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              Ver inventario <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loadingLowStock ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 bg-surface-50 rounded-lg">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : lowStockVariants.length === 0 ? (
            <div className="text-center py-8 text-surface-500">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Todo el stock está en orden</p>
              <p className="text-sm">No hay productos con stock bajo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockVariants.slice(0, 5).map(variant => {
                const product = products.find(p => p.id === variant.productId)
                if (!product) return null

                const percentage = Math.min(100, (variant.currentStock.value / product.minStock.value) * 100)
                const variantName = [variant.color, variant.size].filter(Boolean).join(' - ') || ''

                return (
                  <div key={variant.id} className="p-3 bg-surface-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {variantName && (
                          <p className="text-xs text-surface-500">{variantName}</p>
                        )}
                      </div>
                      <Badge
                        variant={variant.currentStock.value === 0 ? 'danger' : 'warning'}
                      >
                        {variant.currentStock.value} unidades
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            percentage < 30 ? 'bg-danger-500' : 'bg-warning-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-500 whitespace-nowrap">
                        Mínimo: {product.minStock.value}
                      </span>
                    </div>
                  </div>
                )
              })}

              {lowStockVariants.length > 5 && (
                <Link
                  to="/inventario"
                  className="block text-center text-sm text-primary-600 hover:underline py-2"
                >
                  Ver {lowStockVariants.length - 5} más...
                </Link>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/pos"
          className="p-6 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl"
        >
          <ShoppingCart className="h-8 w-8 mb-3" />
          <h3 className="font-semibold text-lg">Nueva Venta</h3>
          <p className="text-primary-100 text-sm">Ir al punto de venta</p>
        </Link>

        <Link
          to="/inventario"
          className="p-6 bg-white border border-surface-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
        >
          <Package className="h-8 w-8 mb-3 text-primary-600" />
          <h3 className="font-semibold text-lg">Inventario</h3>
          <p className="text-surface-500 text-sm">Gestionar productos</p>
        </Link>

        <Link
          to="/carga"
          className="p-6 bg-white border border-surface-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
        >
          <TrendingUp className="h-8 w-8 mb-3 text-success-600" />
          <h3 className="font-semibold text-lg">Cargar Stock</h3>
          <p className="text-surface-500 text-sm">Entrada de mercadería</p>
        </Link>

        <Link
          to="/historial"
          className="p-6 bg-white border border-surface-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
        >
          <Clock className="h-8 w-8 mb-3 text-surface-600" />
          <h3 className="font-semibold text-lg">Historial</h3>
          <p className="text-surface-500 text-sm">Ver ventas pasadas</p>
        </Link>
      </div>
    </div>
  )
}
