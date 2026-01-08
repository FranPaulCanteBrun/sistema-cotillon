# Pasos Rápidos para Probar WSFEv1

## ✅ Paso 1: Crear Usuario (si no tienes uno)

**Opción A: Ejecutar seed (recomendado)**

```bash
cd backend
npm run db:seed
```

Esto crea un usuario admin:
- **Email**: `admin@cotillon.local`
- **Password**: `admin123`

**Opción B: Registrar usuario nuevo**

```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "tu-email@test.com",
  "password": "tu-password",
  "name": "Tu Nombre"
}
```

> Nota: El primer usuario registrado será ADMIN automáticamente.

## ✅ Paso 2: Obtener JWT Interno

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@cotillon.local",
  "password": "admin123"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Guarda este token** - lo usarás en los siguientes pasos.

## ✅ Paso 3: Verificar Configuración (sin JWT)

```bash
GET http://localhost:3000/api/fiscal/test/config
```

Debería mostrar:
```json
{
  "fiscalEnabled": true,
  "config": {
    "env": "homo",
    "hasCuit": true,
    "cuit": "20-39285369-4",
    "hasCert": true,
    "hasPassword": true,
    "hasPtoVta": false,
    "ptoVta": null
  }
}
```

## ✅ Paso 4: Probar Obtención de TA (requiere JWT)

```bash
GET http://localhost:3000/api/fiscal/test/token
Authorization: Bearer <JWT_OBTENIDO_EN_PASO_2>
```

**Posibles respuestas:**

### ✅ Si obtiene TA exitosamente:
```json
{
  "success": true,
  "message": "TA WSAA obtenido exitosamente desde WSAA",
  "data": {
    "source": "wsaa",
    "fromCache": false
  },
  "cache": {
    "hasCache": true,
    "expirationTime": "2025-12-31T12:00:00.000Z"
  }
}
```

### ⚠️ Si WSAA dice "alreadyAuthenticated":
```json
{
  "error": true,
  "message": "WSAA ya tiene un TA válido para este servicio, pero no está almacenado localmente..."
}
```

**Esto NO es un error crítico.** Significa:
- ✅ El TRA, SOAP y CMS están correctos
- ✅ WSAA procesó el request exitosamente
- ⚠️ WSAA tiene un TA válido pero no está en nuestro cache/DB

**Solución:** Continuar con el siguiente paso. El sistema intentará usar el cache/DB primero.

## ✅ Paso 5: Health-Check WSFE (requiere JWT)

```bash
GET http://localhost:3000/api/fiscal/test/wsfe
Authorization: Bearer <JWT_OBTENIDO_EN_PASO_2>
```

**Esto debería:**
- Mostrar estado del TA
- Listar puntos de venta habilitados
- Listar tipos de comprobante
- Validar si el punto de venta configurado existe

**Respuesta esperada:**
```json
{
  "success": true,
  "ta": {
    "hasCache": true,
    "expirationTime": "2025-12-31T12:00:00.000Z",
    "source": "DB/memory"
  },
  "ptosVenta": {
    "count": 1,
    "list": [
      {
        "numero": 1,
        "emisionTipo": "CAE",
        "bloqueado": "N"
      }
    ],
    "configured": null,
    "configuredExists": false,
    "warning": "⚠️ No hay punto de venta configurado..."
  },
  "tiposCbte": {
    "count": 20,
    "list": [ ... ]
  }
}
```

## ✅ Paso 6: Configurar Punto de Venta

Si el health-check muestra que no hay punto de venta configurado:

1. Ver la lista completa:
   ```bash
   GET http://localhost:3000/api/fiscal/wsfe/ptos-venta
   Authorization: Bearer <JWT>
   ```

2. Agregar a `.env`:
   ```env
   AFIP_PTO_VTA=1
   ```

3. Reiniciar el servidor:
   ```bash
   # Detener (Ctrl+C)
   npm run dev
   ```

4. Probar de nuevo el health-check - debería mostrar `"configuredExists": true`

## 📝 Sobre el TA de WSAA

**No necesitas esperar 12 horas.** El sistema:

1. **Intenta usar cache/DB primero** - Si hay un TA vigente, lo usa
2. **Si no hay cache, solicita a WSAA** - Se obtiene automáticamente
3. **Si WSAA dice "alreadyAuthenticated"** - Significa que ya hay un TA válido en WSAA, pero no está en nuestro cache/DB (se guardará cuando se obtenga uno nuevo)

**El TA se guarda automáticamente en DB** cuando se obtiene uno nuevo, así que después del primer reinicio, se cargará desde DB.

## 🎯 Checklist

- [ ] Usuario creado (seed o registro)
- [ ] JWT obtenido con login
- [ ] `/api/fiscal/test/config` muestra configuración completa
- [ ] `/api/fiscal/test/token` obtiene o detecta TA
- [ ] `/api/fiscal/test/wsfe` muestra puntos de venta
- [ ] Punto de venta configurado en `.env`
- [ ] Health-check muestra `"configuredExists": true`
