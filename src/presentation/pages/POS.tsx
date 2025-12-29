import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  X,
  Printer,
  CheckCircle,
  Download
  // ScanLine // Comentado: escáner de códigos de barras deshabilitado temporalmente
} from 'lucide-react'
import {
  Button,
  Card,
  SearchInput,
  NumberInput,
  Badge,
  Modal,
  Select,
  useToastActions,
  SkeletonProductGrid
} from '@presentation/components/ui'
import { useActiveCategories } from '@infrastructure/persistence/hooks/useCategories'
import { useProducts } from '@infrastructure/persistence/hooks/useProducts'
import { useActivePaymentMethods } from '@infrastructure/persistence/hooks/usePaymentMethods'
import { useSaleMutations } from '@infrastructure/persistence/hooks/useSales'
import { useAuth } from '@presentation/hooks/useAuth'
import { db } from '@infrastructure/persistence/indexeddb/database'
import { ProductVariantMapper } from '@infrastructure/persistence/indexeddb/mappers/ProductVariantMapper'
import { Sale, SaleItem } from '@domain/entities/Sale'
import { StockMovement } from '@domain/entities/StockMovement'
import { Money } from '@domain/value-objects/Money'
import { Quantity } from '@domain/value-objects/Quantity'
import { Percentage } from '@domain/value-objects/Percentage'
import { formatCurrency, cn } from '@shared/lib/utils'
import { getErrorMessage } from '@shared/errors'
import type { PaymentMethodType } from '@shared/types'
import { PDFService } from '@infrastructure/services/PDFService'
import { getImageUrl } from '@infrastructure/services/ImageService'
// import { BarcodeScanner } from '@presentation/components/barcode/BarcodeScanner' // Comentado: escáner deshabilitado temporalmente
import { ProductVariantRepository } from '@infrastructure/persistence/indexeddb/repositories/ProductVariantRepository'

// Item del carrito
interface CartItem {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  unitPrice: number
  quantity: number
  discount: number // porcentaje
  maxStock: number
}

// Producto con variantes cargadas para mostrar
interface ProductWithStock {
  id: string
  code: string
  name: string
  categoryId: string
  basePrice: number
  imageUrl?: string
  variants: Array<{
    id: string
    sku: string
    name: string
    price: number
    stock: number
  }>
}

export function POS() {
  const { products } = useProducts()
  const { categories } = useActiveCategories()
  const { paymentMethods } = useActivePaymentMethods()
  const { createSale, getNextReceiptNumber } = useSaleMutations()
  const { user } = useAuth()
  const toast = useToastActions()

  // Estado del carrito
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  // const [showBarcodeScanner, setShowBarcodeScanner] = useState(false) // Comentado: escáner deshabilitado temporalmente
  
  const variantRepository = new ProductVariantRepository()

  // Estado de checkout
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [splitPayments, setSplitPayments] = useState<Array<{ methodId: string; amount: number }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastReceiptNumber, setLastReceiptNumber] = useState('')
  const [lastSale, setLastSale] = useState<Sale | null>(null)

  // Productos con stock cargado
  const [productsWithStock, setProductsWithStock] = useState<ProductWithStock[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  
  // Usar useRef para rastrear los IDs de productos y evitar re-renders innecesarios
  const productsIdsRef = useRef<string>('')
  const isInitialLoadRef = useRef(true)
  
  // Memorizar los IDs de productos para comparación estable
  const productsIds = useMemo(() => {
    return products.map(p => p.id).sort().join(',')
  }, [products])

  // Cargar productos con sus variantes y stock
  useEffect(() => {
    // Solo ejecutar si los IDs de productos realmente cambiaron o es la carga inicial
    if (!isInitialLoadRef.current && productsIds === productsIdsRef.current) {
      return
    }
    
    isInitialLoadRef.current = false
    productsIdsRef.current = productsIds
    
    const loadProducts = async () => {
      setIsLoadingProducts(true)
      try {
        const variants = await db.productVariants.toArray()
        
        const productsData: ProductWithStock[] = products.map(product => {
          const productVariants = variants
            .filter(v => v.productId === product.id && v.isActive)
            .map(v => ({
              id: v.id,
              sku: v.sku,
              name: [v.color, v.size].filter(Boolean).join(' - ') || 'Estándar',
              price: v.priceCents ? v.priceCents / 100 : product.basePrice.amount,
              stock: v.currentStock
            }))

          return {
            id: product.id,
            code: product.code,
            name: product.name,
            categoryId: product.categoryId,
            basePrice: product.basePrice.amount,
            imageUrl: product.imageUrl,
            variants: productVariants
          }
        })

        setProductsWithStock(productsData)
      } finally {
        setIsLoadingProducts(false)
      }
    }

    loadProducts()
  }, [productsIds, products])

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return productsWithStock.filter(product => {
      const matchesSearch = !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || product.categoryId === selectedCategory
      const hasStock = product.variants.some(v => v.stock > 0)
      return matchesSearch && matchesCategory && hasStock
    })
  }, [productsWithStock, searchQuery, selectedCategory])

  // Calcular totales
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity)
    }, 0)
    
    const discountAmount = cart.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity
      return sum + (itemTotal * item.discount / 100)
    }, 0)

    const total = subtotal - discountAmount
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

    return { subtotal, discountAmount, total, itemCount }
  }, [cart])

  // Agregar al carrito (memoizado)
  const addToCart = useCallback((product: ProductWithStock, variant: ProductWithStock['variants'][0]) => {
    // Validar stock antes de agregar
    if (variant.stock === 0) {
      toast.warning('Sin stock', 'Este producto no tiene stock disponible')
      return
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.variantId === variant.id)

      if (existingIndex >= 0) {
        // Ya existe, incrementar cantidad
        const existing = prevCart[existingIndex]
        const newQuantity = existing.quantity + 1
        if (newQuantity <= variant.stock) {
          const newCart = [...prevCart]
          newCart[existingIndex] = { ...existing, quantity: newQuantity }
          return newCart
        } else {
          toast.warning('Stock insuficiente', `Solo hay ${variant.stock} unidades disponibles`)
          return prevCart
        }
      } else {
        // Nuevo item - validar que hay stock
        if (variant.stock === 0) {
          toast.warning('Sin stock', 'Este producto no tiene stock disponible')
          return prevCart
        }
        return [...prevCart, {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku,
          unitPrice: variant.price,
          quantity: 1,
          discount: 0,
          maxStock: variant.stock
        }]
      }
    })
  }, [toast])

  // Actualizar cantidad (memoizado)
  const updateQuantity = useCallback((variantId: string, quantity: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.variantId === variantId) {
        const newQuantity = Math.min(Math.max(1, quantity), item.maxStock)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }, [])

  // Actualizar descuento (memoizado)
  const updateDiscount = useCallback((variantId: string, discount: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.variantId === variantId) {
        return { ...item, discount: Math.min(Math.max(0, discount), 100) }
      }
      return item
    }))
  }, [])

  // Eliminar del carrito
  const removeFromCart = (variantId: string) => {
    setCart(cart.filter(item => item.variantId !== variantId))
  }

  // Limpiar carrito
  const clearCart = () => {
    setCart([])
  }

  // Procesar venta
  const processCheckout = async () => {
    // Validar pagos
    if (splitPayments.length === 0) {
      if (!selectedPaymentMethod) {
        toast.warning('Selecciona método de pago')
        return
      }
    } else {
      const totalSplit = splitPayments.reduce((sum, p) => sum + p.amount, 0)
      if (Math.abs(totalSplit - cartTotals.total) > 0.01) {
        toast.warning('El total de los pagos debe coincidir con el total a cobrar')
        return
      }
      if (splitPayments.some(p => !p.methodId)) {
        toast.warning('Todos los métodos de pago deben estar seleccionados')
        return
      }
    }

    // Determinar método de pago principal (para compatibilidad con el modelo actual)
    const primaryPayment = splitPayments.length > 0
      ? paymentMethods.find(pm => pm.id === splitPayments[0].methodId)
      : paymentMethods.find(pm => pm.id === selectedPaymentMethod)
    
    if (!primaryPayment) {
      toast.error('Método de pago no válido')
      return
    }

    setIsProcessing(true)
    try {
      // Obtener número de recibo
      const receiptNumber = await getNextReceiptNumber()
      
      // Obtener usuario actual autenticado
      const userId = user?.id ?? 'system'

      // Crear items de venta
      const saleItems = cart.map(item => new SaleItem({
        id: crypto.randomUUID(),
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: Money.create(item.unitPrice),
        discount: Percentage.create(item.discount)
      }))

      // Crear venta (usar método de pago principal)
      const sale = Sale.create({
        id: crypto.randomUUID(),
        receiptNumber,
        userId,
        items: saleItems,
        paymentMethodId: primaryPayment.id,
        paymentMethodType: primaryPayment.type
      })
      
      // Nota: Los pagos divididos se guardarían en una tabla separada en el futuro
      // Por ahora solo se guarda el método principal

      // Completar la venta
      sale.complete()

      // Crear movimientos de stock
      const stockMovements: StockMovement[] = []
      
      for (const item of cart) {
        const variantRecord = await db.productVariants.get(item.variantId)
        if (variantRecord) {
          const variant = ProductVariantMapper.toDomain(variantRecord)
          const previousStock = variant.currentStock.value
          const newStock = previousStock - item.quantity

          const movement = StockMovement.createSale({
            id: crypto.randomUUID(),
            variantId: item.variantId,
            userId,
            quantity: Quantity.create(item.quantity),
            previousStock: Quantity.create(previousStock),
            saleId: sale.id
          })

          stockMovements.push(movement)
        }
      }

      // Guardar venta y actualizar stock
      await createSale(sale, stockMovements, splitPayments.length > 0 ? splitPayments : undefined)

      // Éxito
      setLastReceiptNumber(receiptNumber)
      setLastSale(sale)
      setShowCheckout(false)
      setShowSuccess(true)
      clearCart()
    } catch (error) {
      toast.error('Error al procesar', getErrorMessage(error))
    } finally {
      setIsProcessing(false)
    }
  }

  // Cerrar modal de éxito
  const closeSuccess = () => {
    setShowSuccess(false)
    setSelectedPaymentMethod(null)
    setSplitPayments([])
    setLastSale(null)
  }

  // Descargar recibo PDF
  const handleDownloadReceipt = () => {
    if (lastSale) {
      PDFService.generateSaleReceipt(lastSale, { title: 'Recibo de Venta' })
    }
  }

  // Imprimir recibo directamente
  const handlePrintReceipt = () => {
    if (lastSale) {
      PDFService.printSaleReceipt(lastSale, { title: 'Recibo de Venta' })
    }
  }

  // Manejar escaneo de código de barras - COMENTADO: escáner deshabilitado temporalmente
  // const handleBarcodeScan = useCallback(async (barcode: string) => {
  //   try {
  //     // Buscar variante por código de barras
  //     const variant = await variantRepository.findByBarcode(barcode)
  //     
  //     if (!variant) {
  //       toast.warning('Producto no encontrado', `No se encontró un producto con el código: ${barcode}`)
  //       return
  //     }

  //     if (!variant.isActive) {
  //       toast.warning('Producto inactivo', 'Este producto está desactivado')
  //       return
  //     }

  //     // Buscar el producto correspondiente
  //     const product = productsWithStock.find(p => p.id === variant.productId)
  //     
  //     if (!product) {
  //       toast.error('Error', 'No se pudo encontrar el producto')
  //       return
  //     }

  //     // Buscar la variante en el producto
  //     const productVariant = product.variants.find(v => v.id === variant.id)
  //     
  //     if (!productVariant) {
  //       toast.error('Error', 'No se pudo encontrar la variante')
  //       return
  //     }

  //     if (productVariant.stock === 0) {
  //       toast.warning('Sin stock', 'Este producto no tiene stock disponible')
  //       return
  //     }

  //     // Agregar al carrito
  //     addToCart(product, productVariant)
  //     toast.success('Producto agregado', `${product.name} agregado al carrito`)
  //   } catch (error) {
  //     toast.error('Error al escanear', getErrorMessage(error))
  //   }
  // }, [productsWithStock, addToCart, toast, variantRepository])

  // Iconos de método de pago
  const getPaymentIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'cash': return <Banknote className="h-5 w-5" />
      case 'debit':
      case 'credit': return <CreditCard className="h-5 w-5" />
      case 'transfer':
      case 'qr': return <QrCode className="h-5 w-5" />
      default: return <CreditCard className="h-5 w-5" />
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Panel izquierdo: Productos */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Búsqueda y filtros */}
        <div className="mb-4 space-y-3">
          <div className="flex gap-2">
            <SearchInput
              placeholder="Buscar producto..."
              onSearch={setSearchQuery}
              className="flex-1"
            />
            {/* Botón de escáner deshabilitado temporalmente */}
            {/* <Button
              variant="secondary"
              onClick={() => setShowBarcodeScanner(true)}
              title="Escanear código de barras"
              className="shrink-0"
            >
              <ScanLine className="h-4 w-4" />
            </Button> */}
          </div>

          {/* Categorías */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                !selectedCategory
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              )}
            >
              Todos
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  selectedCategory === category.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-auto">
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <SkeletonProductGrid count={8} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-surface-500">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No se encontraron productos</p>
                <p className="text-sm">Intenta con otra búsqueda</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white border border-surface-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  {product.imageUrl && (
                    <div className="mb-3 flex justify-center">
                      <img
                        src={getImageUrl(product.imageUrl) || ''}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg border border-surface-200"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="mb-3">
                    <h3 className="font-medium text-surface-900 line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-surface-500">{product.code}</p>
                  </div>

                  {/* Variantes como botones */}
                  <div className="space-y-2">
                    {product.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => addToCart(product, variant)}
                        disabled={variant.stock === 0}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors',
                          variant.stock > 0
                            ? 'bg-surface-50 hover:bg-primary-50 hover:border-primary-200 border border-surface-200'
                            : 'bg-surface-100 text-surface-400 cursor-not-allowed'
                        )}
                      >
                        <div className="text-left">
                          <p className="font-medium">{formatCurrency(variant.price)}</p>
                          <p className="text-xs text-surface-500">{variant.name}</p>
                        </div>
                        {variant.stock > 0 ? (
                          <Badge variant="success" size="sm">{variant.stock}</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Sin stock</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho: Carrito */}
      <Card className="w-full lg:w-96 flex flex-col flex-shrink-0" padding="none">
        {/* Header del carrito */}
        <div className="p-4 border-b border-surface-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrito
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Limpiar
              </Button>
            )}
          </div>
          {cart.length > 0 && (
            <p className="text-sm text-surface-500 mt-1">
              {cartTotals.itemCount} {cartTotals.itemCount === 1 ? 'artículo' : 'artículos'}
            </p>
          )}
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-surface-400">
              <div className="text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Carrito vacío</p>
                <p className="text-sm">Agrega productos para empezar</p>
              </div>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.variantId}
                className="bg-surface-50 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-surface-500">{item.variantName}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className="p-1 text-surface-400 hover:text-danger-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="h-7 w-7 flex items-center justify-center rounded bg-white border border-surface-200 disabled:opacity-50"
                      title="Decrementar"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.maxStock}
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value) || 1
                        updateQuantity(item.variantId, newQuantity)
                      }}
                      className="w-12 h-7 text-center text-sm font-medium border border-surface-200 rounded bg-white focus:outline-none focus:ring-0 focus:border-primary-500"
                    />
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="h-7 w-7 flex items-center justify-center rounded bg-white border border-surface-200 disabled:opacity-50"
                      title="Incrementar"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <p className="font-semibold">
                    {formatCurrency(item.unitPrice * item.quantity * (1 - item.discount / 100))}
                  </p>
                </div>

                {/* Precio unitario y descuento */}
                <div className="flex items-center justify-between mt-2 text-xs text-surface-500">
                  <span>{formatCurrency(item.unitPrice)} c/u</span>
                  {item.discount > 0 && (
                    <Badge variant="success" size="sm">-{item.discount}%</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totales y checkout */}
        {cart.length > 0 && (
          <div className="border-t border-surface-200 p-4 space-y-3 bg-surface-50">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-surface-600">Subtotal</span>
                <span>{formatCurrency(cartTotals.subtotal)}</span>
              </div>
              {cartTotals.discountAmount > 0 && (
                <div className="flex justify-between text-success-600">
                  <span>Descuentos</span>
                  <span>-{formatCurrency(cartTotals.discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-surface-200">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary-600">
                {formatCurrency(cartTotals.total)}
              </span>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => setShowCheckout(true)}
              rightIcon={<ArrowRight className="h-5 w-5" />}
            >
              Cobrar
            </Button>
          </div>
        )}
      </Card>

      {/* Modal de Checkout */}
      <Modal
        isOpen={showCheckout}
        onClose={() => {
          setShowCheckout(false)
          setSplitPayments([])
        }}
        title="Finalizar venta"
        size="md"
      >
        <div className="space-y-6">
          {/* Resumen */}
          <div className="bg-surface-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-surface-600">Total a cobrar</span>
              <span className="text-3xl font-bold text-primary-600">
                {formatCurrency(cartTotals.total)}
              </span>
            </div>
          </div>

          {/* Métodos de pago */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Método de pago:</p>
              <button
                onClick={() => {
                  if (splitPayments.length === 0) {
                    // Activar modo dividido
                    setSplitPayments([{ methodId: selectedPaymentMethod || paymentMethods[0]?.id || '', amount: cartTotals.total }])
                    setSelectedPaymentMethod(null)
                  } else {
                    // Desactivar modo dividido
                    setSplitPayments([])
                    setSelectedPaymentMethod(splitPayments[0]?.methodId || null)
                  }
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {splitPayments.length === 0 ? 'Dividir pago' : 'Pago único'}
              </button>
            </div>

            {splitPayments.length === 0 ? (
              // Modo pago único
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-lg border-2 transition-colors',
                      selectedPaymentMethod === method.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-surface-200 hover:border-surface-300'
                    )}
                  >
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      selectedPaymentMethod === method.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-100 text-surface-600'
                    )}>
                      {getPaymentIcon(method.type)}
                    </div>
                    <span className="font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              // Modo pago dividido
              <div className="space-y-3">
                {splitPayments.map((payment, index) => {
                  const method = paymentMethods.find(pm => pm.id === payment.methodId)
                  const remaining = cartTotals.total - splitPayments.reduce((sum, p) => sum + p.amount, 0) + payment.amount
                  
                  return (
                    <div key={index} className="border border-surface-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={payment.methodId}
                            onChange={(e) => {
                              const newPayments = [...splitPayments]
                              newPayments[index].methodId = e.target.value
                              setSplitPayments(newPayments)
                            }}
                            options={paymentMethods.map(pm => ({ value: pm.id, label: pm.name }))}
                            className="w-40"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (splitPayments.length > 1) {
                              setSplitPayments(splitPayments.filter((_, i) => i !== index))
                            }
                          }}
                          className="text-surface-400 hover:text-danger-500"
                          disabled={splitPayments.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-surface-600">Monto:</span>
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          step="0.01"
                          value={payment.amount}
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value) || 0
                            const newPayments = [...splitPayments]
                            newPayments[index].amount = Math.min(Math.max(0, newAmount), remaining)
                            setSplitPayments(newPayments)
                          }}
                          className="flex-1 h-8 px-2 text-sm border border-surface-200 rounded focus:outline-none focus:ring-0 focus:border-primary-500"
                        />
                        <span className="text-sm text-surface-500">Restante: {formatCurrency(remaining - payment.amount)}</span>
                      </div>
                    </div>
                  )
                })}
                
                {splitPayments.reduce((sum, p) => sum + p.amount, 0) < cartTotals.total && (
                  <button
                    onClick={() => {
                      const remaining = cartTotals.total - splitPayments.reduce((sum, p) => sum + p.amount, 0)
                      setSplitPayments([...splitPayments, { 
                        methodId: paymentMethods[0]?.id || '', 
                        amount: remaining 
                      }])
                    }}
                    className="w-full py-2 text-sm text-primary-600 border border-dashed border-primary-300 rounded-lg hover:bg-primary-50"
                  >
                    + Agregar método
                  </button>
                )}
                
                {Math.abs(splitPayments.reduce((sum, p) => sum + p.amount, 0) - cartTotals.total) > 0.01 && (
                  <div className="text-xs text-danger-500 text-center">
                    El total debe ser {formatCurrency(cartTotals.total)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowCheckout(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={processCheckout}
              isLoading={isProcessing}
              disabled={
                splitPayments.length === 0 
                  ? !selectedPaymentMethod 
                  : splitPayments.reduce((sum, p) => sum + p.amount, 0) !== cartTotals.total || splitPayments.length === 0
              }
            >
              Confirmar venta
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Éxito */}
      <Modal
        isOpen={showSuccess}
        onClose={closeSuccess}
        showCloseButton={false}
        size="sm"
      >
        <div className="text-center py-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-success-500/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-success-500" />
          </div>

          <h3 className="text-xl font-semibold mb-2">¡Venta realizada!</h3>
          <p className="text-surface-500 mb-1">Comprobante</p>
          <p className="text-2xl font-mono font-bold text-primary-600 mb-6">
            {lastReceiptNumber}
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={handlePrintReceipt}
              disabled={!lastSale}
            >
              Imprimir Recibo
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleDownloadReceipt}
              disabled={!lastSale}
            >
              Descargar PDF
            </Button>
            <Button className="flex-1" onClick={closeSuccess}>
              Nueva venta
            </Button>
          </div>
        </div>
      </Modal>

      {/* Escáner de códigos de barras - COMENTADO: deshabilitado temporalmente */}
      {/* <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
      /> */}
    </div>
  )
}
