# Corrección: Namespace y SOAPAction de WSFEv1

## ❌ Error Encontrado

```
Server did not recognize the value of HTTP Header SOAPAction: http://ar.gov.afip.difin.fev1.difin/FEParamGetPtosVenta
```

## ✅ Solución

### 1. Namespace Incorrecto

**ANTES (incorrecto):**
```typescript
'@_xmlns:ar': 'http://ar.gov.afip.difin.fev1.difin'
```

**DESPUÉS (correcto):**
```typescript
'@_xmlns:ar': 'http://ar.gov.afip.dif.FEV1/'
```

### 2. SOAPAction Header

**ANTES (incorrecto):**
```typescript
'SOAPAction': `http://ar.gov.afip.difin.fev1.difin/${method}`
```

**DESPUÉS (correcto):**
```typescript
'SOAPAction': `"http://ar.gov.afip.dif.FEV1/${method}"`
```

**Nota:** El SOAPAction debe estar entre comillas dobles según la especificación SOAP 1.1.

## 📋 Verificación del WSDL

Al consultar el WSDL de WSFEv1:
```bash
curl "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
```

Se confirma:
- `targetNamespace="http://ar.gov.afip.dif.FEV1/"`
- `soapAction="http://ar.gov.afip.dif.FEV1/FEParamGetPtosVenta"`

## 🔧 Cambios Aplicados

1. **Namespace en XML**: Corregido a `http://ar.gov.afip.dif.FEV1/`
2. **SOAPAction header**: Corregido a `"http://ar.gov.afip.dif.FEV1/${method}"` (con comillas)
3. **Logging mejorado**: Se muestra el SOAPAction y el SOAP body sanitizado

## ✅ Prueba

Después de estos cambios, el health-check debería funcionar correctamente:

```bash
GET /api/fiscal/test/wsfe
Authorization: Bearer <JWT>
```

Debería devolver:
- Status 200
- Lista de puntos de venta
- Lista de tipos de comprobante
