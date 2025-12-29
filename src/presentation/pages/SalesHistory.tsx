import { useState, useMemo } from 'react'
import {
  Search,
  Calendar,
  FileText,
  Eye,
  Download,
  Printer,
  Filter,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package
} from 'lucide-react'
import {
  Button,
  Card,
  StatCard,
  SearchInput,
  Select,
  Badge,
  StatusBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Pagination,
  PaginationInfo,
  Modal,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useToastActions,
  SkeletonSaleRow
} from '@presentation/components/ui'
import { useRecentSales, useTodaySales, useDailySalesSummary } from '@infrastructure/persistence/hooks/useSales'
import { useActivePaymentMethods } from '@infrastructure/persistence/hooks/usePaymentMethods'
import { db } from '@infrastructure/persistence/indexeddb/database'
import { SaleMapper } from '@infrastructure/persistence/indexeddb/mappers/SaleMapper'
import type { Sale } from '@domain/entities/Sale'
import { formatCurrency, formatDateTime, formatDate, cn } from '@shared/lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { PDFService } from '@infrastructure/services/PDFService'

// Componente de detalle de venta
interface SaleDetailModalProps {
  sale: Sale
  onClose: () => void
}

function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const { paymentMethods } = useActivePaymentMethods()
  const paymentMethod = paymentMethods.find(pm => pm.id === sale.paymentMethodId)
  
  // Obtener pagos divididos de la venta
  const splitPayments = useLiveQuery(
    () => db.salePayments.where('saleId').equals(sale.id).toArray(),
    [sale.id]
  ) || []

  const handleDownloadReceipt = () => {
    PDFService.generateSaleReceipt(sale, { title: 'Recibo de Venta' })
  }

  const handlePrintReceipt = () => {
    PDFService.printSaleReceipt(sale, { title: 'Recibo de Venta' })
  }

  const handleDownloadInvoice = () => {
    PDFService.generateSaleInvoice(sale, { title: 'Factura' })
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Venta ${sale.receiptNumber}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Info general */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-50 rounded-lg">
          <div>
            <p className="text-xs text-surface-500">Fecha</p>
            <p className="font-medium">{formatDateTime(sale.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Estado</p>
            <StatusBadge status={sale.status} />
          </div>
          <div>
            <p className="text-xs text-surface-500">Método de pago</p>
            {splitPayments.length > 0 ? (
              <p className="font-medium text-xs">Pago dividido ({splitPayments.length} métodos)</p>
            ) : (
              <p className="font-medium">{paymentMethod?.name ?? '-'}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-surface-500">Total</p>
            <p className="font-medium text-lg text-primary-600">{formatCurrency(sale.total.amount)}</p>
          </div>
        </div>

        {/* Items */}
        <div>
          <h4 className="font-medium mb-3">Productos ({sale.items.length})</h4>
          <div className="border border-surface-200 rounded-lg divide-y divide-surface-200">
            {sale.items.map(item => (
              <div key={item.id} className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-surface-500">
                    {item.variantName} · {item.quantity} × {formatCurrency(item.unitPrice.amount)}
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className="font-medium">{formatCurrency(item.subtotal.amount)}</p>
                  {item.discount.value > 0 && (
                    <Badge variant="success" size="sm">-{item.discount.value}%</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totales */}
        <div className="space-y-2 p-4 bg-surface-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600">Subtotal</span>
            <span>{formatCurrency(sale.subtotal.amount)}</span>
          </div>
          {sale.totalDiscount.amount > 0 && (
            <div className="flex justify-between text-sm text-success-600">
              <span>Descuentos</span>
              <span>-{formatCurrency(sale.totalDiscount.amount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-surface-200">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">{formatCurrency(sale.total.amount)}</span>
          </div>
        </div>

        {/* Pagos divididos */}
        {splitPayments.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Pagos divididos</h4>
            <div className="border border-surface-200 rounded-lg divide-y divide-surface-200">
              {splitPayments.map((payment) => {
                const method = paymentMethods.find(pm => pm.id === payment.paymentMethodId)
                return (
                  <div key={payment.id} className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{method?.name ?? 'Método desconocido'}</p>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Notas */}
        {sale.notes && (
          <div>
            <h4 className="font-medium mb-2">Notas</h4>
            <p className="text-sm text-surface-600 p-3 bg-surface-50 rounded-lg">{sale.notes}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-surface-200">
          <Button
            variant="secondary"
            onClick={handlePrintReceipt}
            className="flex-1"
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Imprimir Recibo
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownloadReceipt}
            className="flex-1"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Descargar PDF
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownloadInvoice}
            className="flex-1"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Descargar Factura (A4)
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Filtro de fechas
type DateFilter = 'today' | 'week' | 'month' | 'custom' | 'all'

export function SalesHistory() {
  const { sales: recentSales, isLoading } = useRecentSales(100)
  const { completedSales: todaySales, totalAmount: todayAmount } = useTodaySales()
  const { summary } = useDailySalesSummary()
  const { paymentMethods } = useActivePaymentMethods()
  const toast = useToastActions()

  // Estados
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const pageSize = 10

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

  // Filtrar ventas
  const filteredSales = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(todayStart)
    monthStart.setMonth(monthStart.getMonth() - 1)

    return recentSales.filter(sale => {
      // Filtro por fecha
      if (dateFilter === 'today' && sale.createdAt < todayStart) return false
      if (dateFilter === 'week' && sale.createdAt < weekStart) return false
      if (dateFilter === 'month' && sale.createdAt < monthStart) return false
      
      // Filtro personalizado por rango de fechas
      if (dateFilter === 'custom') {
        if (!customStartDate || !customEndDate) return false
        
        // Normalizar la fecha de la venta a objeto Date si es necesario
        const saleDate = sale.createdAt instanceof Date 
          ? new Date(sale.createdAt) 
          : new Date(sale.createdAt)
        
        // Crear fechas de inicio y fin del rango en hora local
        // customStartDate y customEndDate vienen en formato YYYY-MM-DD
        const [startYear, startMonth, startDay] = customStartDate.split('-').map(Number)
        const [endYear, endMonth, endDay] = customEndDate.split('-').map(Number)
        
        const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
        const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)
        
        // Comparar fechas (incluyendo el día completo de la fecha de fin)
        const saleTime = saleDate.getTime()
        if (saleTime < startDate.getTime() || saleTime > endDate.getTime()) {
          return false
        }
      }

      // Filtro por búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesReceipt = sale.receiptNumber.toLowerCase().includes(query)
        const matchesProduct = sale.items.some(item =>
          item.productName.toLowerCase().includes(query)
        )
        if (!matchesReceipt && !matchesProduct) return false
      }

      // Filtro por estado
      if (statusFilter && sale.status !== statusFilter) return false

      // Filtro por método de pago
      if (paymentFilter && sale.paymentMethodId !== paymentFilter) return false

      return true
    })
  }, [recentSales, searchQuery, dateFilter, customStartDate, customEndDate, statusFilter, paymentFilter])

  // Calcular estadísticas de las ventas filtradas
  const stats = useMemo(() => {
    const completed = filteredSales.filter(s => s.status === 'completed')
    const totalAmount = completed.reduce((sum, s) => sum + s.total.amount, 0)
    const totalItems = completed.reduce((sum, s) => 
      sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0
    )
    const avgAmount = completed.length > 0 ? totalAmount / completed.length : 0

    return {
      count: completed.length,
      totalAmount,
      totalItems,
      avgAmount
    }
  }, [filteredSales])

  // Paginar
  const totalPages = Math.ceil(filteredSales.length / pageSize)
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Obtener nombre de método de pago (memoizado)
  const getPaymentMethodName = useMemo(() => {
    const map = new Map(paymentMethods.map(pm => [pm.id, pm.name]))
    return (id: string) => map.get(id) ?? '-'
  }, [paymentMethods])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Historial de Ventas</h1>
          <p className="text-surface-500">Consulta y gestiona las ventas realizadas</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<Download className="h-4 w-4" />}
          onClick={() => toast.info('Exportación en desarrollo')}
          className="w-full sm:w-auto"
        >
          Exportar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ventas del período"
          value={stats.count}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <StatCard
          title="Total recaudado"
          value={formatCurrency(stats.totalAmount)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Ticket promedio"
          value={formatCurrency(stats.avgAmount)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Productos vendidos"
          value={stats.totalItems}
          icon={<Package className="h-5 w-5" />}
        />
      </div>

      {/* Filtros */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar por nº de comprobante o producto..."
              onSearch={setSearchQuery}
            />
          </div>

          {/* Filtro de fecha */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              {(['today', 'week', 'month', 'custom', 'all'] as DateFilter[]).map(filter => (
                <button
                  key={filter}
                  onClick={() => {
                    setDateFilter(filter)
                    setCurrentPage(1)
                    if (filter !== 'custom') {
                      setCustomStartDate('')
                      setCustomEndDate('')
                    }
                  }}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    dateFilter === filter
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  )}
                >
                  {filter === 'today' && 'Hoy'}
                  {filter === 'week' && '7 días'}
                  {filter === 'month' && '30 días'}
                  {filter === 'custom' && 'Personalizado'}
                  {filter === 'all' && 'Todo'}
                </button>
              ))}
            </div>
            
            {/* Selector de rango de fechas personalizado */}
            {dateFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-primary-50 rounded-lg border border-primary-200">
                <Calendar className="h-4 w-4 text-primary-600 shrink-0 mt-1 sm:mt-0" />
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
                    <label className="text-sm font-medium text-surface-700 whitespace-nowrap">
                      Desde:
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        setCustomStartDate(selectedDate)
                        
                        // Si la fecha de inicio es mayor que la de fin, ajustar la de fin
                        if (customEndDate && selectedDate > customEndDate) {
                          setCustomEndDate(selectedDate)
                        }
                        
                        setCurrentPage(1)
                      }}
                      min={minDate}
                      max={maxDate}
                      className="h-9 px-3 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-full sm:w-auto"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
                    <label className="text-sm font-medium text-surface-700 whitespace-nowrap">
                      Hasta:
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        const selectedDate = e.target.value
                        setCustomEndDate(selectedDate)
                        
                        // Si la fecha de fin es menor que la de inicio, ajustar la de inicio
                        if (customStartDate && selectedDate < customStartDate) {
                          setCustomStartDate(selectedDate)
                        }
                        
                        setCurrentPage(1)
                      }}
                      min={customStartDate || minDate}
                      max={maxDate}
                      className="h-9 px-3 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-full sm:w-auto"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCustomStartDate('')
                        setCustomEndDate('')
                      }}
                      className="h-9 text-xs w-full sm:w-auto"
                    >
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtros adicionales */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'completed', label: 'Completadas' },
                { value: 'pending', label: 'Pendientes' },
                { value: 'cancelled', label: 'Canceladas' }
              ]}
              className="w-full sm:w-40"
            />

            <Select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value)
                setCurrentPage(1)
              }}
              options={[
                { value: '', label: 'Todos los pagos' },
                ...paymentMethods.map(pm => ({ value: pm.id, label: pm.name }))
              ]}
              className="w-full sm:w-40"
            />
          </div>
        </div>
      </Card>

      {/* Tabla de ventas */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Método de pago</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonSaleRow key={i} />
              ))
            ) : paginatedSales.length === 0 ? (
              <TableEmpty
                colSpan={7}
                icon={<FileText className="h-12 w-12" />}
                title="Sin ventas"
                description={searchQuery 
                  ? `No se encontraron ventas para "${searchQuery}"`
                  : 'No hay ventas en el período seleccionado'
                }
              />
            ) : (
              paginatedSales.map(sale => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <span className="font-mono text-sm font-medium">{sale.receiptNumber}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{formatDate(sale.createdAt)}</p>
                      <p className="text-xs text-surface-500">
                        {sale.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getPaymentMethodName(sale.paymentMethodId)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={sale.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold">{formatCurrency(sale.total.amount)}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSale(sale)}
                      className="h-8 w-8 p-0"
                      title="Ver detalle de la venta"
                      aria-label="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paginación */}
        {filteredSales.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-surface-200">
            <PaginationInfo
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredSales.length}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Modal de detalle */}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  )
}
