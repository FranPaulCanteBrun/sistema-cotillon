import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Users,
  Truck,
  CreditCard,
  Tag,
  Database,
  Cloud,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Edit,
  Check,
  X,
  AlertTriangle
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Checkbox,
  Badge,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  ConfirmModal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  useToastActions
} from '@presentation/components/ui'
import { useCategories, useActiveCategories, useCategoryMutations } from '@infrastructure/persistence/hooks/useCategories'
import { usePaymentMethods, usePaymentMethodMutations } from '@infrastructure/persistence/hooks/usePaymentMethods'
import { useUsers, useUserMutations, syncUsersFromServer } from '@infrastructure/persistence/hooks/useUsers'
import { useCustomers, useCustomerMutations } from '@infrastructure/persistence/hooks/useCustomers'
import { useSuppliers, useSupplierMutations } from '@infrastructure/persistence/hooks/useSuppliers'
import { Category } from '@domain/entities/Category'
import { PaymentMethod } from '@domain/entities/PaymentMethod'
import { User } from '@domain/entities/User'
import { Customer } from '@domain/entities/Customer'
import { Supplier } from '@domain/entities/Supplier'
import { Email } from '@domain/value-objects/Email'
import { db } from '@infrastructure/persistence/indexeddb/database'
import { getErrorMessage } from '@shared/errors'
import { ConflictResolver } from '@presentation/components/sync/ConflictResolver'
import { downloadBackup, readBackupFile, restoreBackup, getBackupStats, type RestoreOptions } from '@infrastructure/services/BackupService'

// Componente para editar proveedor
function SupplierEditor({
  supplier,
  onSave,
  onCancel,
  isLoading = false,
  toast
}: {
  supplier?: Supplier | null
  onSave: (data: { name: string; contactName?: string; phone?: string; email?: string; address?: string; notes?: string; isActive: boolean }) => void
  onCancel: () => void
  isLoading?: boolean
  toast: ReturnType<typeof useToastActions>
}) {
  const [name, setName] = useState(supplier?.name ?? '')
  const [contactName, setContactName] = useState(supplier?.contactName ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email?.value ?? '')
  const [address, setAddress] = useState(supplier?.address ?? '')
  const [notes, setNotes] = useState(supplier?.notes ?? '')
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true)

  // Sincronizar estado cuando cambia el supplier
  useEffect(() => {
    if (supplier) {
      setName(supplier.name)
      setContactName(supplier.contactName ?? '')
      setPhone(supplier.phone ?? '')
      setEmail(supplier.email?.value ?? '')
      setAddress(supplier.address ?? '')
      setNotes(supplier.notes ?? '')
      setIsActive(supplier.isActive)
    } else {
      setName('')
      setContactName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNotes('')
      setIsActive(true)
    }
  }, [supplier])

  const handleSubmit = () => {
    if (!name.trim()) {
      return
    }
    
    // Validar email si se proporciona
    const emailValue = email.trim()
    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      toast.warning('Email inválido', 'Por favor ingresa un email válido')
      return
    }
    
    onSave({
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: emailValue || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive
    })
    if (!supplier) {
      setName('')
      setContactName('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNotes('')
      setIsActive(true)
    }
  }

  return (
    <div className="space-y-3 p-4 bg-primary-50 rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del proveedor *"
          required
        />
        <Input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Nombre de contacto"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          error={email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Email inválido' : undefined}
        />
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección"
          className="sm:col-span-2"
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas"
          className="sm:col-span-2"
        />
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id={supplier ? `supplier-active-${supplier.id}` : 'supplier-active-new'}
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(checked === true)}
          />
          <label htmlFor={supplier ? `supplier-active-${supplier.id}` : 'supplier-active-new'} className="text-sm text-surface-700 cursor-pointer">
            Proveedor activo
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isLoading || !name.trim()}
          leftIcon={<Check className="h-4 w-4" />}
        >
          {supplier ? 'Guardar' : 'Crear'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          leftIcon={<X className="h-4 w-4" />}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// Componente para editar cliente
function CustomerEditor({
  customer,
  onSave,
  onCancel,
  isLoading = false
}: {
  customer?: Customer | null
  onSave: (data: { name: string; documentNumber?: string; phone?: string; email?: string; address?: string; notes?: string; isActive: boolean }) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  const [name, setName] = useState(customer?.name ?? '')
  const [documentNumber, setDocumentNumber] = useState(customer?.documentNumber ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [email, setEmail] = useState(customer?.email?.value ?? '')
  const [address, setAddress] = useState(customer?.address ?? '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [isActive, setIsActive] = useState(customer?.isActive ?? true)

  // Sincronizar estado cuando cambia el customer
  useEffect(() => {
    if (customer) {
      setName(customer.name)
      setDocumentNumber(customer.documentNumber ?? '')
      setPhone(customer.phone ?? '')
      setEmail(customer.email?.value ?? '')
      setAddress(customer.address ?? '')
      setNotes(customer.notes ?? '')
      setIsActive(customer.isActive)
    } else {
      setName('')
      setDocumentNumber('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNotes('')
      setIsActive(true)
    }
  }, [customer])

  const handleSubmit = () => {
    if (!name.trim()) {
      return
    }
    
    // Validar email si se proporciona
    const emailValue = email.trim()
    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      toast.warning('Email inválido', 'Por favor ingresa un email válido')
      return
    }
    
    onSave({
      name: name.trim(),
      documentNumber: documentNumber.trim() || undefined,
      phone: phone.trim() || undefined,
      email: emailValue || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive
    })
    if (!customer) {
      setName('')
      setDocumentNumber('')
      setPhone('')
      setEmail('')
      setAddress('')
      setNotes('')
      setIsActive(true)
    }
  }

  return (
    <div className="space-y-3 p-4 bg-primary-50 rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo *"
          required
        />
        <Input
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="Número de documento"
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Teléfono"
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          error={email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Email inválido' : undefined}
        />
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Dirección"
          className="sm:col-span-2"
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas"
          className="sm:col-span-2"
        />
        <div className="flex items-center gap-2 sm:col-span-2">
          <Checkbox
            id={customer ? `customer-active-${customer.id}` : 'customer-active-new'}
            checked={isActive}
            onCheckedChange={(checked) => setIsActive(checked === true)}
          />
          <label htmlFor={customer ? `customer-active-${customer.id}` : 'customer-active-new'} className="text-sm text-surface-700 cursor-pointer">
            Cliente activo
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isLoading || !name.trim()}
          leftIcon={<Check className="h-4 w-4" />}
        >
          {customer ? 'Guardar' : 'Crear'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          leftIcon={<X className="h-4 w-4" />}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// Componente para editar usuario
function UserEditor({
  user,
  onSave,
  onCancel,
  isLoading = false
}: {
  user?: User | null
  onSave: (data: { name: string; email: string; password?: string; role: 'admin' | 'manager' | 'seller'; isActive: boolean }) => void
  onCancel: () => void
  isLoading?: boolean
}) {
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email.value ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'seller'>(user?.role ?? 'seller')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) {
      return
    }
    if (!user && !password.trim()) {
      return
    }
    onSave({
      name: name.trim(),
      email: email.trim(),
      password: password.trim() || undefined,
      role,
      isActive
    })
    if (!user) {
      setName('')
      setEmail('')
      setPassword('')
      setRole('seller')
      setIsActive(true)
    }
  }

  return (
    <div className="space-y-3 p-4 bg-primary-50 rounded-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo"
          disabled={isLoading}
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={isLoading}
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={user ? "Nueva contraseña (opcional)" : "Contraseña"}
          disabled={isLoading}
        />
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'seller')}
          disabled={isLoading}
          options={[
            { value: 'seller', label: 'Vendedor' },
            { value: 'manager', label: 'Gerente' },
            { value: 'admin', label: 'Administrador' }
          ]}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={isLoading}
        />
        <label className="text-sm text-surface-700">Usuario activo</label>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!name.trim() || !email.trim() || (!user && !password.trim()) || isLoading}
          className="h-10"
        >
          <Check className="h-4 w-4 mr-2" />
          {user ? 'Guardar' : 'Crear'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="h-10"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// Componente para editar categoría
function CategoryEditor({ 
  category, 
  onSave, 
  onCancel 
}: { 
  category?: Category | null
  onSave: (name: string, description: string) => void
  onCancel: () => void 
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la categoría *"
          className="w-full"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          className="w-full"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="px-4"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(name, description)}
          disabled={!name.trim()}
          className="px-4"
        >
          <Check className="h-4 w-4 mr-2" />
          {category ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>
    </div>
  )
}

export function Settings() {
  const { categories: allCategories } = useCategories()
  const activeCategories = allCategories.filter(c => c.isActive)
  const inactiveCategories = allCategories.filter(c => !c.isActive)
  const { create: createCategory, update: updateCategory, remove: removeCategory } = useCategoryMutations()
  const { paymentMethods } = usePaymentMethods()
  const { update: updatePaymentMethod, remove: removePaymentMethod } = usePaymentMethodMutations()
  const { users } = useUsers()
  const { create: createUser, update: updateUser, remove: removeUser, isCreating, isUpdating, isRemoving } = useUserMutations()
  const { customers } = useCustomers()
  const { create: createCustomer, update: updateCustomer, remove: removeCustomer, removePermanently: removeCustomerPermanently, isCreating: isCreatingCustomer, isUpdating: isUpdatingCustomer, isRemoving: isRemovingCustomer, isRemovingPermanently: isRemovingCustomerPermanently } = useCustomerMutations()
  const { suppliers } = useSuppliers()
  const { create: createSupplier, update: updateSupplier, remove: removeSupplier, removePermanently: removeSupplierPermanently, isCreating: isCreatingSupplier, isUpdating: isUpdatingSupplier, isRemoving: isRemovingSupplier, isRemovingPermanently: isRemovingSupplierPermanently } = useSupplierMutations()
  const toast = useToastActions()

  // Estados
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [customerToDeletePermanently, setCustomerToDeletePermanently] = useState<string | null>(null)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)
  const [isAddingSupplier, setIsAddingSupplier] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null)
  const [supplierToDeletePermanently, setSupplierToDeletePermanently] = useState<string | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({ clearBeforeRestore: false })
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('general')

  // Sincronizar usuarios cuando se abre la pestaña de usuarios
  useEffect(() => {
    if (activeTab === 'users') {
      syncUsersFromServer().catch((error) => {
        // Silenciar errores de sincronización, solo loguear
        console.warn('Error al sincronizar usuarios:', error)
      })
    }
  }, [activeTab])

  // Handlers de categorías
  const handleSaveCategory = async (name: string, description: string) => {
    try {
      if (editingCategoryId) {
        const category = allCategories.find(c => c.id === editingCategoryId)
        if (category) {
          const updated = category.update({ name, description })
          await updateCategory(updated)
          toast.success('Categoría actualizada')
        }
      } else {
        const newCategory = Category.create({ name, description })
        await createCategory(newCategory)
        toast.success('Categoría creada')
      }
      setEditingCategoryId(null)
      setIsAddingCategory(false)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  const handleToggleCategoryActive = async (id: string) => {
    try {
      const category = allCategories.find(c => c.id === id)
      if (!category) return

      const updated = category.update({ isActive: !category.isActive })
      await updateCategory(updated)
      toast.success(updated.isActive ? 'Categoría activada' : 'Categoría desactivada')
    } catch {
      toast.error('Error al actualizar categoría')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      // Verificar si hay productos usando esta categoría
      const products = await db.products.filter(p => p.categoryId === id).toArray()
      if (products.length > 0) {
        toast.error('No se puede eliminar', `Hay ${products.length} producto(s) usando esta categoría`)
        return
      }

      await removeCategory(id)
      toast.success('Categoría eliminada')
      setCategoryToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar categoría', getErrorMessage(error))
    }
  }

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      // Verificar si hay ventas usando este método de pago
      const sales = await db.sales.filter(s => s.paymentMethodId === id).toArray()
      if (sales.length > 0) {
        toast.error('No se puede eliminar', `Hay ${sales.length} venta(s) usando este método de pago`)
        return
      }

      await removePaymentMethod(id)
      toast.success('Método de pago eliminado')
      setPaymentMethodToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar método de pago', getErrorMessage(error))
    }
  }

  // Función para eliminar categorías duplicadas
  const handleRemoveDuplicates = async () => {
    try {
      const categories = await db.categories.toArray()
      const grouped = categories.reduce((acc, cat) => {
        if (!acc[cat.name]) acc[cat.name] = []
        acc[cat.name].push(cat)
        return acc
      }, {} as Record<string, typeof categories>)

      const toDelete: string[] = []
      Object.values(grouped).forEach(arr => {
        if (arr.length > 1) {
          // Mantener la primera (más antigua) y eliminar el resto
          const sorted = arr.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          toDelete.push(...sorted.slice(1).map(c => c.id))
        }
      })

      if (toDelete.length === 0) {
        toast.info('Sin duplicados', 'No se encontraron categorías duplicadas')
        return
      }

      await db.categories.bulkDelete(toDelete)
      toast.success('Duplicados eliminados', `Se eliminaron ${toDelete.length} categoría(s) duplicada(s)`)
    } catch (error) {
      toast.error('Error al eliminar duplicados', getErrorMessage(error))
    }
  }

  // Función para eliminar métodos de pago duplicados
  const handleRemovePaymentMethodDuplicates = async () => {
    try {
      const methods = await db.paymentMethods.toArray()
      const grouped = methods.reduce((acc, method) => {
        const key = `${method.name}-${method.type}`
        if (!acc[key]) acc[key] = []
        acc[key].push(method)
        return acc
      }, {} as Record<string, typeof methods>)

      const toDelete: string[] = []
      Object.values(grouped).forEach(arr => {
        if (arr.length > 1) {
          // Mantener la primera (más antigua) y eliminar el resto
          const sorted = arr.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          toDelete.push(...sorted.slice(1).map(m => m.id))
        }
      })

      if (toDelete.length === 0) {
        toast.info('Sin duplicados', 'No se encontraron métodos de pago duplicados')
        return
      }

      await db.paymentMethods.bulkDelete(toDelete)
      toast.success('Duplicados eliminados', `Se eliminaron ${toDelete.length} método(s) de pago duplicado(s)`)
    } catch (error) {
      toast.error('Error al eliminar duplicados', getErrorMessage(error))
    }
  }

  // Función para eliminar usuarios duplicados
  const handleRemoveUserDuplicates = async () => {
    try {
      const userRecords = await db.users.toArray()
      const grouped = userRecords.reduce((acc, user) => {
        // Agrupar por email (debe ser único)
        const key = user.email.toLowerCase().trim()
        if (!acc[key]) acc[key] = []
        acc[key].push(user)
        return acc
      }, {} as Record<string, typeof userRecords>)

      const toDelete: string[] = []
      Object.values(grouped).forEach(arr => {
        if (arr.length > 1) {
          // Mantener la primera (más antigua) y eliminar el resto
          const sorted = arr.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          toDelete.push(...sorted.slice(1).map(u => u.id))
        }
      })

      if (toDelete.length === 0) {
        toast.info('Sin duplicados', 'No se encontraron usuarios duplicados')
        return
      }

      await db.users.bulkDelete(toDelete)
      toast.success('Duplicados eliminados', `Se eliminaron ${toDelete.length} usuario(s) duplicado(s)`)
    } catch (error) {
      toast.error('Error al eliminar duplicados', getErrorMessage(error))
    }
  }

  // Handler de métodos de pago
  const handleTogglePaymentMethod = async (method: PaymentMethod) => {
    try {
      const updated = method.toggle()
      await updatePaymentMethod(updated)
      toast.success(updated.isActive ? 'Método activado' : 'Método desactivado')
    } catch {
      toast.error('Error al actualizar')
    }
  }

  // Handler para limpiar datos
  const handleClearData = async () => {
    try {
      await db.sales.clear()
      await db.stockMovements.clear()
      await db.syncQueue.clear()
      toast.success('Datos limpiados', 'Se eliminaron ventas y movimientos')
      setShowClearDataConfirm(false)
    } catch {
      toast.error('Error al limpiar datos')
    }
  }

  // Handlers de usuarios
  const handleSaveUser = async (data: { name: string; email: string; password?: string; role: 'admin' | 'manager' | 'seller'; isActive: boolean }) => {
    try {
      // Convertir el rol a mayúsculas para el backend
      const roleUpper = data.role.toUpperCase() as 'ADMIN' | 'MANAGER' | 'SELLER'
      const dataWithUpperRole = { ...data, role: roleUpper }
      
      if (editingUserId) {
        await updateUser({ id: editingUserId, data: dataWithUpperRole })
        toast.success('Usuario actualizado')
      } else {
        if (!data.password) {
          toast.error('Error', 'La contraseña es requerida para nuevos usuarios')
          return
        }
        await createUser(dataWithUpperRole)
        toast.success('Usuario creado')
      }
      setEditingUserId(null)
      setIsAddingUser(false)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  const handleDeleteUser = async (id: string) => {
    try {
      await removeUser(id)
      toast.success('Usuario desactivado')
      setUserToDelete(null)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  // Handlers de clientes
  const handleSaveCustomer = async (data: { name: string; documentNumber?: string; phone?: string; email?: string; address?: string; notes?: string; isActive: boolean }) => {
    try {
      if (editingCustomerId) {
        await updateCustomer({ id: editingCustomerId, data })
        toast.success('Cliente actualizado')
        setEditingCustomerId(null)
      } else {
        await createCustomer(data)
        toast.success('Cliente creado')
        setIsAddingCustomer(false)
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      if (errorMessage.includes('No autorizado') || errorMessage.includes('autenticado') || errorMessage.includes('Sin permisos')) {
        toast.error('Error de autenticación', 'Por favor, inicia sesión nuevamente')
        // No limpiar los campos si es error de autenticación
      } else {
        toast.error('Error', errorMessage)
        // Solo limpiar si no es error de autenticación
        if (editingCustomerId) {
          setEditingCustomerId(null)
        } else {
          setIsAddingCustomer(false)
        }
      }
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    try {
      await removeCustomer(id)
      toast.success('Cliente desactivado')
      setCustomerToDelete(null)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  const handleDeleteCustomerPermanently = async (id: string) => {
    try {
      await removeCustomerPermanently(id)
      toast.success('Cliente eliminado permanentemente')
      setCustomerToDeletePermanently(null)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  // Handlers de proveedores
  const handleSaveSupplier = async (data: { name: string; contactName?: string; phone?: string; email?: string; address?: string; notes?: string; isActive: boolean }) => {
    try {
      if (editingSupplierId) {
        await updateSupplier({ id: editingSupplierId, data })
        toast.success('Proveedor actualizado')
        setEditingSupplierId(null)
      } else {
        await createSupplier(data)
        toast.success('Proveedor creado')
        setIsAddingSupplier(false)
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      if (errorMessage.includes('No autorizado') || errorMessage.includes('autenticado') || errorMessage.includes('Sin permisos')) {
        toast.error('Error de autenticación', 'Por favor, inicia sesión nuevamente')
      } else {
        toast.error('Error', errorMessage)
        if (!errorMessage.includes('No autorizado') && !errorMessage.includes('autenticado')) {
          if (editingSupplierId) {
            setEditingSupplierId(null)
          } else {
            setIsAddingSupplier(false)
          }
        }
      }
    }
  }

  const handleDeleteSupplier = async (id: string) => {
    try {
      await removeSupplier(id)
      toast.success('Proveedor desactivado')
      setSupplierToDelete(null)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  const handleDeleteSupplierPermanently = async (id: string) => {
    try {
      await removeSupplierPermanently(id)
      toast.success('Proveedor eliminado permanentemente')
      setSupplierToDeletePermanently(null)
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    }
  }

  // Exportar backup
  const handleExport = async () => {
    setIsExporting(true)
    try {
      await downloadBackup()
      toast.success('Backup exportado', 'El archivo se ha descargado correctamente')
    } catch (error) {
      toast.error('Error al exportar', getErrorMessage(error))
    } finally {
      setIsExporting(false)
    }
  }

  // Manejar selección de archivo para restaurar
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const backup = await readBackupFile(file)
      setRestoreFile(file)
      setShowRestoreModal(true)
    } catch (error) {
      toast.error('Error al leer el archivo', getErrorMessage(error))
    }
    
    // Resetear el input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = ''
  }

  // Restaurar backup
  const handleRestore = async (options: RestoreOptions) => {
    if (!restoreFile) return

    setIsRestoring(true)
    try {
      const backup = await readBackupFile(restoreFile)
      const result = await restoreBackup(backup, options)
      
      if (result.errors.length > 0) {
        toast.warning('Restauración completada con errores', result.errors.join(', '))
      } else {
        toast.success('Backup restaurado', `Se restauraron ${result.restored} registros`)
      }
      
      setShowRestoreModal(false)
      setRestoreFile(null)
      setRestoreOptions({ clearBeforeRestore: false })
      
      // Recargar la página para reflejar los cambios
      window.location.reload()
    } catch (error) {
      toast.error('Error al restaurar', getErrorMessage(error))
    } finally {
      setIsRestoring(false)
    }
  }

  // Sincronización usando el servicio real
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const { syncService } = await import('@infrastructure/sync')
      const result = await syncService.sync()
      
      if (result.success) {
        toast.success('Sincronizado', result.message)
      } else {
        toast.error('Error de sincronización', result.message)
      }
    } catch (error) {
      toast.error('Error', getErrorMessage(error))
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Configuración</h1>
        <p className="text-surface-500">Administra la configuración de tu tienda</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4 mr-2" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Métodos de Pago
          </TabsTrigger>
          <TabsTrigger value="data">
            <Database className="h-4 w-4 mr-2" />
            Datos
          </TabsTrigger>
          <TabsTrigger value="users">
            <UserIcon className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-2" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Proveedores
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflictos
          </TabsTrigger>
        </TabsList>

        {/* Categorías */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>Categorías de Productos</CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRemoveDuplicates}
                    title="Eliminar categorías duplicadas"
                    className="w-full sm:w-auto"
                  >
                    Limpiar duplicados
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsAddingCategory(true)}
                    leftIcon={<Plus className="h-4 w-4" />}
                    disabled={isAddingCategory}
                    className="w-full sm:w-auto"
                  >
                    Nueva categoría
                  </Button>
                </div>
              </div>
            </CardHeader>

            <div className="space-y-2 pt-2">
              {isAddingCategory && (
                <div className="p-3 bg-primary-50 rounded-lg">
                  <CategoryEditor
                    onSave={handleSaveCategory}
                    onCancel={() => setIsAddingCategory(false)}
                  />
                </div>
              )}

              {[...activeCategories, ...inactiveCategories].map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-surface-50 rounded-lg"
                >
                  {editingCategoryId === category.id ? (
                    <CategoryEditor
                      category={category}
                      onSave={handleSaveCategory}
                      onCancel={() => setEditingCategoryId(null)}
                    />
                  ) : (
                    <>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-surface-500">{category.description}</p>
                        )}
                        {!category.isActive && (
                          <p className="text-xs text-warning-600 mt-1">Categoría desactivada</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategoryId(category.id)}
                          className="h-8 w-8 p-0"
                          title="Editar categoría"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleCategoryActive(category.id)}
                          className="h-8 w-8 p-0 text-warning-500"
                          title={category.isActive ? "Desactivar categoría" : "Activar categoría"}
                        >
                          {category.isActive ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCategoryToDelete(category.id)}
                          className="h-8 w-8 p-0 text-danger-500"
                          title="Eliminar categoría permanentemente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {allCategories.length === 0 && !isAddingCategory && (
                <div className="text-center py-8 text-surface-500">
                  <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay categorías</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Métodos de Pago */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>Métodos de Pago</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemovePaymentMethodDuplicates}
                  title="Eliminar métodos de pago duplicados"
                  className="w-full sm:w-auto"
                >
                  Limpiar duplicados
                </Button>
              </div>
            </CardHeader>

            <div className="space-y-2 pt-2">
              {paymentMethods.map(method => (
                <div
                  key={method.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-surface-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      method.isActive ? 'bg-primary-100 text-primary-600' : 'bg-surface-200 text-surface-400'
                    }`}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-surface-500 capitalize">{method.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={method.isActive ? 'success' : 'default'}>
                      {method.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePaymentMethod(method)}
                    >
                      {method.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaymentMethodToDelete(method.id)}
                      className="h-8 w-8 p-0 text-danger-500"
                      title="Eliminar método de pago permanentemente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Usuarios */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>Usuarios del Sistema</CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRemoveUserDuplicates}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    className="w-full sm:w-auto"
                    title="Eliminar usuarios duplicados"
                  >
                    Limpiar duplicados
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsAddingUser(true)}
                    leftIcon={<Plus className="h-4 w-4" />}
                    disabled={isAddingUser}
                    className="w-full sm:w-auto"
                  >
                    Nuevo usuario
                  </Button>
                </div>
              </div>
            </CardHeader>

            <div className="space-y-2 pt-2">
              {isAddingUser && (
                <UserEditor
                  onSave={handleSaveUser}
                  onCancel={() => setIsAddingUser(false)}
                  isLoading={isCreating}
                />
              )}

              {users.map(user => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-surface-50 rounded-lg"
                >
                  {editingUserId === user.id ? (
                    <UserEditor
                      user={user}
                      onSave={handleSaveUser}
                      onCancel={() => setEditingUserId(null)}
                      isLoading={isUpdating}
                    />
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            user.isActive ? 'bg-primary-100 text-primary-600' : 'bg-surface-200 text-surface-400'
                          }`}>
                            <UserIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-surface-500">{user.email.value}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={user.isActive ? 'success' : 'default'}>
                                {user.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                              <Badge variant="info">
                                {user.role === 'admin' ? 'Administrador' : 
                                 user.role === 'manager' ? 'Gerente' : 'Vendedor'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUserId(user.id)}
                          className="h-8 w-8 p-0"
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToDelete(user.id)}
                          className="h-8 w-8 p-0 text-danger-500"
                          title="Desactivar usuario"
                          disabled={!user.isActive}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {users.length === 0 && !isAddingUser && (
                <div className="text-center py-8 text-surface-500">
                  <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay usuarios</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Clientes */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>Clientes</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setIsAddingCustomer(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                  disabled={isAddingCustomer}
                  className="w-full sm:w-auto"
                >
                  Nuevo cliente
                </Button>
              </div>
            </CardHeader>

            <div className="space-y-2 pt-2">
              {isAddingCustomer && (
                <CustomerEditor
                  onSave={handleSaveCustomer}
                  onCancel={() => setIsAddingCustomer(false)}
                  isLoading={isCreatingCustomer}
                  toast={toast}
                />
              )}

              {customers.map(customer => (
                <div
                  key={customer.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-surface-50 rounded-lg"
                >
                  {editingCustomerId === customer.id ? (
                    <CustomerEditor
                      customer={customer}
                      onSave={handleSaveCustomer}
                      onCancel={() => setEditingCustomerId(null)}
                      isLoading={isUpdatingCustomer}
                      toast={toast}
                    />
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                            customer.isActive ? 'bg-primary-100 text-primary-600' : 'bg-surface-200 text-surface-400'
                          }`}>
                            <Users className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-surface-900">{customer.name}</p>
                              <Badge variant={customer.isActive ? 'success' : 'default'} className="shrink-0">
                                {customer.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              {customer.documentNumber && (
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[60px]">DNI:</span>
                                  <span>{customer.documentNumber}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[60px]">Tel:</span>
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[60px]">Email:</span>
                                  <span className="truncate">{customer.email.value}</span>
                                </div>
                              )}
                              {customer.address && (
                                <div className="flex items-start gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[60px] shrink-0">Dirección:</span>
                                  <span className="truncate">{customer.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCustomerId(customer.id)}
                          className="h-8 w-8 p-0"
                          title="Editar cliente"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomerToDelete(customer.id)}
                          className="h-8 w-8 p-0 text-warning-500"
                          title="Desactivar cliente"
                          disabled={!customer.isActive}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomerToDeletePermanently(customer.id)}
                          className="h-8 w-8 p-0 text-danger-500"
                          title="Eliminar cliente permanentemente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {customers.length === 0 && !isAddingCustomer && (
                <div className="text-center py-8 text-surface-500">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay clientes</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Proveedores */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>Proveedores</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setIsAddingSupplier(true)}
                  leftIcon={<Plus className="h-4 w-4" />}
                  disabled={isAddingSupplier}
                  className="w-full sm:w-auto"
                >
                  Nuevo proveedor
                </Button>
              </div>
            </CardHeader>

            <div className="space-y-2 pt-2">
              {isAddingSupplier && (
                <SupplierEditor
                  onSave={handleSaveSupplier}
                  onCancel={() => setIsAddingSupplier(false)}
                  isLoading={isCreatingSupplier}
                  toast={toast}
                />
              )}

              {suppliers.map(supplier => (
                <div
                  key={supplier.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-surface-50 rounded-lg"
                >
                  {editingSupplierId === supplier.id ? (
                    <SupplierEditor
                      supplier={supplier}
                      onSave={handleSaveSupplier}
                      onCancel={() => setEditingSupplierId(null)}
                      isLoading={isUpdatingSupplier}
                      toast={toast}
                    />
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                            supplier.isActive ? 'bg-primary-100 text-primary-600' : 'bg-surface-200 text-surface-400'
                          }`}>
                            <Truck className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-surface-900">{supplier.name}</p>
                              <Badge variant={supplier.isActive ? 'success' : 'default'} className="shrink-0">
                                {supplier.isActive ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              {supplier.contactName && (
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[80px]">Contacto:</span>
                                  <span>{supplier.contactName}</span>
                                </div>
                              )}
                              {supplier.phone && (
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[80px]">Tel:</span>
                                  <span>{supplier.phone}</span>
                                </div>
                              )}
                              {supplier.email && (
                                <div className="flex items-center gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[80px]">Email:</span>
                                  <span className="truncate">{supplier.email.value}</span>
                                </div>
                              )}
                              {supplier.address && (
                                <div className="flex items-start gap-2 text-sm text-surface-600">
                                  <span className="font-medium min-w-[80px] shrink-0">Dirección:</span>
                                  <span className="truncate">{supplier.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSupplierId(supplier.id)}
                          className="h-8 w-8 p-0"
                          title="Editar proveedor"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSupplierToDelete(supplier.id)}
                          className="h-8 w-8 p-0 text-warning-500"
                          title="Desactivar proveedor"
                          disabled={!supplier.isActive}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSupplierToDeletePermanently(supplier.id)}
                          className="h-8 w-8 p-0 text-danger-500"
                          title="Eliminar proveedor permanentemente"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {suppliers.length === 0 && !isAddingSupplier && (
                <div className="text-center py-8 text-surface-500">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay proveedores</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Datos */}
        <TabsContent value="data">
          <div className="space-y-4">
            {/* Sincronización */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  <CardTitle>Sincronización</CardTitle>
                </div>
              </CardHeader>

              <div className="space-y-4">
                <Alert variant="warning" title="Backend no configurado">
                  La sincronización con servidor aún no está implementada. 
                  Los datos se guardan localmente en tu navegador.
                </Alert>

                <div className="flex items-center justify-between p-4 bg-surface-50 rounded-lg">
                  <div>
                    <p className="font-medium">Estado de sincronización</p>
                    <p className="text-sm text-surface-500">Última sync: Nunca</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSync}
                    isLoading={isSyncing}
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                  >
                    Sincronizar ahora
                  </Button>
                </div>
              </div>
            </Card>

            {/* Exportar/Importar */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  <CardTitle>Gestión de Datos</CardTitle>
                </div>
              </CardHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-surface-50 rounded-lg">
                  <div>
                    <p className="font-medium">Exportar datos</p>
                    <p className="text-sm text-surface-500">Descarga una copia de todos tus datos</p>
                  </div>
                  <Button
                    variant="outline"
                    leftIcon={<Download className="h-4 w-4" />}
                    onClick={handleExport}
                    isLoading={isExporting}
                    disabled={isExporting}
                  >
                    Exportar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-50 rounded-lg">
                  <div>
                    <p className="font-medium">Importar datos</p>
                    <p className="text-sm text-surface-500">Restaurar desde una copia de seguridad</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="restore-file-input"
                    />
                    <label htmlFor="restore-file-input" className="cursor-pointer">
                      <Button
                        variant="outline"
                        leftIcon={<Upload className="h-4 w-4" />}
                        className="cursor-pointer"
                        type="button"
                      >
                        Importar
                      </Button>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-danger-50 rounded-lg border border-danger-200">
                  <div>
                    <p className="font-medium text-danger-700">Limpiar datos de ventas</p>
                    <p className="text-sm text-danger-600">Elimina ventas y movimientos de stock</p>
                  </div>
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setShowClearDataConfirm(true)}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            </Card>

            {/* Info del sistema */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
              </CardHeader>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500">Versión</p>
                  <p className="font-medium">1.0.0</p>
                </div>
                <div>
                  <p className="text-surface-500">Almacenamiento</p>
                  <p className="font-medium">IndexedDB (Local)</p>
                </div>
                <div>
                  <p className="text-surface-500">Modo</p>
                  <p className="font-medium">Offline-first PWA</p>
                </div>
                <div>
                  <p className="text-surface-500">Navegador</p>
                  <p className="font-medium">{navigator.userAgent.split(' ').pop()}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Conflictos de Sincronización */}
        <TabsContent value="conflicts">
          <ConflictResolver />
        </TabsContent>
      </Tabs>

      {/* Confirmación de limpiar datos */}
      <ConfirmModal
        isOpen={showClearDataConfirm}
        onClose={() => setShowClearDataConfirm(false)}
        onConfirm={handleClearData}
        title="¿Limpiar datos de ventas?"
        message="Esta acción eliminará todas las ventas y movimientos de stock. Los productos y categorías se mantendrán. Esta acción no se puede deshacer."
        confirmText="Sí, limpiar datos"
        variant="danger"
      />

      {/* Confirmación de eliminar categoría */}
      <ConfirmModal
        isOpen={categoryToDelete !== null}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => categoryToDelete && handleDeleteCategory(categoryToDelete)}
        title="¿Eliminar categoría permanentemente?"
        message="Esta acción eliminará la categoría de forma permanente. No se puede deshacer. Si hay productos usando esta categoría, no se podrá eliminar."
        confirmText="Sí, eliminar"
        variant="danger"
      />

      {/* Confirmación de eliminar método de pago */}
      <ConfirmModal
        isOpen={paymentMethodToDelete !== null}
        onClose={() => setPaymentMethodToDelete(null)}
        onConfirm={() => paymentMethodToDelete && handleDeletePaymentMethod(paymentMethodToDelete)}
        title="¿Eliminar método de pago permanentemente?"
        message="Esta acción eliminará el método de pago de forma permanente. No se puede deshacer. Si hay ventas usando este método de pago, no se podrá eliminar."
        confirmText="Sí, eliminar"
        variant="danger"
      />

      {/* Confirmación de desactivar usuario */}
      <ConfirmModal
        isOpen={userToDelete !== null}
        onClose={() => setUserToDelete(null)}
        onConfirm={() => userToDelete && handleDeleteUser(userToDelete)}
        title="¿Desactivar usuario?"
        message="Esta acción desactivará el usuario. El usuario no podrá iniciar sesión hasta que sea reactivado. Puedes reactivarlo editando el usuario."
        confirmText="Sí, desactivar"
        variant="danger"
      />
      <ConfirmModal
        isOpen={customerToDelete !== null}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={() => customerToDelete && handleDeleteCustomer(customerToDelete)}
        title="¿Desactivar cliente?"
        message="Esta acción desactivará el cliente. El cliente no aparecerá en las listas hasta que sea reactivado. Puedes reactivarlo editando el cliente."
        confirmText="Sí, desactivar"
        variant="danger"
      />
      <ConfirmModal
        isOpen={supplierToDelete !== null}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={() => supplierToDelete && handleDeleteSupplier(supplierToDelete)}
        title="¿Desactivar proveedor?"
        message="Esta acción desactivará el proveedor. El proveedor no aparecerá en las listas hasta que sea reactivado. Puedes reactivarlo editando el proveedor."
        confirmText="Sí, desactivar"
        variant="danger"
      />
      <ConfirmModal
        isOpen={customerToDeletePermanently !== null}
        onClose={() => setCustomerToDeletePermanently(null)}
        onConfirm={() => customerToDeletePermanently && handleDeleteCustomerPermanently(customerToDeletePermanently)}
        title="⚠️ Eliminar Cliente Permanentemente"
        message="Esta acción es IRREVERSIBLE. El cliente será eliminado permanentemente de la base de datos y no podrá ser recuperado. Todos los datos asociados al cliente se perderán para siempre. ¿Estás seguro de que deseas continuar?"
        confirmText="Sí, eliminar permanentemente"
        variant="danger"
      />
      <ConfirmModal
        isOpen={supplierToDeletePermanently !== null}
        onClose={() => setSupplierToDeletePermanently(null)}
        onConfirm={() => supplierToDeletePermanently && handleDeleteSupplierPermanently(supplierToDeletePermanently)}
        title="⚠️ Eliminar Proveedor Permanentemente"
        message="Esta acción es IRREVERSIBLE. El proveedor será eliminado permanentemente de la base de datos y no podrá ser recuperado. Todos los datos asociados al proveedor se perderán para siempre. ¿Estás seguro de que deseas continuar?"
        confirmText="Sí, eliminar permanentemente"
        variant="danger"
      />

      {/* Modal de restauración */}
      {showRestoreModal && restoreFile && (
        <RestoreBackupModal
          file={restoreFile}
          onClose={() => {
            setShowRestoreModal(false)
            setRestoreFile(null)
            setRestoreOptions({ clearBeforeRestore: false })
          }}
          onRestore={handleRestore}
          isRestoring={isRestoring}
        />
      )}
    </div>
  )
}

// Componente modal para restaurar backup
function RestoreBackupModal({
  file,
  onClose,
  onRestore,
  isRestoring
}: {
  file: File
  onClose: () => void
  onRestore: (options: RestoreOptions) => void
  isRestoring: boolean
}) {
  const [backup, setBackup] = useState<Awaited<ReturnType<typeof readBackupFile>> | null>(null)
  const [stats, setStats] = useState<ReturnType<typeof getBackupStats> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clearBeforeRestore, setClearBeforeRestore] = useState(false)

  useEffect(() => {
    readBackupFile(file)
      .then(backupData => {
        setBackup(backupData)
        setStats(getBackupStats(backupData))
      })
      .catch(err => {
        setError(getErrorMessage(err))
      })
  }, [file])

  const handleRestore = () => {
    if (backup) {
      onRestore({ clearBeforeRestore })
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="Restaurar backup" size="md">
      <div className="space-y-4">
        {error ? (
          <>
            <Alert variant="danger" title="Error">
              {error}
            </Alert>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        ) : !stats ? (
          <div className="text-center py-8">
            <p className="text-surface-500">Cargando información del backup...</p>
          </div>
        ) : (
          <>
            <Alert variant="warning" title="Advertencia">
              Esta acción reemplazará los datos actuales. Asegúrate de haber exportado un backup antes de continuar.
            </Alert>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-surface-700 mb-2">Información del backup:</p>
                <div className="bg-surface-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-surface-600">Versión:</span>
                    <span className="font-medium">{stats.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-600">Fecha:</span>
                    <span className="font-medium">{new Date(stats.timestamp).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-600">Total de registros:</span>
                    <span className="font-medium">{stats.totalRecords}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-surface-700 mb-2">Desglose por tabla:</p>
                <div className="bg-surface-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(stats.tables).map(([table, count]) => (
                      <div key={table} className="flex justify-between">
                        <span className="text-surface-600 capitalize">{table}:</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Checkbox
                  checked={clearBeforeRestore}
                  onCheckedChange={(checked) => setClearBeforeRestore(checked === true)}
                />
                <label className="text-sm text-surface-700 cursor-pointer">
                  Limpiar datos existentes antes de restaurar
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={onClose} disabled={isRestoring}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleRestore}
                isLoading={isRestoring}
                disabled={isRestoring}
              >
                Restaurar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
