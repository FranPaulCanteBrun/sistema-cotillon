import { useState, useMemo, useRef } from 'react'
import { Package, Plus, Minus, Save, Trash2, Search, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  SearchInput,
  Select,
  NumberInput,
  Input,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  Badge,
  Alert,
  useToastActions
} from '@presentation/components/ui'
import { useActiveCategories } from '@infrastructure/persistence/hooks/useCategories'
import { useProducts, useProductWithVariants, useProductMutations } from '@infrastructure/persistence/hooks/useProducts'
import { StockMovement } from '@domain/entities/StockMovement'
import { Quantity } from '@domain/value-objects/Quantity'
import { db } from '@infrastructure/persistence/indexeddb/database'
import { StockMovementMapper } from '@infrastructure/persistence/indexeddb/mappers/StockMovementMapper'
import { formatCurrency } from '@shared/lib/utils'

type MovementType = 'entry' | 'exit' | 'adjustment'

interface StockEntryItem {
  variantId: string
  productName: string
  variantName: string
  sku: string
  currentStock: number
  quantity: number
  type: MovementType
}

// Selector de producto/variante
function ProductSelector({ onSelect }: { onSelect: (item: Omit<StockEntryItem, 'quantity' | 'type'>) => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const { products } = useProducts()
  const { product, variants } = useProductWithVariants(selectedProductId ?? undefined)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 10)
    const query = searchQuery.toLowerCase().trim()
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query)
    ).slice(0, 10)
  }, [products, searchQuery])

  const handleSelectVariant = (variantId: string) => {
    if (!product) return
    const variant = variants.find(v => v.id === variantId)
    if (!variant) return

    const variantName = [variant.color, variant.size].filter(Boolean).join(' - ') || 'Estándar'

    onSelect({
      variantId: variant.id,
      productName: product.name,
      variantName,
      sku: variant.sku.value,
      currentStock: variant.currentStock.value
    })

    // Reset y volver a enfocar el buscador
    setSelectedProductId(null)
    setSearchQuery('')
    
    // Enfocar el campo de búsqueda después de un pequeño delay
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Si hay un producto seleccionado y cambiamos la búsqueda, deseleccionarlo
    if (selectedProductId) {
      setSelectedProductId(null)
    }
  }

  return (
    <div className="space-y-4">
      <SearchInput
        ref={searchInputRef}
        placeholder="Buscar producto por nombre o código..."
        onSearch={handleSearchChange}
        debounceMs={200}
      />

      {/* Lista de productos */}
      {searchQuery && !selectedProductId && (
        <div className="border border-surface-200 rounded-lg divide-y divide-surface-200 max-h-60 overflow-auto">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-surface-500">
              No se encontraron productos
            </div>
          ) : (
            filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                className="w-full px-4 py-3 text-left hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-surface-500">{p.code}</p>
                  </div>
                  <span className="text-sm text-surface-400">{formatCurrency(p.basePrice.amount)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Lista de variantes del producto seleccionado */}
      {selectedProductId && product && (
        <div className="border border-primary-200 bg-primary-50/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-surface-500">{product.code}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProductId(null)}
            >
              Cambiar
            </Button>
          </div>

          <p className="text-sm font-medium mb-2">Selecciona una variante:</p>
          <div className="space-y-2">
            {variants.map(variant => {
              const variantName = [variant.color, variant.size].filter(Boolean).join(' - ') || 'Estándar'
              return (
                <button
                  key={variant.id}
                  onClick={() => handleSelectVariant(variant.id)}
                  className="w-full flex items-center justify-between p-3 bg-white border border-surface-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{variant.sku.value}</span>
                    <span className="text-surface-600">{variantName}</span>
                  </div>
                  <Badge variant={variant.currentStock.value > 0 ? 'success' : 'warning'}>
                    {variant.currentStock.value} en stock
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function StockEntry() {
  const { updateStock } = useProductMutations()
  const toast = useToastActions()
  
  const [items, setItems] = useState<StockEntryItem[]>([])
  const [globalType, setGlobalType] = useState<MovementType>('entry')
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Agregar item
  const handleAddItem = (item: Omit<StockEntryItem, 'quantity' | 'type'>) => {
    // Verificar si ya existe
    if (items.some(i => i.variantId === item.variantId)) {
      toast.warning('Ya agregado', 'Esta variante ya está en la lista')
      return
    }

    setItems([...items, { ...item, quantity: 1, type: globalType }])
  }

  // Actualizar tipo global y sincronizar con items existentes que aún no han sido procesados
  const handleGlobalTypeChange = (newType: MovementType) => {
    setGlobalType(newType)
    // Actualizar el tipo de todos los items existentes al nuevo tipo global
    setItems(items.map(item => ({ ...item, type: newType })))
  }

  // Actualizar cantidad
  const handleUpdateQuantity = (variantId: string, quantity: number) => {
    setItems(items.map(item =>
      item.variantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item
    ))
  }

  // Actualizar tipo de movimiento
  const handleUpdateType = (variantId: string, type: MovementType) => {
    setItems(items.map(item =>
      item.variantId === variantId ? { ...item, type } : item
    ))
  }

  // Eliminar item
  const handleRemoveItem = (variantId: string) => {
    setItems(items.filter(item => item.variantId !== variantId))
  }

  // Limpiar todo
  const handleClear = () => {
    setItems([])
    setReason('')
  }

  // Procesar movimientos
  const handleProcess = async () => {
    if (items.length === 0) {
      toast.warning('Sin items', 'Agrega al menos un producto')
      return
    }

    if (!reason.trim()) {
      toast.warning('Razón requerida', 'Indica el motivo del movimiento')
      return
    }

    setIsProcessing(true)
    try {
      // Obtener usuario actual (por ahora usamos el admin)
      const users = await db.users.toArray()
      const userId = users[0]?.id ?? 'system'

      for (const item of items) {
        // Calcular nuevo stock
        let newStock: number

        if (item.type === 'entry') {
          newStock = item.currentStock + item.quantity
        } else if (item.type === 'exit') {
          newStock = Math.max(0, item.currentStock - item.quantity)
        } else {
          // Adjustment: la cantidad es el nuevo stock absoluto
          newStock = item.quantity
        }

        // Crear movimiento de stock según el tipo
        let movement: StockMovement
        const previousStockQty = Quantity.create(item.currentStock)
        const quantityQty = Quantity.create(item.type === 'adjustment' ? Math.abs(newStock - item.currentStock) : item.quantity)
        const newStockQty = Quantity.create(newStock)

        if (item.type === 'entry') {
          // Entrada de mercadería -> purchase
          movement = StockMovement.createPurchase({
            id: crypto.randomUUID(),
            variantId: item.variantId,
            userId,
            quantity: quantityQty,
            previousStock: previousStockQty,
            reason: reason.trim()
          })
        } else if (item.type === 'adjustment') {
          // Ajuste manual
          movement = StockMovement.createAdjustment({
            id: crypto.randomUUID(),
            variantId: item.variantId,
            userId,
            quantity: quantityQty,
            previousStock: previousStockQty,
            newStock: newStockQty,
            reason: reason.trim()
          })
        } else {
          // Salida -> damage (pérdida/salida genérica)
          movement = StockMovement.createDamage({
            id: crypto.randomUUID(),
            variantId: item.variantId,
            userId,
            quantity: quantityQty,
            previousStock: previousStockQty,
            reason: reason.trim()
          })
        }

        // Guardar movimiento y actualizar stock
        const record = StockMovementMapper.toPersistence(movement)
        await db.stockMovements.add(record)
        await updateStock(item.variantId, newStock)
      }

      toast.success('Stock actualizado', `Se procesaron ${items.length} movimientos`)
      handleClear()
    } catch (error) {
      const { getErrorMessage } = await import('@shared/errors')
      toast.error('Error', getErrorMessage(error))
    } finally {
      setIsProcessing(false)
    }
  }

  const getTypeIcon = (type: MovementType) => {
    switch (type) {
      case 'entry': return <ArrowUpCircle className="h-4 w-4 text-success-600" />
      case 'exit': return <ArrowDownCircle className="h-4 w-4 text-danger-500" />
      case 'adjustment': return <RefreshCw className="h-4 w-4 text-primary-600" />
    }
  }

  const getTypeLabel = (type: MovementType) => {
    switch (type) {
      case 'entry': return 'Entrada'
      case 'exit': return 'Salida'
      case 'adjustment': return 'Ajuste'
    }
  }

  const getNewStock = (item: StockEntryItem) => {
    if (item.type === 'entry') return item.currentStock + item.quantity
    if (item.type === 'exit') return Math.max(0, item.currentStock - item.quantity)
    return item.quantity
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Carga de Mercadería</h1>
        <p className="text-surface-500">Registra entradas, salidas y ajustes de stock</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo: Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Agregar producto
              </CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <Select
                label="Tipo de movimiento"
                value={globalType}
                onChange={(e) => handleGlobalTypeChange(e.target.value as MovementType)}
                options={[
                  { value: 'entry', label: '📥 Entrada de mercadería' },
                  { value: 'exit', label: '📤 Salida de mercadería' },
                  { value: 'adjustment', label: '🔄 Ajuste de inventario' }
                ]}
              />

              <ProductSelector onSelect={handleAddItem} />

              {globalType === 'adjustment' && (
                <Alert variant="info" title="Ajuste de inventario">
                  En modo ajuste, la cantidad ingresada será el nuevo stock absoluto del producto.
                </Alert>
              )}
            </div>
          </Card>
        </div>

        {/* Panel derecho: Lista de items */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="none">
            <div className="p-4 border-b border-surface-200">
              <h3 className="font-medium">Productos a procesar ({items.length})</h3>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Stock actual</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-center">Nuevo stock</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableEmpty
                    colSpan={6}
                    icon={<Package className="h-10 w-10" />}
                    title="Sin productos"
                    description="Busca y selecciona productos para cargar"
                  />
                ) : (
                  items.map((item) => (
                    <TableRow key={item.variantId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-surface-500">
                            {item.sku} · {item.variantName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.type}
                          onChange={(e) => handleUpdateType(item.variantId, e.target.value as MovementType)}
                          options={[
                            { value: 'entry', label: 'Entrada' },
                            { value: 'exit', label: 'Salida' },
                            { value: 'adjustment', label: 'Ajuste' }
                          ]}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{item.currentStock}</Badge>
                      </TableCell>
                      <TableCell>
                        <NumberInput
                          value={item.quantity}
                          onChange={(value) => handleUpdateQuantity(item.variantId, value)}
                          min={item.type === 'adjustment' ? 0 : 1}
                          className="w-28 mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getNewStock(item) > item.currentStock ? 'success' : getNewStock(item) < item.currentStock ? 'warning' : 'default'}
                        >
                          {getNewStock(item)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.variantId)}
                          className="h-8 w-8 p-0 text-danger-500"
                          title="Eliminar item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Razón y acciones */}
          {items.length > 0 && (
            <Card>
              <Textarea
                label="Motivo del movimiento"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Compra a proveedor, inventario físico, devolución de cliente..."
                required
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
                <Button variant="secondary" onClick={handleClear} className="w-full sm:w-auto">
                  Limpiar todo
                </Button>
                <Button
                  onClick={handleProcess}
                  isLoading={isProcessing}
                  leftIcon={<Save className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  Procesar {items.length} movimiento{items.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
