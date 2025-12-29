import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DatabaseProvider, SyncProvider } from '@presentation/providers'
import { StockAlertsProvider } from '@presentation/providers/StockAlertsProvider'
import { ToastProvider } from '@presentation/components/ui'
import { MainLayout } from '@presentation/components/layout'
import { ProtectedRoute } from '@presentation/components/auth/ProtectedRoute'
import { ErrorBoundary } from '@shared/errors'
import { LoadingSpinner } from '@presentation/components/ui'

// Lazy loading de páginas para code splitting
const Login = lazy(() => import('@presentation/pages/Login').then(m => ({ default: m.Login })))
const Dashboard = lazy(() => import('@presentation/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const POS = lazy(() => import('@presentation/pages/POS').then(m => ({ default: m.POS })))
const Inventory = lazy(() => import('@presentation/pages/Inventory').then(m => ({ default: m.Inventory })))
const SalesHistory = lazy(() => import('@presentation/pages/SalesHistory').then(m => ({ default: m.SalesHistory })))
const StockEntry = lazy(() => import('@presentation/pages/StockEntry').then(m => ({ default: m.StockEntry })))
const Settings = lazy(() => import('@presentation/pages/Settings').then(m => ({ default: m.Settings })))
const Reports = lazy(() => import('@presentation/pages/Reports').then(m => ({ default: m.Reports })))

// Componente de carga para Suspense
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Cargando..." />
    </div>
  )
}

// Configuración de React Query optimizada para offline-first
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 60 * 24, // 24 horas (antes cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst'
    },
    mutations: {
      networkMode: 'offlineFirst'
    }
  }
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <DatabaseProvider>
            <SyncProvider autoSyncInterval={5 * 60 * 1000}>
              <StockAlertsProvider>
                <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                      element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="pos" element={<POS />} />
                      <Route path="inventario" element={<Inventory />} />
                      <Route path="historial" element={<SalesHistory />} />
                      <Route path="reportes" element={<Reports />} />
                      <Route path="carga" element={<StockEntry />} />
                      <Route path="configuracion" element={<Settings />} />
                    </Route>
                  </Routes>
                </Suspense>
                </BrowserRouter>
              </StockAlertsProvider>
            </SyncProvider>
          </DatabaseProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
