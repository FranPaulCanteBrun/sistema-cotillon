# 📊 Estado Actual WSAA - Según Manual WSAA v1.2.2

## ✅ Correcciones Aplicadas

### 1. TRA (Ticket de Requerimiento de Acceso)

**Formato actual:**
```xml
<?xml version="1.0" encoding="UTF8"?>
<loginTicketRequest version="1.0">
  <header>
    <source>cn=pruebafacturacion</source>
    <destination>cn=wsaahomo,o=afip,c=ar,serialNumber=CUIT 33693450239</destination>
    <uniqueId>1767132989822</uniqueId>
    <generationTime>2025-12-30T19:16:29.718-03:00</generationTime>
    <expirationTime>2025-12-31T07:16:29.718-03:00</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>
```

**Verificaciones según manual:**
- ✅ Root: `<loginTicketRequest version="1.0">` (minúsculas)
- ✅ Tags: `<header>`, `<service>`, etc. en minúsculas
- ✅ Encoding: `UTF8` (no `UTF-8`)
- ✅ Fechas: Formato `xsd:dateTime` con timezone (`2025-12-30T19:16:29.718-03:00`)
- ✅ `destination`: DN exacto del WSAA según ambiente
- ✅ `service`: `wsfe` (minúsculas, < 35 caracteres)
- ✅ `source`: DN del certificado en minúsculas

## ❌ Error Persistente

**Error de WSAA:**
```xml
<faultcode>ns1:xml.bad</faultcode>
<faultstring>No se ha podido interpretar el XML contra el SCHEMA</faultstring>
```

## 🔍 Posibles Causas Restantes

Según el manual WSAA, el error `xml.bad` puede deberse a:

### 1. XML del TRA no valida contra el XSD
- ✅ Formato parece correcto
- ⚠️ Puede faltar algún campo requerido en el `source`
- ⚠️ Puede haber un problema con el formato del DN

### 2. Mensaje firmado (CMS) mal generado
- ⚠️ El CMS puede estar mal armado
- ⚠️ Puede necesitar `detached: true` en lugar de `false`
- ⚠️ Puede haber un problema con cómo incluimos el certificado

## 🔧 Próximos Pasos a Probar

### Opción 1: Verificar el `source` del TRA
El `source` actual es solo `cn=pruebafacturacion`. Puede que necesite más campos del DN del certificado, o un formato diferente.

### Opción 2: Probar con `detached: true` en el CMS
Cambiar de `detached: false` a `detached: true` en la firma CMS.

### Opción 3: Verificar el formato del certificado en el CMS
Asegurarse de que el certificado esté en el formato DER correcto dentro del CMS.

### Opción 4: Comparar con ejemplos oficiales
Buscar ejemplos oficiales de AFIP o la comunidad que muestren cómo construir el CMS correctamente.

## 📝 Notas

- El certificado está autorizado para `wsfe` (confirmado por usuario)
- El certificado es válido (X.509, clave privada correcta, no vencido)
- El TRA parece estar correcto según el manual
- El problema puede estar en el CMS o en algún detalle del TRA que no cumple con el XSD

## 📚 Referencias

- Manual WSAA v1.2.2 (Publicación 20.2.19)
- Manual ARCA: `manual-desarrollador-ARCA-COMPG-v4-1.pdf`
- Código actual: `backend/src/services/arca/ArcaTokenManager.ts`
