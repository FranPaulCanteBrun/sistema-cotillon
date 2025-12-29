import { useState } from 'react'
import { Plus, Package, Search, Filter, MoreVertical, Edit, Trash2, Eye, Image as ImageIcon, X } from 'lucide-react'
import {
  Button,
  Card,
  SearchInput,
  Select,
  Badge,
  StockBadge,
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
  ConfirmModal,
  Input,
  Textarea,
  NumberInput,
  useToastActions,
  SkeletonProductRow
} from '@presentation/components/ui'
import { useActiveCategories } from '@infrastructure/persistence/hooks/useCategories'
import { useProducts, useProductMutations, useProductWithVariants } from '@infrastructure/persistence/hooks/useProducts'
import { Product } from '@domain/entities/Product'
import { ProductVariant } from '@domain/entities/ProductVariant'
import { Money } from '@domain/value-objects/Money'
import { Quantity } from '@domain/value-objects/Quantity'
import { SKU } from '@domain/value-objects/SKU'
import { formatCurrency } from '@shared/lib/utils'
import { getErrorMessage } from '@shared/errors'
import { processImage, getImageUrl } from '@infrastructure/services/ImageService'

// Componente para el formulario de producto
interface ProductFormProps {
  product?: Product | null
  onSave: (data: ProductFormData) => void
  onCancel: () => void
  isLoading?: boolean
  toast: ReturnType<typeof useToastActions>
}

interface ProductFormData {
  code: string
  name: string
  description: string
  categoryId: string
  basePrice: number
  minStock: number
  imageUrl?: string
}

function ProductForm({ product, onSave, onCancel, isLoading, toast }: ProductFormProps) {
  const { categories } = useActiveCategories()
  const [formData, setFormData] = useState<ProductFormData>({
    code: product?.code ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    categoryId: product?.categoryId ?? '',
    basePrice: product?.basePrice.amount ?? 0,
    minStock: product?.minStock.value ?? 10,
    imageUrl: product?.imageUrl
  })
  const [errors, setErrors] = useState<Partial<ProductFormData>>({})
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.imageUrl ? getImageUrl(product.imageUrl) : null
  )
  const [isProcessingImage, setIsProcessingImage] = useState(false)

  const validate = (): boolean => {
    const newErrors: Partial<ProductFormData> = {}
    if (!formData.code.trim()) newErrors.code = 'El código es requerido'
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido'
    if (!formData.categoryId) newErrors.categoryId = 'La categoría es requerida'
    if (formData.basePrice <= 0) newErrors.basePrice = 'El precio debe ser mayor a 0' as unknown as number
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessingImage(true)
    try {
      const base64 = await processImage(file)
      setFormData({ ...formData, imageUrl: base64 })
      setImagePreview(base64)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la imagen'
      toast.error('Error al procesar imagen', errorMessage)
    } finally {
      setIsProcessingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setFormData({ ...formData, imageUrl: undefined })
    setImagePreview(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSave(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Código"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          error={errors.code}
          placeholder="Ej: GLO-001"
          required
        />
        <Select
          label="Categoría"
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          placeholder="Seleccionar categoría"
          error={errors.categoryId}
          required
        />
      </div>

      <Input
        label="Nombre del producto"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        placeholder="Ej: Globos Perlados 12 pulgadas"
        required
      />

      <Textarea
        label="Descripción"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Descripción opcional del producto..."
        rows={2}
      />

      {/* Carga de imagen */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-surface-700">
          Imagen del producto
        </label>
        <div className="flex items-start gap-4">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Vista previa"
                className="w-32 h-32 object-cover rounded-lg border border-surface-200"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-danger-500 text-white rounded-full p-1 hover:bg-danger-600 transition-colors"
                title="Eliminar imagen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 border-2 border-dashed border-surface-300 rounded-lg flex items-center justify-center bg-surface-50">
              <ImageIcon className="h-8 w-8 text-surface-400" />
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              disabled={isProcessingImage}
              className="hidden"
              id="product-image-input"
            />
            <label
              htmlFor="product-image-input"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon className="h-4 w-4" />
              {isProcessingImage ? 'Procesando...' : imagePreview ? 'Cambiar imagen' : 'Seleccionar imagen'}
            </label>
            <p className="text-xs text-surface-500 mt-2">
              JPG, PNG, WEBP o GIF. Máximo 5MB. Se redimensionará automáticamente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <NumberInput
          label="Precio base ($)"
          value={formData.basePrice}
          onChange={(value) => setFormData({ ...formData, basePrice: value })}
          min={0}
          step={1}
          error={typeof errors.basePrice === 'string' ? errors.basePrice : undefined}
          required
        />
        <NumberInput
          label="Stock mínimo"
          value={formData.minStock}
          onChange={(value) => setFormData({ ...formData, minStock: value })}
          min={0}
          step={1}
          hint="Alerta cuando el stock baje de este valor"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {product ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  )
}

// Componente para el formulario de variante
interface VariantFormProps {
  productId: string
  variant?: ProductVariant | null
  onSave: (data: VariantFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

interface VariantFormData {
  sku: string
  color?: string
  size?: string
  price?: number
  barcode?: string
}

function VariantForm({ variant, onSave, onCancel, isLoading }: VariantFormProps) {
  const [formData, setFormData] = useState<VariantFormData>({
    sku: variant?.sku.value ?? '',
    color: variant?.color ?? '',
    size: variant?.size ?? '',
    price: variant?.price?.amount,
    barcode: variant?.barcode ?? ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.sku.trim()) return
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="SKU"
        value={formData.sku}
        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
        placeholder="Ej: GLO-001-ROJ"
        required
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Color"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          placeholder="Ej: Rojo"
        />
        <Input
          label="Tamaño"
          value={formData.size}
          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
          placeholder="Ej: Grande"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberInput
          label="Precio específico ($)"
          value={formData.price ?? 0}
          onChange={(value) => setFormData({ ...formData, price: value || undefined })}
          min={0}
          hint="Dejar en 0 para usar precio base"
        />
        <Input
          label="Código de barras"
          value={formData.barcode}
          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
          placeholder="Escanear o ingresar"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
          {variant ? 'Guardar cambios' : 'Crear variante'}
        </Button>
      </div>
    </form>
  )
}

// Modal de detalle de producto con variantes
interface ProductDetailModalProps {
  productId: string
  onClose: () => void
  onAddVariant: () => void
  onEditVariant: (variant: ProductVariant) => void
  onDeleteVariant: (variantId: string) => void
}

function ProductDetailModal({ productId, onClose, onAddVariant, onEditVariant, onDeleteVariant }: ProductDetailModalProps) {
  const { product, variants, isLoading } = useProductWithVariants(productId)
  const { categories } = useActiveCategories()

  if (isLoading || !product) {
    return (
      <Modal isOpen onClose={onClose} title="Cargando...">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-200 rounded w-1/2" />
          <div className="h-4 bg-surface-200 rounded w-3/4" />
        </div>
      </Modal>
    )
  }

  const category = categories.find(c => c.id === product.categoryId)
  const totalStock = variants.reduce((sum, v) => sum + v.currentStock.value, 0)

  return (
    <Modal isOpen onClose={onClose} title={product.name} size="lg">
      <div className="space-y-6">
        {/* Imagen del producto */}
        {product.imageUrl && (
          <div className="flex justify-center">
            <img
              src={getImageUrl(product.imageUrl) || ''}
              alt={product.name}
              className="w-48 h-48 object-cover rounded-lg border border-surface-200"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}

        {/* Info del producto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-50 rounded-lg">
          <div>
            <p className="text-xs text-surface-500">Código</p>
            <p className="font-medium">{product.code}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Categoría</p>
            <p className="font-medium">{category?.name ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Precio base</p>
            <p className="font-medium text-primary-600">{formatCurrency(product.basePrice.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-surface-500">Stock total</p>
            <p className="font-medium">{totalStock} unidades</p>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-surface-600">{product.description}</p>
        )}

        {/* Variantes */}
        <div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
            <h4 className="font-medium">Variantes ({variants.length})</h4>
            <Button size="sm" onClick={onAddVariant} leftIcon={<Plus className="h-4 w-4" />} className="w-full sm:w-auto">
              Agregar variante
            </Button>
          </div>

          {variants.length === 0 ? (
            <div className="text-center py-8 text-surface-500">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay variantes. Crea la primera.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {variants.map(variant => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-3 bg-white border border-surface-200 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{variant.sku.value}</span>
                      {variant.color && <Badge size="sm">{variant.color}</Badge>}
                      {variant.size && <Badge size="sm">{variant.size}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="text-surface-600">
                        {variant.price ? formatCurrency(variant.price.amount) : 'Precio base'}
                      </span>
                      <StockBadge stock={variant.currentStock.value} minStock={product.minStock.value} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditVariant(variant)}
                      className="h-8 w-8 p-0"
                      title="Editar variante"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteVariant(variant.id)}
                      className="h-8 w-8 p-0 text-danger-500 hover:text-danger-600"
                      title="Eliminar variante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// Página principal de Inventario
export function Inventory() {
  const { products, isLoading } = useProducts()
  const { categories } = useActiveCategories()
  const { createProduct, updateProduct, deleteProduct, createVariant, updateVariant, deleteVariant } = useProductMutations()
  const toast = useToastActions()

  // Estados de UI
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Estados de modales
  const [showProductModal, setShowProductModal] = useState(false)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Filtrar productos
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !categoryFilter || product.categoryId === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Paginar
  const totalPages = Math.ceil(filteredProducts.length / pageSize)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Handlers
  const handleCreateProduct = () => {
    setSelectedProduct(null)
    setShowProductModal(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowProductModal(true)
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowDetailModal(true)
  }

  const handleDeleteProduct = (productId: string) => {
    setProductToDelete(productId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      await deleteProduct(productToDelete)
      toast.success('Producto eliminado')
      setShowDeleteConfirm(false)
      setProductToDelete(null)
    } catch (error) {
      const { getErrorMessage } = await import('@shared/errors')
      toast.error('Error al eliminar', getErrorMessage(error))
    }
  }

  const handleSaveProduct = async (data: ProductFormData) => {
    setIsSaving(true)
    try {
      if (selectedProduct) {
        // Actualizar
        const updated = selectedProduct.update({
          code: data.code,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          basePrice: Money.create(data.basePrice),
          minStock: Quantity.create(data.minStock),
          imageUrl: data.imageUrl
        })
        await updateProduct(updated)
        toast.success('Producto actualizado')
      } else {
        // Crear nuevo
        const newProduct = Product.create({
          code: data.code,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          basePrice: Money.create(data.basePrice),
          minStock: Quantity.create(data.minStock),
          imageUrl: data.imageUrl
        })
        await createProduct(newProduct)
        
        // Crear variante por defecto
        const defaultVariant = ProductVariant.create({
          productId: newProduct.id,
          sku: SKU.create(data.code + '-DEF'),
          currentStock: Quantity.create(0)
        })
        await createVariant(defaultVariant)
        
        toast.success('Producto creado', 'Se creó con una variante por defecto')
      }
      setShowProductModal(false)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddVariant = () => {
    setSelectedVariant(null)
    setShowVariantModal(true)
  }

  const handleEditVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant)
    setShowVariantModal(true)
  }

  const handleDeleteVariant = async (variantId: string) => {
    try {
      await deleteVariant(variantId)
      toast.success('Variante eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleSaveVariant = async (data: VariantFormData) => {
    if (!selectedProduct) return
    setIsSaving(true)
    try {
      if (selectedVariant) {
        const updated = selectedVariant.update({
          sku: SKU.create(data.sku),
          color: data.color || null,
          size: data.size || null,
          price: data.price ? Money.create(data.price) : null,
          barcode: data.barcode || null
        })
        await updateVariant(updated)
        toast.success('Variante actualizada')
      } else {
        const newVariant = ProductVariant.create({
          productId: selectedProduct.id,
          sku: SKU.create(data.sku),
          color: data.color || undefined,
          size: data.size || undefined,
          price: data.price ? Money.create(data.price) : undefined,
          barcode: data.barcode || undefined,
          currentStock: Quantity.create(0)
        })
        await createVariant(newVariant)
        toast.success('Variante creada')
      }
      setShowVariantModal(false)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name ?? '-'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Inventario</h1>
          <p className="text-surface-500">Gestiona tus productos y stock</p>
        </div>
        <Button onClick={handleCreateProduct} leftIcon={<Plus className="h-4 w-4" />} className="w-full sm:w-auto">
          Nuevo producto
        </Button>
      </div>

      {/* Filtros */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              placeholder="Buscar por nombre o código..."
              onSearch={setSearchQuery}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'Todas las categorías' },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
              placeholder="Filtrar por categoría"
            />
          </div>
        </div>
      </Card>

      {/* Tabla de productos */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-center">Estado</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonProductRow key={i} />
              ))
            ) : paginatedProducts.length === 0 ? (
              <TableEmpty
                colSpan={6}
                icon={<Package className="h-12 w-12" />}
                title={searchQuery ? 'Sin resultados' : 'No hay productos'}
                description={searchQuery ? `No se encontraron productos para "${searchQuery}"` : 'Comienza creando tu primer producto'}
                action={!searchQuery && (
                  <Button onClick={handleCreateProduct} leftIcon={<Plus className="h-4 w-4" />}>
                    Crear producto
                  </Button>
                )}
              />
            ) : (
              paginatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <span className="font-mono text-sm">{product.code}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <img
                          src={getImageUrl(product.imageUrl) || ''}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded border border-surface-200"
                          onError={(e) => {
                            // Ocultar imagen si falla al cargar
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-surface-500 truncate max-w-xs">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryName(product.categoryId)}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.basePrice.amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.isActive ? (
                      <Badge variant="success">Activo</Badge>
                    ) : (
                      <Badge variant="default">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProduct(product)}
                        className="h-8 w-8 p-0"
                        title="Ver detalle del producto"
                        aria-label="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="h-8 w-8 p-0"
                        title="Editar producto"
                        aria-label="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="h-8 w-8 p-0 text-danger-500 hover:text-danger-600"
                        title="Eliminar producto"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paginación */}
        {filteredProducts.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200">
            <PaginationInfo
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredProducts.length}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Modal de crear/editar producto */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={selectedProduct ? 'Editar producto' : 'Nuevo producto'}
        size="md"
      >
        <ProductForm
          product={selectedProduct}
          onSave={handleSaveProduct}
          onCancel={() => setShowProductModal(false)}
          isLoading={isSaving}
        />
      </Modal>

      {/* Modal de detalle de producto */}
      {showDetailModal && selectedProduct && (
        <ProductDetailModal
          productId={selectedProduct.id}
          onClose={() => setShowDetailModal(false)}
          onAddVariant={handleAddVariant}
          onEditVariant={handleEditVariant}
          onDeleteVariant={handleDeleteVariant}
        />
      )}

      {/* Modal de crear/editar variante */}
      {selectedProduct && (
        <Modal
          isOpen={showVariantModal}
          onClose={() => setShowVariantModal(false)}
          title={selectedVariant ? 'Editar variante' : 'Nueva variante'}
          size="sm"
        >
          <VariantForm
            productId={selectedProduct.id}
            variant={selectedVariant}
            onSave={handleSaveVariant}
            onCancel={() => setShowVariantModal(false)}
            isLoading={isSaving}
          />
        </Modal>
      )}

      {/* Confirmación de eliminación */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteProduct}
        title="Eliminar producto"
        message="¿Estás seguro de eliminar este producto? Se eliminarán también todas sus variantes. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  )
}
