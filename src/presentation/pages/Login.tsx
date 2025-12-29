import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PartyPopper, Mail, Lock, User } from 'lucide-react'
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Alert, useToastActions } from '@presentation/components/ui'
import { useAuth } from '@presentation/hooks/useAuth'

export function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const { login, register, isLoading, error, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const toast = useToastActions()

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (isLogin) {
        await login(email, password)
        toast.success('Sesión iniciada')
        navigate('/')
      } else {
        await register(email, password, name)
        toast.success('Usuario registrado')
        navigate('/')
      }
    } catch (err) {
      // El error ya está manejado por el hook
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-surface-50 to-accent-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600">
              <PartyPopper className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Cotillón Manager</CardTitle>
          <p className="text-surface-500 mt-2">
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea una nueva cuenta'}
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="danger" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-surface-700 mb-1.5">
                  Nombre completo
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required={!isLogin}
                  leftIcon={<User className="h-4 w-4" />}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-700 mb-1.5">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                leftIcon={<Mail className="h-4 w-4" />}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 mb-1.5">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                leftIcon={<Lock className="h-4 w-4" />}
              />
              {!isLogin && (
                <p className="text-xs text-surface-500 mt-1">
                  Mínimo 6 caracteres
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading || !email || !password || (!isLogin && !name)}
            >
              {isLogin ? 'Iniciar sesión' : 'Registrarse'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setEmail('')
                setPassword('')
                setName('')
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {isLogin
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>

          {isLogin && (
            <div className="mt-4 p-3 bg-surface-50 rounded-lg">
              <p className="text-xs text-surface-600 text-center">
                <strong>Usuario de prueba:</strong><br />
                admin@cotillon.local / admin123
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

