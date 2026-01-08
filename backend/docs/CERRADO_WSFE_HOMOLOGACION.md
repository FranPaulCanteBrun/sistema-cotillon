# Cierre de Integración WSFEv1 (Homologación)

## ✅ Tareas Completadas

### 1. Normalización de CUIT
- ✅ CUIT normalizado a solo dígitos (sin guiones) en `env.ts` con `.transform()`
- ✅ Validación adicional en `buildSoapRequest()` para asegurar 11 dígitos
- ✅ Normalización en `callSoapMethod()` antes de construir el SOAP request
- ✅ CUIT se mantiene con guiones solo para UI/logs (formato legible)

### 2. Persistencia del TA de WSAA
- ✅ Modelo Prisma `FiscalTokenCache` ya implementado con:
  - `env` (homo/prod)
  - `cuit`
  - `service` (wsfe)
  - `token`, `sign`, `expirationTime`
  - `obtainedAt`, `updatedAt`
- ✅ Carga automática desde DB al iniciar servidor (`loadTokenFromDB()`)
- ✅ Manejo correcto de `coe.alreadyAuthenticated`:
  - Si hay TA en DB/memoria, se usa
  - No se reintenta WSAA innecesariamente

### 3. Health-check WSFE como diagnóstico real
- ✅ Endpoint `/api/fiscal/test/wsfe` mejorado con:
  - `success` (true/false) para cada método
  - `errors` (array completo) siempre presente
  - `events` (observaciones) siempre presente
  - `rawData` para diagnóstico completo
  - `diagnostic` con mensajes accionables
  - `configuredExists` para validar punto de venta
  - `timings` para cada llamada WSFE

### 4. Diagnóstico específico de Punto de Venta
- ✅ Detección de error 11002 ("PV no impactado")
- ✅ Mensajes claros sobre propagación desde ARCA a WSFE
- ✅ Validación: `hasPtoVta=true` solo si aparece en `FEParamGetPtosVenta`
- ✅ `diagnostic` con código de error y acción recomendada

### 5. Validación de parseo
- ✅ Parsing mejorado para extraer `ResultGet` de diferentes estructuras XML
- ✅ Extracción robusta de `Errors` y `Events` (array o objeto único)
- ✅ Logging completo de SOAP request/response en `backend/logs/`
- ✅ Errores WSFE siempre visibles en el JSON (no silenciosos)

## 📋 Estructura de Respuesta del Health-Check

```json
{
  "success": true/false,
  "message": "WSFEv1 health-check exitoso",
  "ta": {
    "hasCache": true,
    "expirationTime": "2025-12-31T09:33:37.502Z",
    "obtainedAt": "2025-12-30T21:32:37.502Z",
    "isValid": true,
    "source": "DB/memory",
    "expiresInMinutes": 678
  },
  "ptosVenta": {
    "success": true,
    "count": 1,
    "list": [
      {
        "numero": 1,
        "emisionTipo": "CAE",
        "bloqueado": "N"
      }
    ],
    "configured": 1,
    "configuredExists": true,
    "errors": [],
    "events": [],
    "rawData": { ... },
    "diagnostic": null,
    "warning": null
  },
  "tiposCbte": {
    "success": true,
    "count": 20,
    "list": [ ... ],
    "errors": [],
    "events": [],
    "rawData": { ... },
    "diagnostic": null
  },
  "environment": "homo",
  "cuit": "20-39285369-4",
  "cuitNormalized": "20392853694",
  "timings": {
    "ptosVentaMs": 607,
    "tiposCbteMs": 523
  }
}
```

## 🔍 Logs de SOAP

Todos los requests y responses SOAP se guardan en:
- `backend/logs/wsfe-{method}-request-{timestamp}.xml` (sanitizado, sin token/sign)
- `backend/logs/wsfe-{method}-response-{timestamp}.xml` (completo)

## ⚠️ Errores Comunes y Diagnóstico

### Error 11002: "Punto de venta no impactado"
- **Causa**: El punto de venta fue creado en ARCA pero aún no se propagó a WSFE
- **Solución**: Esperar propagación (puede tardar horas)
- **Diagnóstico**: Aparece en `ptosVenta.diagnostic` con código y mensaje

### Lista vacía sin errores
- **Causa**: Problema de parsing del XML response
- **Solución**: Revisar logs en `backend/logs/` para ver estructura real del XML
- **Diagnóstico**: Aparece en `diagnostic` con mensaje y acción

## ✅ Criterios de Éxito

- ✅ `/api/fiscal/test/wsfe` devuelve:
  - `tiposCbte.count > 0`
  - `ptosVenta.count > 0` cuando el PV impacte
  - `configuredExists=true` para el ptoVta configurado
- ✅ Errores WSFE aparecen explícitos en el JSON (no "count: 0" silencioso)
- ✅ TA sobrevive a reinicios del backend (persistencia en DB)

## 🚀 Próximos Pasos

1. **Probar health-check**:
   ```bash
   GET /api/fiscal/test/wsfe
   Authorization: Bearer <JWT>
   ```

2. **Verificar logs SOAP**:
   - Revisar `backend/logs/wsfe-*-request-*.xml`
   - Revisar `backend/logs/wsfe-*-response-*.xml`

3. **Si el punto de venta no aparece**:
   - Verificar error 11002 en `ptosVenta.errors`
   - Esperar propagación desde ARCA a WSFE
   - Verificar en ARCA que el punto de venta esté habilitado

4. **Preparar para emisión**:
   - Una vez que `ptosVenta.count > 0` y `tiposCbte.count > 0`
   - Implementar `FECAESolicitar` para emitir comprobantes
