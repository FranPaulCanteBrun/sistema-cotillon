# Guía: Pruebas de WSFEv1

## ⚠️ Importante: Dos Tokens Diferentes

### 1. JWT Interno (Autenticación en la App)
- **Para qué**: Autenticarte en el backend de la app
- **Cómo obtenerlo**: `POST /api/auth/login` con email y password
- **Dónde usarlo**: En el header `Authorization: Bearer <JWT>` de todas las requests
- **Expiración**: Configurado en el backend (típicamente horas/días)

### 2. TA de WSAA (Ticket de Acceso)
- **Para qué**: Autenticarte en WSFEv1 (AFIP) para facturación electrónica
- **Cómo obtenerlo**: Se obtiene automáticamente cuando se necesita
- **Dónde se usa**: Internamente en `ArcaTokenManager` y `ArcaWsfeClient`
- **Expiración**: ~12 horas (según AFIP)

## 🚀 Pasos para Probar

### Paso 1: Obtener JWT Interno

**Opción A: Si ya tienes un usuario creado**

```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "tu-email@ejemplo.com",
  "password": "tu-password"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Opción B: Si NO tienes usuario, crear uno**

1. Ejecutar seed (si existe):
   ```bash
   cd backend
   npm run db:seed
   ```

2. O crear usuario manualmente en la DB:
   ```sql
   INSERT INTO users (id, email, password_hash, name, role, is_active)
   VALUES (
     gen_random_uuid(),
     'admin@test.com',
     '$2a$10$...', -- hash de bcrypt de tu password
     'Admin Test',
     'ADMIN',
     true
   );
   ```

3. O usar el endpoint de registro (si existe)

### Paso 2: Probar Endpoint de Configuración (sin JWT)

```bash
GET http://localhost:3000/api/fiscal/test/config
```

Esto verifica que las variables de entorno estén correctas.

### Paso 3: Probar Obtención de TA (requiere JWT)

```bash
GET http://localhost:3000/api/fiscal/test/token
Authorization: Bearer <JWT_OBTENIDO_EN_PASO_1>
```

**Respuesta esperada:**
- Si WSAA responde "alreadyAuthenticated": significa que WSAA tiene un TA válido pero no está en nuestro cache/DB
- Si obtiene TA exitosamente: se guardará en DB automáticamente

### Paso 4: Probar Health-Check WSFE (requiere JWT)

```bash
GET http://localhost:3000/api/fiscal/test/wsfe
Authorization: Bearer <JWT_OBTENIDO_EN_PASO_1>
```

**Esto debería:**
- Mostrar estado del TA (cache/DB o recién obtenido)
- Listar puntos de venta habilitados
- Listar tipos de comprobante
- Validar si el punto de venta configurado existe

### Paso 5: Listar Puntos de Venta (requiere JWT)

```bash
GET http://localhost:3000/api/fiscal/wsfe/ptos-venta
Authorization: Bearer <JWT_OBTENIDO_EN_PASO_1>
```

Esto te mostrará todos los puntos de venta habilitados y cuál está configurado.

## 🔧 Si WSAA Responde "alreadyAuthenticated"

**No es un error crítico.** Significa:
- ✅ El TRA, SOAP y CMS están correctos
- ✅ WSAA procesó el request exitosamente
- ⚠️ WSAA ya tiene un TA válido para este servicio

**Opciones:**
1. **Esperar a que expire** (típicamente 12 horas)
2. **Usar el TA existente** si lo tienes guardado
3. **Continuar con las pruebas** - el sistema intentará usar el cache/DB primero

## 📝 Configuración de Punto de Venta

Si el health-check muestra que no hay punto de venta configurado:

1. Ver la lista de puntos disponibles: `GET /api/fiscal/wsfe/ptos-venta`
2. Agregar a `.env`:
   ```env
   AFIP_PTO_VTA=1
   ```
3. Reiniciar el servidor

## ✅ Checklist de Pruebas

- [ ] JWT interno obtenido exitosamente
- [ ] `/api/fiscal/test/config` muestra configuración completa
- [ ] `/api/fiscal/test/token` obtiene o detecta TA
- [ ] `/api/fiscal/test/wsfe` muestra puntos de venta y tipos de comprobante
- [ ] Punto de venta configurado y validado

## 🐛 Troubleshooting

**Error: "Facturación electrónica no está configurada"**
- Verificar que todas las variables `AFIP_*` estén en `.env`

**Error: "Invalid token" o 401**
- Verificar que el JWT sea válido y no haya expirado
- Obtener un nuevo JWT con `POST /api/auth/login`

**Error: "WSAA ya tiene un TA válido"**
- No es crítico, el sistema intentará usar el cache/DB
- Si persiste, esperar a que expire el TA en WSAA
