# 🧪 Guía de Testing - Cotillón Manager

Guía completa para ejecutar y escribir tests en el proyecto.

## 📋 Tabla de Contenidos

1. [Configuración](#configuración)
2. [Ejecutar Tests](#ejecutar-tests)
3. [Escribir Tests](#escribir-tests)
4. [Cobertura](#cobertura)
5. [Mejores Prácticas](#mejores-prácticas)

## ⚙️ Configuración

### Framework

El proyecto usa **Vitest** como framework de testing:

- **Frontend**: Vitest + React Testing Library + jsdom
- **Backend**: Vitest + Node environment

### Archivos de Configuración

**Frontend** (`vite.config.ts`):
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}']
}
```

**Backend** (`backend/vitest.config.ts`):
```typescript
test: {
  globals: true,
  environment: 'node',
  include: ['src/**/*.{test,spec}.{js,ts}']
}
```

### Setup Global

El archivo `src/test/setup.ts` configura:
- `@testing-library/jest-dom` para matchers adicionales
- Mocks de IndexedDB, localStorage, window.matchMedia
- Limpieza automática después de cada test

## ▶️ Ejecutar Tests

### Frontend

```bash
# Modo watch (recomendado para desarrollo)
npm test

# Una sola vez
npm test -- --run

# Interfaz visual
npm run test:ui

# Con cobertura
npm run test:coverage
```

### Backend

```bash
cd backend

# Modo watch
npm test

# Una sola vez
npm test -- --run

# Interfaz visual
npm run test:ui

# Con cobertura
npm run test:coverage
```

### Filtros

```bash
# Ejecutar tests de un archivo específico
npm test Product.test.ts

# Ejecutar tests que coincidan con un patrón
npm test -- -t "debe crear un producto"

# Ejecutar tests en modo watch de un archivo
npm test -- Product.test.ts
```

## ✍️ Escribir Tests

### Estructura de un Test

```typescript
import { describe, it, expect } from 'vitest'

describe('NombreDelComponente', () => {
  it('debe hacer algo específico', () => {
    // Arrange (preparar)
    const input = 'valor'
    
    // Act (ejecutar)
    const result = funcion(input)
    
    // Assert (verificar)
    expect(result).toBe('resultado esperado')
  })
})
```

### Tests de Entidades (Domain)

**Ejemplo**: `src/domain/entities/__tests__/Product.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { Product } from '../Product'
import { Money } from '../../value-objects/Money'
import { Quantity } from '../../value-objects/Quantity'

describe('Product', () => {
  describe('create', () => {
    it('debe crear un producto válido', () => {
      const product = Product.create({
        id: 'test-id',
        code: 'TEST-001',
        name: 'Producto de prueba',
        categoryId: 'category-id',
        basePrice: Money.create(100),
        minStock: Quantity.create(10)
      })

      expect(product.id).toBe('test-id')
      expect(product.code).toBe('TEST-001')
      expect(product.name).toBe('Producto de prueba')
    })

    it('debe lanzar error si el código está vacío', () => {
      expect(() => {
        Product.create({
          id: 'test-id',
          code: '',
          name: 'Producto',
          categoryId: 'category-id',
          basePrice: Money.create(100),
          minStock: Quantity.create(10)
        })
      }).toThrow('Product code is required')
    })
  })
})
```

### Tests de Componentes React

**Ejemplo**: `src/presentation/components/ui/__tests__/Button.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('debe renderizar el texto del botón', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('debe ejecutar onClick cuando se hace click', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Tests de Servicios

**Ejemplo**: `src/domain/services/__tests__/StockService.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { StockService } from '../StockService'
import { Product } from '../../entities/Product'
import { ProductVariant } from '../../entities/ProductVariant'
// ... más imports

describe('StockService', () => {
  const stockService = new StockService()

  it('debe calcular el stock total de un producto', () => {
    const product = Product.create({ /* ... */ })
    const variants = [/* ... */]

    const total = stockService.calculateTotalStock(product, variants)
    expect(total).toBe(15)
  })
})
```

### Tests de API (Backend)

**Ejemplo**: `backend/src/routes/__tests__/auth.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { authRoutes } from '../auth'

describe('Auth Routes', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = Fastify()
    await app.register(authRoutes, { prefix: '/api/auth' })
    await app.ready()
  })

  it('debe registrar un nuevo usuario', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'seller'
      }
    })

    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('token')
  })
})
```

## 📊 Cobertura

### Ver Cobertura

```bash
# Frontend
npm run test:coverage

# Backend
cd backend && npm run test:coverage
```

### Reporte de Cobertura

Después de ejecutar con cobertura, se genera:
- **HTML**: `coverage/index.html` (abre en navegador)
- **JSON**: `coverage/coverage-final.json`
- **Texto**: En la terminal

### Configuración de Cobertura

En `vite.config.ts`:
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.d.ts',
    '**/*.config.*'
  ]
}
```

## ✅ Mejores Prácticas

### 1. Nombres Descriptivos

✅ **Bien**:
```typescript
it('debe crear un producto válido cuando se proporcionan todos los campos requeridos', () => {
  // ...
})
```

❌ **Mal**:
```typescript
it('test 1', () => {
  // ...
})
```

### 2. Un Test, Una Aserción (cuando sea posible)

✅ **Bien**:
```typescript
it('debe tener el código correcto', () => {
  expect(product.code).toBe('TEST-001')
})

it('debe tener el nombre correcto', () => {
  expect(product.name).toBe('Producto')
})
```

❌ **Mal** (a veces está bien, pero evítalo si puedes):
```typescript
it('debe tener todas las propiedades', () => {
  expect(product.code).toBe('TEST-001')
  expect(product.name).toBe('Producto')
  expect(product.price).toBe(100)
  // ... muchas más
})
```

### 3. Arrange-Act-Assert (AAA)

```typescript
it('debe calcular el total correctamente', () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 }
  ]
  
  // Act
  const total = calculateTotal(items)
  
  // Assert
  expect(total).toBe(35)
})
```

### 4. Tests Independientes

Cada test debe poder ejecutarse de forma independiente:

```typescript
describe('Product', () => {
  it('test 1', () => {
    const product = Product.create({ /* ... */ })
    // No depende de otros tests
  })

  it('test 2', () => {
    const product = Product.create({ /* ... */ })
    // No depende de test 1
  })
})
```

### 5. Mocking

Usa mocks para dependencias externas:

```typescript
import { vi } from 'vitest'

it('debe llamar a la API', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ data: 'test' })
  global.fetch = fetchMock
  
  await fetchData()
  
  expect(fetchMock).toHaveBeenCalled()
})
```

### 6. Testing de Errores

```typescript
it('debe lanzar error cuando el código está vacío', () => {
  expect(() => {
    Product.create({ code: '', /* ... */ })
  }).toThrow('Product code is required')
})
```

### 7. Testing Asíncrono

```typescript
it('debe cargar datos asincrónicamente', async () => {
  const data = await loadData()
  expect(data).toBeDefined()
})
```

## 🎯 Objetivos de Cobertura

- **Mínimo recomendado**: 70%
- **Ideal**: 80%+
- **Crítico**: 90%+ para lógica de negocio (domain layer)

## 📚 Recursos

- [Documentación de Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Última actualización**: Diciembre 2024

