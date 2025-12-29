import { useLocation, useNavigate } from 'react-router-dom'
import { startTransition } from 'react'
import { cn } from '@shared/lib/utils'
import {
  ShoppingCart,
  Package,
  History,
  TruckIcon,
  LayoutDashboard,
  Settings,
  PartyPopper,
  BarChart3
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Punto de Venta', href: '/pos', icon: ShoppingCart },
  { name: 'Inventario', href: '/inventario', icon: Package },
  { name: 'Historial', href: '/historial', icon: History },
  { name: 'Reportes', href: '/reportes', icon: BarChart3 },
  { name: 'Carga de Mercadería', href: '/carga', icon: TruckIcon },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavigation = (href: string) => {
    // Usar startTransition para que la navegación no espere a que los componentes terminen de cargar
    startTransition(() => {
      navigate(href)
    })
    // Cerrar sidebar en móviles
    if (onClose) {
      onClose()
    }
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-surface-950 transition-transform duration-300 ease-in-out',
        'w-64 lg:w-64', // Ancho completo en móviles cuando está abierto, fijo en desktop
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6 border-b border-white/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600">
          <PartyPopper className="h-6 w-6 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white truncate">Cotillón</h1>
          <p className="text-xs text-surface-400 truncate">Manager</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'min-w-0 text-left',
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'text-surface-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-xs text-surface-400 truncate">
            Versión 1.0.0
          </p>
          <p className="text-xs text-surface-400/80 mt-1 truncate">
            Offline-first PWA
          </p>
        </div>
      </div>
    </aside>
  )
}

