# Resumen: Implementación WSFEv1 - Health Check

## ✅ Cambios Implementados

### 1. Persistencia del TA en DB

**Modelo Prisma `FiscalTokenCache`:**
- Almacena TA (Token + Sign) de WSAA
- Constraint único: `(env, cuit, service)`
- Campos: `env`, `cuit`, `service`, `token`, `sign`, `expirationTime`, `obtainedAt`

**ArcaTokenManager:**
- Carga TA desde DB al iniciar (si existe y está vigente)
- Guarda TA en DB automáticamente cuando se obtiene uno nuevo
- `invalidateCache()` ahora también elimina de DB

### 2. Cliente WSFEv1 (`ArcaWsfeClient`)

**Implementado:**
- SOAP 1.1 con namespaces correctos
- Autenticación automática (Token, Sign, Cuit desde TokenManager)
- Métodos implementados:
  - `FEParamGetPtosVenta()` - Obtener puntos de venta habilitados
  - `FEParamGetTiposCbte()` - Obtener tipos de comprobante
  - `FECompUltimoAutorizado()` - Obtener último comprobante autorizado

**Endpoints WSFEv1:**
- Homologación: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx`
- Producción: `https://servicios1.afip.gov.ar/wsfev1/service.asmx`

### 3. Endpoints de Prueba

**GET `/api/fiscal/test/wsfe`** (requiere autenticación):
- Muestra estado del TA (cache, expiración, fuente)
- Llama `FEParamGetPtosVenta` y muestra lista
- Llama `FEParamGetTiposCbte` y muestra lista
- Valida si el punto de venta configurado existe
- Muestra advertencias si falta configuración

**GET `/api/fiscal/wsfe/ptos-venta`** (requiere autenticación):
- Lista todos los puntos de venta habilitados
- Indica cuál está configurado
- Recomienda qué punto usar si no hay uno configurado

## 🔧 Próximos Pasos

### 1. Ejecutar Migración de DB

**IMPORTANTE:** Detener el servidor antes de ejecutar:

```bash
cd backend
npx prisma db push
```

Esto creará la tabla `fiscal_token_cache` en PostgreSQL.

### 2. Configurar Punto de Venta

Si tienes el punto de venta 1 habilitado, agregar a `.env`:

```env
AFIP_PTO_VTA=1
```

### 3. Probar Health-Check

```bash
# Obtener JWT (si no lo tienes)
POST /api/auth/login

# Health-check WSFE
GET /api/fiscal/test/wsfe
Authorization: Bearer <JWT>
```

**Respuesta esperada:**
- `ta.hasCache: true` (si hay TA en DB)
- `ptosVenta.list` con al menos el punto 1
- `ptosVenta.configuredExists: true` (si configuraste AFIP_PTO_VTA=1)
- `tiposCbte.list` con tipos de comprobante disponibles

### 4. Validar Punto de Venta

```bash
GET /api/fiscal/wsfe/ptos-venta
Authorization: Bearer <JWT>
```

Debería mostrar el punto de venta 1 en la lista.

## 📝 Notas

- El TA se carga automáticamente desde DB al iniciar el servidor
- Si el TA expira, se renueva automáticamente y se guarda en DB
- Los logs nunca exponen el token/sign completo
- El cliente WSFEv1 maneja errores y los devuelve en formato estructurado

## 🐛 Troubleshooting

**Error: "Property 'fiscalTokenCache' does not exist":**
- Ejecutar `npx prisma generate` después de `npx prisma db push`

**Error: "EPERM: operation not permitted":**
- Detener el servidor antes de ejecutar Prisma

**Error: "WSFEv1 respondió con status 500":**
- Verificar que el TA esté vigente
- Verificar que el certificado esté autorizado para WSFE
- Verificar que el CUIT sea correcto
