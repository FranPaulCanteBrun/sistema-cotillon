# 📦 Guía de Transferencia - Cotillón Manager

Guía completa para transferir la aplicación desde tu PC a tu notebook para la demostración al cliente.

## 📋 Checklist Pre-Transferencia

### 1. Verificar que todo funciona en tu PC
```bash
# En la raíz del proyecto
npm run build
npm run dev
```

### 2. Preparar archivos importantes
- ✅ Código fuente completo
- ✅ `package.json` y `package-lock.json`
- ✅ Variables de entorno (`.env` si las hay)
- ✅ Base de datos (backup de PostgreSQL si tienes datos importantes)

---

## 🚀 Pasos para Transferir a tu Notebook

### Paso 1: Copiar el Proyecto

**Opción A: Usando USB/Disco Externo**
1. Copia toda la carpeta del proyecto: `proyecto-inventario-global`
2. Asegúrate de incluir:
   - ✅ Carpeta `src/` completa
   - ✅ Carpeta `backend/` completa
   - ✅ Archivos de configuración (`.json`, `.ts`, `.prisma`)
   - ✅ `node_modules/` (opcional, pero recomendado para ahorrar tiempo)

**Opción B: Usando Git (Recomendado)**
```bash
# En tu PC - Commit y push de cambios
git add .
git commit -m "Preparación para demo"
git push origin main

# En tu Notebook - Clonar el repositorio
git clone <url-del-repositorio>
cd proyecto-inventario-global
```

**Opción C: Usando servicios en la nube**
- Sube el proyecto a Google Drive, Dropbox, OneDrive, etc.
- Descarga en tu notebook

---

### Paso 2: Instalar Dependencias en el Notebook

#### 2.1. Verificar Node.js y npm
```bash
node --version  # Debe ser v22.20.0 (igual que en tu PC)
npm --version   # Debe ser v11.6.4 (igual que en tu PC)
```

**⚠️ IMPORTANTE**: Necesitas instalar la **misma versión** que en tu PC para evitar problemas de compatibilidad.

**Si no tienes Node.js instalado o tienes una versión diferente:**

**Opción A: Usando nvm-windows (Recomendado)**
1. Descarga nvm-windows desde: https://github.com/coreybutler/nvm-windows/releases
2. Instala `nvm-setup.exe`
3. Abre PowerShell como Administrador y ejecuta:
   ```bash
   nvm install 22.20.0
   nvm use 22.20.0
   ```

**Opción B: Descarga directa**
- Ve a: https://nodejs.org/dist/v22.20.0/
- Descarga: `node-v22.20.0-x64.msi`
- Ejecuta el instalador

**📖 Ver guía completa**: Consulta `GUIA_INSTALACION_NODE.md` para instrucciones detalladas.

#### 2.2. Instalar dependencias del Frontend
```bash
# En la raíz del proyecto
cd "D:\Datos User\Documents\proyecto-inventario-global"
npm install
```

#### 2.3. Instalar dependencias del Backend
```bash
cd backend
npm install
```

---

### Paso 3: Configurar Base de Datos

#### 3.1. Instalar PostgreSQL (si no está instalado)
- Descarga desde: https://www.postgresql.org/download/
- Durante la instalación, anota:
  - Usuario: `postgres` (o el que elijas)
  - Contraseña: (la que configures)
  - Puerto: `5432` (por defecto)

#### 3.2. Crear la Base de Datos
```bash
# Abrir PostgreSQL (psql o pgAdmin)
# Crear base de datos
CREATE DATABASE cotillon_db;
```

#### 3.3. Configurar Variables de Entorno del Backend
Crea o edita el archivo `backend/.env`:
```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/cotillon_db"
JWT_SECRET="tu-secret-key-muy-segura-aqui"
NODE_ENV="development"
PORT=3000
```

**⚠️ IMPORTANTE:** Reemplaza `usuario` y `contraseña` con tus credenciales de PostgreSQL.

#### 3.4. Ejecutar Migraciones de Prisma
```bash
cd backend
npx prisma migrate deploy
# O si es la primera vez:
npx prisma migrate dev --name init
```

#### 3.5. (Opcional) Cargar Datos de Prueba
Si tienes datos importantes en tu PC:
```bash
# En tu PC - Exportar datos
cd backend
npx prisma db seed

# En tu Notebook - Importar datos
# (Copia el archivo de seed o ejecuta el seed nuevamente)
```

---

### Paso 4: Verificar Configuración

#### 4.1. Verificar que el Backend funciona
```bash
cd backend
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en http://localhost:3000
📚 Documentación API: http://localhost:3000/docs
```

#### 4.2. Verificar que el Frontend funciona
```bash
# En otra terminal, desde la raíz del proyecto
npm run dev
```

Deberías ver:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### Paso 5: Probar la Aplicación

1. **Abrir el navegador**: http://localhost:5173
2. **Login**: Usa las credenciales de prueba:
   - Email: `admin@cotillon.local`
   - Contraseña: `admin123`
3. **Verificar funcionalidades principales**:
   - ✅ Dashboard carga correctamente
   - ✅ Punto de Venta funciona
   - ✅ Inventario se muestra
   - ✅ Historial de Ventas funciona
   - ✅ Configuración accesible

---

## 🔧 Solución de Problemas Comunes

### Error: "Cannot find module"
```bash
# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Error: "Database connection failed"
- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en `backend/.env`
- Verifica que la base de datos existe

### Error: "Port already in use"
```bash
# Cambiar puerto en backend/.env
PORT=3001

# O cambiar puerto de Vite en vite.config.ts
server: {
  port: 5174
}
```

### Error: "Prisma Client not generated"
```bash
cd backend
npx prisma generate
```

---

## 📝 Datos de Prueba Rápidos

Si necesitas crear datos de prueba rápidamente:

1. **Crear usuario de prueba** (desde la app):
   - Email: `admin@cotillon.local`
   - Contraseña: `admin123`
   - Nombre: `Administrador`

2. **Crear categorías** (desde Configuración):
   - Globos
   - Decoración
   - Fiestas

3. **Crear productos** (desde Inventario):
   - Agregar algunos productos de ejemplo con stock

---

## 🎯 Checklist Pre-Demo

Antes de la demostración, verifica:

- [ ] Backend corriendo en `http://localhost:3000`
- [ ] Frontend corriendo en `http://localhost:5173`
- [ ] Base de datos conectada
- [ ] Usuario de prueba creado
- [ ] Algunos productos creados
- [ ] Navegador con la app abierta
- [ ] Conexión a internet (si necesitas sincronización)
- [ ] Modo presentación del navegador (F11)

---

## 💡 Tips para la Demo

1. **Preparar datos de ejemplo**:
   - Crea algunas ventas de ejemplo
   - Ten productos con diferentes niveles de stock
   - Prepara algunos clientes y proveedores

2. **Navegador en modo presentación**:
   - Presiona F11 para pantalla completa
   - Oculta la barra de direcciones si es posible

3. **Tener un backup**:
   - Guarda una copia del proyecto en USB
   - Ten un plan B si algo falla

4. **Prueba rápida antes de la demo**:
   - Abre la app 10 minutos antes
   - Verifica que todo carga correctamente
   - Haz una venta de prueba

---

## 📞 Contacto de Emergencia

Si algo falla durante la demo:
1. Mantén la calma
2. Tienes el código completo en el notebook
3. Puedes reiniciar los servidores rápidamente
4. La app funciona offline, así que no necesitas internet

---

## ✅ Resumen de Comandos Rápidos

```bash
# Iniciar Backend
cd backend
npm run dev

# Iniciar Frontend (en otra terminal)
npm run dev

# Verificar que todo funciona
npm run build
npm run type-check
```

---

**¡Buena suerte con la demostración! 🚀**

