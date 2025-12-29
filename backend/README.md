# Cotillón Manager - Backend API

Backend API REST construido con **Fastify**, **Prisma** y **PostgreSQL** para la aplicación de gestión de stock y ventas.

## 🚀 Requisitos

- **Node.js** 18+ 
- **PostgreSQL** 14+
- **npm** o **pnpm**

## 📦 Instalación

1. **Instalar dependencias:**

```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**

Crea un archivo `.env` en la carpeta `backend/`:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:password@localhost:5432/cotillon_db?schema=public"

# JWT (genera una clave segura de al menos 32 caracteres)
JWT_SECRET="tu-clave-secreta-muy-segura-de-32-caracteres-minimo"

# Servidor
PORT=3000
HOST="0.0.0.0"

# Entorno
NODE_ENV="development"
```

3. **Crear base de datos PostgreSQL:**

```sql
CREATE DATABASE cotillon_db;
```

4. **Ejecutar migraciones:**

```bash
# Generar cliente Prisma y sincronizar esquema
npm run db:generate
npm run db:push

# O usar migraciones (recomendado para producción)
npm run db:migrate
```

5. **Poblar datos iniciales:**

```bash
npm run db:seed
```

## 🏃 Ejecutar

### Desarrollo

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Producción

```bash
npm run build
npm start
```

## 📚 Documentación API

Una vez el servidor esté corriendo, accede a la documentación Swagger en:

**http://localhost:3000/docs**

## 🔐 Autenticación

La API usa JWT para autenticación. Para obtener un token:

```bash
# Login (usuario por defecto después del seed)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@cotillon.local", "password": "admin123"}'
```

Usar el token en las solicitudes:

```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 📁 Estructura del Proyecto

```
backend/
├── prisma/
│   ├── schema.prisma    # Esquema de base de datos
│   └── seed.ts          # Datos iniciales
├── src/
│   ├── config/
│   │   ├── database.ts  # Cliente Prisma
│   │   └── env.ts       # Variables de entorno
│   ├── middleware/
│   │   └── auth.ts      # Autenticación JWT
│   ├── routes/
│   │   ├── auth.ts      # Login/registro
│   │   ├── categories.ts
│   │   ├── products.ts
│   │   ├── sales.ts
│   │   ├── stock.ts
│   │   ├── payment-methods.ts
│   │   └── sync.ts      # Sincronización offline
│   └── server.ts        # Entrada principal
├── package.json
└── tsconfig.json
```

## 🔄 Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register` | Registrar usuario |
| GET | `/api/categories` | Listar categorías |
| GET/POST | `/api/products` | CRUD productos |
| POST | `/api/sales` | Crear venta |
| GET | `/api/sales/summary/today` | Resumen del día |
| POST | `/api/stock/movements` | Movimiento de stock |
| GET | `/api/stock/low-stock` | Productos con stock bajo |
| POST | `/api/sync/pull` | Obtener cambios del servidor |
| POST | `/api/sync/push` | Enviar cambios al servidor |

## 🧪 Base de Datos

### Abrir Prisma Studio (GUI para la DB)

```bash
npm run db:studio
```

### Ver esquema

El esquema completo está en `prisma/schema.prisma` e incluye:

- Users (usuarios)
- Categories (categorías)
- Products (productos)
- ProductVariants (variantes con stock)
- Suppliers (proveedores)
- Customers (clientes)
- PaymentMethods (métodos de pago)
- Sales (ventas)
- SaleItems (items de venta)
- StockMovements (movimientos de stock)
- SyncLogs (logs de sincronización)

## 🐳 Docker (Opcional)

Para PostgreSQL con Docker:

```bash
docker run -d \
  --name cotillon-postgres \
  -e POSTGRES_USER=cotillon \
  -e POSTGRES_PASSWORD=cotillon123 \
  -e POSTGRES_DB=cotillon_db \
  -p 5432:5432 \
  postgres:16-alpine
```

Luego usa esta URL en `.env`:

```
DATABASE_URL="postgresql://cotillon:cotillon123@localhost:5432/cotillon_db?schema=public"
```

