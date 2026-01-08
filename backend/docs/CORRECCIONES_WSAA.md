# 🔧 Correcciones Aplicadas según Manual WSAA v20.2.19

## ✅ Cambios Implementados

### 1. TRA (LoginTicketRequest.xml)

**ANTES:**
```xml
<?xml version="1.0" encoding="UTF8"?>
<loginTicketRequest version="1.0">
  <header>
    <source>cn=pruebafacturacion</source>
    <destination>cn=wsaahomo,o=afip,c=ar,serialNumber=CUIT 33693450239</destination>
    <uniqueId>...</uniqueId>
    <generationTime>...</generationTime>
    <expirationTime>...</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>
```

**DESPUÉS (según manual):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>...</uniqueId>
    <generationTime>...</generationTime>
    <expirationTime>...</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>
```

**Cambios:**
- ✅ **Eliminados `source` y `destination`** (son opcionales y el manual recomienda NO incluirlos)
- ✅ **Encoding cambiado a `UTF-8`** (como en el ejemplo del manual, no `UTF8`)
- ✅ **Clock-skew aplicado**: `generationTime = now - 60s` (según recomendación del manual)
- ✅ **Fechas en formato `xsd:dateTime`** con timezone GMT-3

### 2. CMS Firmado

**Verificaciones:**
- ✅ **NO detached** (`detached: false`) - según ejemplo del manual
- ✅ **Certificado incluido** en el CMS con `p7.addCertificate(certificate)`
- ✅ **Sin headers MIME** - node-forge genera directamente el CMS en Base64 sin headers MIME
- ✅ **Solo el CMS** se envía a `loginCms(in0)` - sin wrappers, sin doble base64

### 3. Logging y Debugging

**Implementado:**
- ✅ **Request logging**: Se guarda `request-loginCms-{timestamp}.xml` en `backend/logs/`
- ✅ **Response logging**: Se guarda `response-loginCms-{timestamp}.xml` en `backend/logs/`
- ✅ **Modo diagnóstico** en el endpoint `/api/fiscal/test/token` (preparado)

## 📋 Estado Actual

### TRA Generado (Correcto según manual):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>1767134185652</uniqueId>
    <generationTime>2025-12-30T19:35:25.651-03:00</generationTime>
    <expirationTime>2025-12-31T07:36:25.651-03:00</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>
```

### Error Persistente:
```xml
<faultcode>ns1:xml.bad</faultcode>
<faultstring>No se ha podido interpretar el XML contra el SCHEMA</faultstring>
```

## 🔍 Posibles Causas Restantes

Según el manual WSAA, si el TRA está correcto, el problema puede estar en:

1. **CMS mal generado**: Aunque el formato parece correcto, puede haber un detalle en cómo se construye el CMS
2. **Encoding del CMS**: Aunque el TRA usa UTF-8, el CMS puede tener un problema de encoding
3. **Formato del certificado en el CMS**: El certificado puede no estar en el formato DER correcto dentro del CMS

## 📝 Próximos Pasos

1. **Revisar los logs guardados** (`backend/logs/request-loginCms-*.xml`) para ver exactamente qué se está enviando
2. **Comparar el CMS** con ejemplos oficiales de AFIP
3. **Verificar si hay algún detalle** en el formato del CMS que no cumple con el schema de WSAA

## 📚 Referencias

- Manual WSAA v20.2.19 (Publicación 20.2.19)
- Código: `backend/src/services/arca/ArcaTokenManager.ts`
- Logs: `backend/logs/request-loginCms-*.xml` y `backend/logs/response-loginCms-*.xml`
