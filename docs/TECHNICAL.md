# 🔧 Documentación Técnica - Cotillón Manager

Documentación técnica completa del sistema, incluyendo arquitectura, estructura y decisiones de diseño.

## 📋 Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Patrones de Diseño](#patrones-de-diseño)
5. [Sincronización Offline](#sincronización-offline)
6. [Base de Datos](#base-de-datos)
7. [API REST](#api-rest)
8. [Testing](#testing)
9. [Despliegue](#despliegue)

## 🏗️ Arquitectura

### Domain-Driven Design (DDD)

El proyecto sigue los principios de DDD con las siguientes capas:

```
┌─────────────────────────────────────┐
│      Presentation Layer              │
│  (React Components, Pages, Hooks)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Application Layer              │
│  (Use Cases, DTOs)                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Domain Layer                    │
│  (Entities, Value Objects, Services)│
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Infrastructure Layer            │
│  (Persistence, API, Integrations)   │
└──────────────────────────────────────┘
```

### Capas en Detalle

#### 1. Domain Layer (`src/domain/`)

**Responsabilidades:**
- Define las entidades de negocio y sus reglas
- Value Objects para encapsular conceptos del dominio
- Servicios de dominio para lógica que no pertenece a una entidad

**Estructura:**
```
domain/
├── entities/          # Entidades de negocio
│   ├── Product.ts
│   ├── Sale.ts
│   ├── User.ts
│   └── ...
├── value-objects/    # Objetos de valor
│   ├── Money.ts
│   ├── Quantity.ts
│   ├── Email.ts
│   └── ...
├── services/         # Servicios de dominio
│   ├── StockService.ts
│   ├── PricingService.ts
│   └── StockAlertService.ts
└── repositories/     # Interfaces de repositorios
    ├── IProductRepository.ts
    ├── ISaleRepository.ts
    └── ...
```

#### 2. Application Layer (`src/application/`)

**Responsabilidades:**
- Casos de uso (use cases)
- DTOs para transferencia de datos
- Orquestación de operaciones de dominio

#### 3. Infrastructure Layer (`src/infrastructure/`)

**Responsabilidades:**
- Implementación de repositorios (IndexedDB, API)
- Cliente HTTP para comunicación con backend
- Servicios externos (Mercado Pago, AFIP)
- Sincronización offline

**Estructura:**
```
infrastructure/
├── api/              # Cliente HTTP
│   ├── client.ts
│   └── AuthService.ts
├── persistence/      # Persistencia local
│   └── indexeddb/
│       ├── database.ts
│       ├── repositories/
│       └── mappers/
├── sync/             # Sincronización
│   └── SyncService.ts
└── integrations/     # Integraciones externas
    ├── mercadopago/
    └── invoicing/
```

#### 4. Presentation Layer (`src/presentation/`)

**Responsabilidades:**
- Componentes React
- Páginas
- Hooks personalizados
- Providers (context)

**Estructura:**
```
presentation/
├── components/       # Componentes reutilizables
│   ├── ui/          # Componentes UI base
│   ├── layout/      # Layout components
│   └── ...
├── pages/           # Páginas de la aplicación
├── hooks/           # Hooks personalizados
└── providers/       # Context providers
```

## 📁 Estructura del Proyecto

```
proyecto-inventario-global/
├── backend/                 # Backend API
│   ├── prisma/             # Esquema y migraciones
│   ├── src/
│   │   ├── config/         # Configuración
│   │   ├── middleware/     # Middlewares
│   │   ├── routes/         # Rutas API
│   │   └── server.ts       # Entrada principal
│   └── package.json
├── src/                    # Frontend
│   ├── domain/             # Capa de dominio
│   ├── application/        # Capa de aplicación
│   ├── infrastructure/     # Capa de infraestructura
│   ├── presentation/       # Capa de presentación
│   └── shared/            # Código compartido
├── docs/                   # Documentación
├── public/                 # Archivos estáticos
└── package.json
```

## 🛠️ Stack Tecnológico

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.0 | Framework UI |
| TypeScript | 5.9.3 | Tipado estático |
| Vite | 7.2.4 | Build tool y dev server |
| Tailwind CSS | 4.1.18 | Estilos |
| React Router | 7.11.0 | Routing |
| Zustand | 5.0.9 | State management |
| React Query | 5.90.12 | Data fetching y cache |
| Dexie | 4.2.1 | IndexedDB wrapper |
| jsPDF | 3.0.4 | Generación de PDFs |

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Fastify | 4.27.0 | Framework web |
| Prisma | 5.14.0 | ORM |
| PostgreSQL | 14+ | Base de datos |
| JWT | - | Autenticación |
| Zod | 3.23.8 | Validación |
| Swagger | - | Documentación API |

## 🎨 Patrones de Diseño

### Repository Pattern

Cada entidad tiene una interfaz de repositorio en el dominio y una implementación en infraestructura:

```typescript
// Domain
interface IProductRepository {
  findById(id: string): Promise<Product | null>
  findAll(): Promise<Product[]>
  save(product: Product): Promise<void>
}

// Infrastructure
class ProductRepository implements IProductRepository {
  // Implementación con IndexedDB
}
```

### Value Objects

Encapsulan conceptos del dominio con validación:

```typescript
class Money {
  private constructor(private amount: number) {}
  
  static create(amount: number): Money {
    if (amount < 0) throw new Error('Amount cannot be negative')
    return new Money(amount)
  }
}
```

### Factory Pattern

Las entidades usan métodos estáticos `create` para instanciación:

```typescript
class Product {
  static create(props: ProductCreationProps): Product {
    // Validaciones
    return new Product(props)
  }
}
```

## 🔄 Sincronización Offline

### Arquitectura

1. **Persistencia Local**: Todos los datos se guardan en IndexedDB
2. **Cola de Operaciones**: Las operaciones offline se encolan
3. **Sincronización Bidireccional**:
   - **Push**: Envía cambios locales al servidor
   - **Pull**: Obtiene cambios del servidor

### Flujo de Sincronización

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  IndexedDB  │ ◄─── Guarda localmente
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Sync Queue  │ ◄─── Encola operaciones
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Backend   │ ◄─── Sincroniza cuando hay conexión
└─────────────┘
```

### Detección de Conflictos

Cuando hay cambios simultáneos:

1. El servidor detecta conflictos durante `push`
2. Se almacenan en `syncConflicts` (IndexedDB)
3. El usuario puede resolverlos desde la UI

## 🗄️ Base de Datos

### Esquema Principal

**PostgreSQL (Backend):**
- `users`: Usuarios del sistema
- `categories`: Categorías de productos
- `products`: Productos
- `product_variants`: Variantes con stock
- `customers`: Clientes
- `suppliers`: Proveedores
- `sales`: Ventas
- `sale_items`: Items de venta
- `stock_movements`: Movimientos de stock
- `payment_methods`: Métodos de pago
- `sync_logs`: Logs de sincronización

**IndexedDB (Frontend):**
- Misma estructura que PostgreSQL
- Tablas adicionales:
  - `pendingOperations`: Operaciones pendientes de sincronizar
  - `syncConflicts`: Conflictos pendientes de resolver
  - `stockAlerts`: Alertas de stock

### Relaciones

```
Product ──┬── ProductVariant
          │
          └── Category
          │
          └── Supplier

Sale ──┬── SaleItem ── ProductVariant
      │
      └── Customer
      │
      └── PaymentMethod
      │
      └── User
```

## 🌐 API REST

### Autenticación

Todas las rutas (excepto `/api/auth/*`) requieren un token JWT:

```
Authorization: Bearer <token>
```

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Registro |
| GET | `/api/products` | Listar productos |
| POST | `/api/products` | Crear producto |
| GET | `/api/products/:id` | Obtener producto |
| PUT | `/api/products/:id` | Actualizar producto |
| POST | `/api/sales` | Crear venta |
| GET | `/api/sales` | Listar ventas |
| POST | `/api/sync/pull` | Obtener cambios |
| POST | `/api/sync/push` | Enviar cambios |

### Documentación Swagger

Accede a `http://localhost:3000/docs` cuando el servidor esté corriendo.

## 🧪 Testing

### Framework

- **Vitest**: Framework de testing
- **React Testing Library**: Testing de componentes
- **jsdom**: Ambiente DOM para tests

### Estructura de Tests

```
src/
├── domain/
│   └── entities/
│       └── __tests__/
│           └── Product.test.ts
├── presentation/
│   └── components/
│       └── ui/
│           └── __tests__/
│               └── Button.test.tsx
```

### Ejecutar Tests

```bash
# Frontend
npm test

# Backend
cd backend && npm test
```

## 🚀 Despliegue

### Frontend

1. **Build de producción**:
```bash
npm run build
```

2. **Servir archivos estáticos**:
   - Los archivos en `dist/` se pueden servir con cualquier servidor estático
   - Nginx, Apache, o servicios como Vercel, Netlify

3. **PWA**: La aplicación es una PWA, se puede instalar en dispositivos

### Backend

1. **Build**:
```bash
cd backend
npm run build
```

2. **Variables de entorno**:
   - Configura `.env` con valores de producción
   - `NODE_ENV=production`
   - `DATABASE_URL` de producción

3. **Ejecutar**:
```bash
npm start
```

### Consideraciones

- **CORS**: Configura dominios permitidos en producción
- **HTTPS**: Requerido para PWA y Service Workers
- **Base de datos**: Usa migraciones de Prisma en producción
- **Backups**: Configura backups regulares de PostgreSQL

## 📝 Convenciones de Código

### Nomenclatura

- **Archivos**: `PascalCase.ts` para componentes, `camelCase.ts` para utilidades
- **Componentes**: `PascalCase`
- **Funciones**: `camelCase`
- **Constantes**: `UPPER_SNAKE_CASE`
- **Interfaces**: `IPrefix` para interfaces de repositorios, `PascalCase` para otros

### Estructura de Componentes

```typescript
// 1. Imports
import { ... } from '...'

// 2. Types/Interfaces
interface Props { ... }

// 3. Component
export function Component({ ... }: Props) {
  // 4. Hooks
  const [state, setState] = useState(...)
  
  // 5. Effects
  useEffect(() => { ... }, [])
  
  // 6. Handlers
  const handleClick = () => { ... }
  
  // 7. Render
  return <div>...</div>
}
```

## 🔐 Seguridad

### Autenticación

- JWT con expiración
- Tokens almacenados en localStorage (considerar httpOnly cookies en producción)
- Middleware de autenticación en todas las rutas protegidas

### Validación

- Zod schemas en backend
- Validación de entidades en dominio
- Sanitización de inputs

### CORS

- Configurado en Fastify
- En producción, especificar dominios permitidos

---

**Última actualización**: Diciembre 2024

