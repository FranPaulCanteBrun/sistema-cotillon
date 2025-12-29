import { useState, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  Package,
  CreditCard,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  StatCard,
  Skeleton,
  SkeletonStatCard
} from '@presentation/components/ui'
import {
  useSalesByPeriod,
  useTopProducts,
  useSalesByCategory,
  useSalesByPaymentMethod,
  useSalesSummary
} from '@infrastructure/persistence/hooks/useReports'
import { formatCurrency, formatDate, formatNumber } from '@shared/lib/utils'

type DateFilterPreset = 'today' | 'week' | 'month' | 'custom'

export function Reports() {
  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('week')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [activeTab, setActiveTab] = useState('summary')

  // Calcular fechas según el filtro
  const dateRange = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    today.setHours(0, 0, 0, 0)

    let from: Date
    let to: Date

    if (dateFilter === 'today') {
      from = new Date(today)
      to = new Date(today)
      to.setHours(23, 59, 59, 999)
    } else if (dateFilter === 'week') {
      from = new Date(today)
      from.setDate(today.getDate() - today.getDay()) // Domingo
      to = new Date(from)
      to.setDate(from.getDate() + 6)
      to.setHours(23, 59, 59, 999)
    } else if (dateFilter === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1)
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      to.setHours(23, 59, 59, 999)
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      from = new Date(customStartDate)
      from.setHours(0, 0, 0, 0)
      to = new Date(customEndDate)
      to.setHours(23, 59, 59, 999)
    } else {
      // Default: última semana
      from = new Date(today)
      from.setDate(today.getDate() - today.getDay())
      to = new Date(from)
      to.setDate(from.getDate() + 6)
      to.setHours(23, 59, 59, 999)
    }

    return { from, to }
  }, [dateFilter, customStartDate, customEndDate])

  // Calcular fecha mínima (un año atrás)
  const minDate = useMemo(() => {
    const date = new Date()
    date.setFullYear(date.getFullYear() - 1)
    return date.toISOString().split('T')[0]
  }, [])

  // Calcular fecha máxima (hoy)
  const maxDate = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  // Validar rango de fechas personalizado
  const isDateRangeValid = useMemo(() => {
    if (dateFilter !== 'custom' || !customStartDate || !customEndDate) {
      return true
    }
    const start = new Date(customStartDate)
    const end = new Date(customEndDate)
    return start <= end
  }, [dateFilter, customStartDate, customEndDate])

  // Hooks de datos
  const salesData = useSalesByPeriod(dateRange)
  const { topProducts, isLoading: loadingTopProducts } = useTopProducts(dateRange, 20)
  const { salesByCategory, isLoading: loadingCategories } = useSalesByCategory(dateRange)
  const { salesByPaymentMethod, isLoading: loadingPaymentMethods } = useSalesByPaymentMethod(dateRange)
  const { daily, weekly, monthly, isLoading: loadingSummary } = useSalesSummary()

  const isLoading = salesData.isLoading || loadingTopProducts || loadingCategories || loadingPaymentMethods

  // Función para exportar reporte (placeholder)
  const handleExport = () => {
    // TODO: Implementar exportación a CSV/Excel
    // Por ahora, esta funcionalidad está pendiente de implementación
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Reportes</h1>
          <p className="text-surface-500">Análisis de ventas y productos</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExport}
          leftIcon={<Download className="h-4 w-4" />}
        >
          Exportar
        </Button>
      </div>

      {/* Filtros de fecha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-surface-700 mb-2">
                Período
              </label>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilterPreset)}
                options={[
                  { value: 'today', label: 'Hoy' },
                  { value: 'week', label: 'Esta semana' },
                  { value: 'month', label: 'Este mes' },
                  { value: 'custom', label: 'Personalizado' }
                ]}
              />
            </div>
            {dateFilter === 'custom' && (
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Desde
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      min={minDate}
                      max={maxDate}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">
                      Hasta
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      min={customStartDate || minDate}
                      max={maxDate}
                      error={!isDateRangeValid ? 'La fecha de fin debe ser posterior o igual a la fecha de inicio' : undefined}
                    />
                  </div>
                </div>
                {!isDateRangeValid && (
                  <p className="text-sm text-danger-600">
                    La fecha de inicio debe ser anterior o igual a la fecha de fin
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="text-sm text-surface-500">
            <Calendar className="h-4 w-4 inline mr-1" />
            {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
          </div>
        </div>
      </Card>

      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingSummary ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Hoy"
              value={formatCurrency(daily.totalAmount)}
              subtitle={`${daily.totalSales} ventas`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              title="Esta semana"
              value={formatCurrency(weekly.totalAmount)}
              subtitle={`${weekly.totalSales} ventas`}
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatCard
              title="Este mes"
              value={formatCurrency(monthly.totalAmount)}
              subtitle={`${monthly.totalSales} ventas`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              title="Período seleccionado"
              value={formatCurrency(salesData.totalAmount)}
              subtitle={`${salesData.totalSales} ventas`}
              icon={<Calendar className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      {/* Tabs de reportes */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="summary">
            <BarChart3 className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Productos más vendidos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Package className="h-4 w-4 mr-2" />
            Por categoría
          </TabsTrigger>
          <TabsTrigger value="payment">
            <CreditCard className="h-4 w-4 mr-2" />
            Por método de pago
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total de ventas</CardTitle>
              </CardHeader>
              <div className="p-6">
                <div className="text-3xl font-bold text-surface-900">
                  {isLoading ? <Skeleton className="h-8 w-24" /> : salesData.totalSales}
                </div>
                <p className="text-sm text-surface-500 mt-1">Ventas completadas</p>
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Total recaudado</CardTitle>
              </CardHeader>
              <div className="p-6">
                <div className="text-3xl font-bold text-surface-900">
                  {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(salesData.totalAmount)}
                </div>
                <p className="text-sm text-surface-500 mt-1">Ingresos totales</p>
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Promedio por venta</CardTitle>
              </CardHeader>
              <div className="p-6">
                <div className="text-3xl font-bold text-surface-900">
                  {isLoading ? <Skeleton className="h-8 w-32" /> : formatCurrency(salesData.averageSale)}
                </div>
                <p className="text-sm text-surface-500 mt-1">Ticket promedio</p>
              </div>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Total de items vendidos</CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="text-4xl font-bold text-surface-900">
                {isLoading ? <Skeleton className="h-10 w-32" /> : formatNumber(salesData.totalItems)}
              </div>
              <p className="text-sm text-surface-500 mt-2">Unidades vendidas en el período</p>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Productos más vendidos */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos más vendidos</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTopProducts ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : topProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-surface-500 py-8">
                        No hay datos para el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    topProducts.map((product, index) => (
                      <TableRow key={product.variantId}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.productName}</div>
                            {product.variantName && (
                              <div className="text-sm text-surface-500">{product.variantName}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(product.totalQuantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(product.saleCount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Por categoría */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por categoría</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCategories ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : salesByCategory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-surface-500 py-8">
                        No hay datos para el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesByCategory.map((category) => (
                      <TableRow key={category.categoryId}>
                        <TableCell className="font-medium">{category.categoryName}</TableCell>
                        <TableCell className="text-right">
                          {formatNumber(category.totalSales)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(category.itemCount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(category.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab: Por método de pago */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por método de pago</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Método de pago</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">% del total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPaymentMethods ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : salesByPaymentMethod.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-surface-500 py-8">
                        No hay datos para el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesByPaymentMethod.map((method) => {
                      const percentage = salesData.totalAmount > 0
                        ? (method.totalAmount / salesData.totalAmount) * 100
                        : 0
                      
                      // Traducir método de pago
                      const methodName = method.paymentMethodType === 'cash' ? 'Efectivo' :
                        method.paymentMethodType === 'credit' ? 'Crédito' :
                        method.paymentMethodType === 'debit' ? 'Débito' :
                        method.paymentMethodType === 'transfer' ? 'Transferencia' :
                        method.paymentMethodType === 'mercadopago' ? 'Mercado Pago' :
                        method.paymentMethodType

                      return (
                        <TableRow key={method.paymentMethodId}>
                          <TableCell className="font-medium">{methodName}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(method.totalSales)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(method.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {percentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

