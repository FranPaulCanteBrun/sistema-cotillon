# 🎉 Cotillón Manager

Sistema completo de gestión de stock y ventas para tienda de cotillón, construido con arquitectura offline-first, PWA y sincronización bidireccional.

## ✨ Características Principales

- 🛒 **Punto de Venta (POS)**: Sistema de ventas rápido e intuitivo
- 📦 **Gestión de Inventario**: Control completo de productos, variantes y stock
- 📊 **Reportes Avanzados**: Análisis de ventas, productos más vendidos, por categoría y método de pago
- 👥 **Gestión de Clientes y Proveedores**: CRUD completo con información de contacto
- 🔄 **Sincronización Offline**: Funciona sin conexión y sincroniza automáticamente
- 📱 **PWA**: Instalable como aplicación nativa
- 🔔 **Alertas de Stock**: Notificaciones automáticas de stock bajo
- 📄 **Generación de PDFs**: Recibos y facturas en formato A4
- 🖨️ **Impresión Térmica**: Soporte para impresoras térmicas (80mm)
- 💾 **Backup y Restauración**: Exportar e importar todos los datos
- 👤 **Gestión de Usuarios**: Control de acceso con roles (admin, seller)
- 🔐 **Autenticación JWT**: Sistema seguro de login/registro

## 🚀 Inicio Rápido

### Requisitos

- **Node.js** 18+
- **PostgreSQL** 14+ (para el backend)
- **npm** o **pnpm**

### Instalación

1. **Clonar el repositorio** (si aplica)

```bash
git clone <url-del-repositorio>
cd proyecto-inventario-global
```

2. **Instalar dependencias del frontend**

```bash
npm install
```

3. **Instalar dependencias del backend**

```bash
cd backend
npm install
```

4. **Configurar variables de entorno del backend**

Crea un archivo `.env` en `backend/`:

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

5. **Configurar la base de datos**

```bash
cd backend

# Crear la base de datos PostgreSQL
# (ejecuta en tu cliente PostgreSQL)
# CREATE DATABASE cotillon_db;

# Generar cliente Prisma
npm run db:generate

# Sincronizar esquema
npm run db:push

# Poblar datos iniciales
npm run db:seed
```

6. **Iniciar el backend**

```bash
cd backend
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

7. **Iniciar el frontend**

En otra terminal:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📚 Documentación

### Para Usuarios

- [Guía de Usuario](./docs/USER_GUIDE.md) - Manual completo de uso de la aplicación
- [Guía de Alertas de Stock](./GUIA_PRUEBA_ALERTAS.md) - Cómo funciona el sistema de alertas

### Para Desarrolladores

- [Documentación Técnica](./docs/TECHNICAL.md) - Arquitectura, estructura y decisiones técnicas
- [Documentación del Backend](./backend/README.md) - API REST, endpoints y configuración
- [Guía de Testing](./docs/TESTING.md) - Cómo ejecutar y escribir tests

## 🏗️ Arquitectura

El proyecto sigue **Domain-Driven Design (DDD)** con las siguientes capas:

```
src/
├── domain/          # Entidades, Value Objects, Servicios de Dominio
├── application/     # Casos de uso y DTOs
├── infrastructure/  # Persistencia, API, Integraciones
└── presentation/    # Componentes React, Páginas, Hooks
```

### Stack Tecnológico

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS 4
- React Router v7
- Zustand + React Query (offline-first)
- IndexedDB (Dexie) para persistencia local
- PWA con Workbox

**Backend:**
- Fastify (framework web)
- PostgreSQL + Prisma ORM
- JWT para autenticación
- Swagger/OpenAPI para documentación
- Zod para validación

## 🧪 Testing

### Frontend

```bash
# Ejecutar tests
npm test

# Interfaz visual
npm run test:ui

# Con cobertura
npm run test:coverage
```

### Backend

```bash
cd backend

# Ejecutar tests
npm test

# Interfaz visual
npm run test:ui

# Con cobertura
npm run test:coverage
```

## 📦 Scripts Disponibles

### Frontend

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build
- `npm run lint` - Linter
- `npm run format` - Formatear código
- `npm test` - Ejecutar tests
- `npm run type-check` - Verificar tipos TypeScript

### Backend

- `npm run dev` - Servidor de desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Ejecutar servidor en producción
- `npm run db:generate` - Generar cliente Prisma
- `npm run db:push` - Sincronizar esquema con DB
- `npm run db:migrate` - Ejecutar migraciones
- `npm run db:seed` - Poblar datos iniciales
- `npm run db:studio` - Abrir Prisma Studio (GUI)

## 🔐 Autenticación

### Usuario por Defecto (después del seed)

- **Email**: `admin@cotillon.local`
- **Password**: `admin123`
- **Rol**: `admin`

### Crear Nuevo Usuario

1. Inicia sesión con el usuario admin
2. Ve a **Configuración** → **Usuarios**
3. Haz clic en **Nuevo Usuario**
4. Completa el formulario y guarda

## 🔄 Sincronización Offline

La aplicación funciona completamente offline:

1. **Modo Offline**: Todos los datos se guardan localmente en IndexedDB
2. **Sincronización Automática**: Cuando hay conexión, se sincroniza automáticamente cada 30 segundos
3. **Cola de Operaciones**: Las operaciones offline se encolan y se envían al servidor cuando hay conexión
4. **Resolución de Conflictos**: Si hay conflictos, se muestran en **Configuración** → **Conflictos**

## 📄 Generación de Documentos

### Recibos (Ticket)

- Formato optimizado para impresoras térmicas (80mm)
- Se puede imprimir directamente desde el navegador
- También disponible como PDF descargable

### Facturas (A4)

- Formato A4 completo
- Incluye todos los detalles de la venta
- Disponible solo como PDF descargable

## 💾 Backup y Restauración

1. Ve a **Configuración** → **Backup y Restauración**
2. **Exportar**: Descarga un archivo JSON con todos los datos
3. **Importar**: Selecciona un archivo JSON para restaurar datos
   - Opción para limpiar datos existentes antes de importar

## 🐛 Solución de Problemas

### Error "No autorizado"

- Asegúrate de haber iniciado sesión
- Verifica que el token JWT no haya expirado
- Revisa que el backend esté corriendo

### Error de conexión a la base de datos

- Verifica que PostgreSQL esté corriendo
- Revisa la `DATABASE_URL` en `backend/.env`
- Asegúrate de que la base de datos exista

### Problemas de sincronización

- Revisa la conexión a internet
- Verifica que el backend esté accesible
- Revisa los conflictos en **Configuración** → **Conflictos**

## 📝 Licencia

Este proyecto es privado y de uso interno.

## 🤝 Contribución

Para contribuir al proyecto, por favor:

1. Crea una rama desde `main`
2. Realiza tus cambios
3. Ejecuta los tests: `npm test`
4. Asegúrate de que el código pase el linter: `npm run lint`
5. Crea un Pull Request

## 📞 Soporte

Para reportar bugs o solicitar características, por favor crea un issue en el repositorio.

---

**Desarrollado con ❤️ para gestión eficiente de inventario y ventas**
