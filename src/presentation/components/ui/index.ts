/**
 * Componentes UI Base
 * Sistema de diseño para Cotillón Manager
 */

// Botones
export { Button, IconButton, type ButtonProps, type IconButtonProps } from './Button'

// Cards
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  type CardProps,
  type StatCardProps
} from './Card'

// Formularios
export { Input, type InputProps } from './Input'
export { Select, type SelectProps, type SelectOption } from './Select'
export { Textarea, type TextareaProps } from './Textarea'
export { Checkbox, type CheckboxProps } from './Checkbox'
export { SearchInput, type SearchInputProps } from './SearchInput'
export { NumberInput, type NumberInputProps } from './NumberInput'

// Feedback
export { Modal, ConfirmModal, type ModalProps, type ConfirmModalProps } from './Modal'
export { Badge, StatusBadge, StockBadge, SyncBadge, type BadgeProps } from './Badge'
export { Alert, type AlertProps } from './Alert'
export {
  ToastProvider,
  useToast,
  useToastActions,
  type Toast,
  type ToastType
} from './Toast'

// Tablas
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmpty,
  type TableProps,
  type TableEmptyProps
} from './Table'

// Navegación
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps
} from './Tabs'
export {
  Pagination,
  PaginationInfo,
  type PaginationProps,
  type PaginationInfoProps
} from './Pagination'

// Estados
export {
  EmptyState,
  NoProductsEmpty,
  NoSearchResultsEmpty,
  NoSalesEmpty,
  NoDataEmpty,
  type EmptyStateProps
} from './EmptyState'

// Loading
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonProductCard,
  SkeletonStatCard,
  SkeletonSaleRow,
  SkeletonProductRow,
  SkeletonProductGrid,
  SkeletonFormField
} from './Skeleton'
export { LoadingSpinner, InlineSpinner } from './LoadingSpinner'
