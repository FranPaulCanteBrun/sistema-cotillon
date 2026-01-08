# Solución: Error 500 "Campo Auth no fue ingresado o está mal formado"

## ❌ Error Encontrado

```
Code 500: "Campo Auth no fue ingresado o está mal formado."
```

Este error indica que WSFEv1 no está recibiendo el bloque `Auth` correctamente formado en el request SOAP.

## 🔍 Diagnóstico

### Causas Comunes

1. **Auth no está dentro del método**: El bloque `Auth` debe estar dentro del elemento del método (ej: `<ar:FEParamGetPtosVenta>`)
2. **Casing incorrecto**: Los nombres deben ser exactos: `Auth`, `Token`, `Sign`, `Cuit` (no `auth`, `TOKEN`, `CUIT`)
3. **Namespace incorrecto**: Los elementos deben heredar el namespace del método padre (`ar:`)
4. **Estructura incorrecta**: `Auth` debe contener `Token`, `Sign`, `Cuit` como hijos directos

## ✅ Solución Aplicada

### 1. Estructura Correcta del XML

El XML debe verse así:

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soap:Body>
    <ar:FEParamGetPtosVenta>
      <Auth>
        <Token>...</Token>
        <Sign>...</Sign>
        <Cuit>20392853694</Cuit>
      </Auth>
    </ar:FEParamGetPtosVenta>
  </soap:Body>
</soap:Envelope>
```

### 2. Correcciones en el Código

1. **Estructura del objeto para XMLBuilder**:
   ```typescript
   const methodContent = {
     Auth: {
       Token: auth.Token,
       Sign: auth.Sign,
       Cuit: auth.Cuit
     },
     ...methodParams
   }
   ```

2. **Namespace heredado**: El namespace `ar:` se declara en el elemento del método y se hereda a `Auth` y sus hijos.

3. **Validación previa al envío**: Se valida que el XML generado contenga `Auth`, `Token`, `Sign`, y `Cuit` antes de enviarlo.

4. **Logging mejorado**: Se loguea el fragmento del método para diagnóstico.

### 3. Diagnóstico Automático

Cuando se detecta el error 500 relacionado con Auth, se agrega información de diagnóstico:

```json
{
  "code": 500,
  "msg": "Campo Auth no fue ingresado o está mal formado.",
  "diagnostic": {
    "requestHasAuth": true,
    "requestHasToken": true,
    "requestHasSign": true,
    "requestHasCuit": true,
    "message": "WSFE no reconoce el bloque Auth. Verificar estructura XML del request en logs."
  }
}
```

## 📋 Checklist de Verificación

- ✅ `Auth` está dentro del método (no en headers SOAP)
- ✅ Tags son exactos: `Auth`, `Token`, `Sign`, `Cuit` (mismo casing)
- ✅ `Cuit` es string de 11 dígitos (sin guiones)
- ✅ Namespace `ar:` está declarado en el método
- ✅ `Auth` hereda el namespace del método padre
- ✅ No se usa `token/sign` en minúscula
- ✅ No se usa `CUIT` en mayúsculas
- ✅ No se envuelve en `authRequest` ni "params"

## 🔧 Próximos Pasos

1. **Probar el health-check**:
   ```bash
   GET /api/fiscal/test/wsfe
   Authorization: Bearer <JWT>
   ```

2. **Revisar logs**:
   - `backend/logs/wsfe-*-request-*.xml` (sanitizado)
   - Verificar que el XML tenga la estructura correcta

3. **Si el error persiste**:
   - Revisar el XML completo en los logs
   - Verificar que el namespace esté correctamente aplicado
   - Confirmar que `fast-xml-parser` esté generando el XML correctamente

## 📝 Notas Técnicas

- `fast-xml-parser` hereda el namespace del elemento padre
- No es necesario usar `ar:Auth`, solo `Auth` dentro de `<ar:FEParamGetPtosVenta>`
- El XMLBuilder debe generar el XML con la estructura exacta que WSFEv1 espera
