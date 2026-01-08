# Corrección: Auth con Namespace Explícito y Eliminación de Nodos Extra

## ❌ Problema Identificado

El request SOAP incluía:
1. **Nodos extra `<token>` y `<sign>` en minúscula fuera de `Auth`**
2. **`Auth` sin prefijo de namespace** (debería ser `ar:Auth`)
3. **Sanitización que vaciaba los tags** en lugar de reemplazar contenido

## ✅ Correcciones Aplicadas

### 1. Auth con Namespace Explícito

**ANTES:**
```xml
<ar:FEParamGetPtosVenta>
  <Auth>
    <Token>...</Token>
    <Sign>...</Sign>
    <Cuit>20392853694</Cuit>
  </Auth>
  <token>...</token>  <!-- ❌ Nodo extra inválido -->
  <sign>...</sign>    <!-- ❌ Nodo extra inválido -->
</ar:FEParamGetPtosVenta>
```

**DESPUÉS:**
```xml
<ar:FEParamGetPtosVenta xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <ar:Auth>
    <ar:Token>...</ar:Token>
    <ar:Sign>...</ar:Sign>
    <ar:Cuit>20392853694</ar:Cuit>
  </ar:Auth>
</ar:FEParamGetPtosVenta>
```

### 2. Eliminación de Nodos Extra

- Filtrado mejorado en `buildSoapRequest()` para eliminar `token`, `sign`, `cuit` en cualquier casing
- `callSoapMethod()` ahora solo pasa `Token`, `Sign`, `Cuit` en mayúscula (no `token`/`sign` en minúscula)

### 3. Sanitización Corregida

**ANTES:**
```typescript
.replace(/<Token>.*?<\/Token>/g, '<Token>***</Token>')
// Resultado: <Token></Token> (vacío)
```

**DESPUÉS:**
```typescript
.replace(/<ar:Token>.*?<\/ar:Token>/g, '<ar:Token>***</ar:Token>')
.replace(/<Token>.*?<\/Token>/g, '<Token>***</Token>')
// Resultado: <ar:Token>***</ar:Token> (contenido preservado)
```

### 4. Validación Mejorada

- Validación de nodos inválidos (`<token>`, `<sign>`) fuera de `Auth`
- Logging que muestra advertencias si se detectan nodos inválidos
- Error explícito si se detectan nodos inválidos antes de enviar

## 📋 Estructura Correcta del XML

Para métodos de parámetros (`FEParamGetPtosVenta`, `FEParamGetTiposCbte`):

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ar:FEParamGetPtosVenta xmlns:ar="http://ar.gov.afip.dif.FEV1/">
      <ar:Auth>
        <ar:Token>...</ar:Token>
        <ar:Sign>...</ar:Sign>
        <ar:Cuit>20392853694</ar:Cuit>
      </ar:Auth>
    </ar:FEParamGetPtosVenta>
  </soap:Body>
</soap:Envelope>
```

## ✅ Criterios de Éxito

- ✅ `FEParamGetTiposCbte` devuelve `count > 0`
- ✅ `FEParamGetPtosVenta` deja de devolver error 500 "Auth mal formado"
- ✅ No existen nodos `<token>` o `<sign>` fuera de `Auth` en los logs
- ✅ `Auth` tiene prefijo `ar:` explícito
