# 🔍 Error WSAA: "No se ha podido interpretar el XML contra el SCHEMA"

## 📋 Estado Actual

**Error de WSAA:**
```xml
<faultcode>ns1:xml.bad</faultcode>
<faultstring>No se ha podido interpretar el XML contra el SCHEMA</faultstring>
```

**Progreso:**
1. ✅ URL de WSAA corregida
2. ✅ Certificado validado (X.509, clave privada correcta, no vencido)
3. ✅ Certificado autorizado para `wsfe` (confirmado por usuario)
4. ✅ TRA generado correctamente
5. ✅ CMS firmado (2376 caracteres, incluye certificado)
6. ❌ WSAA rechaza el CMS por formato incorrecto

## 🔍 Análisis del Problema

El error "No se ha podido interpretar el XML contra el SCHEMA" indica que:
- El CMS está llegando a WSAA (no es error de conexión)
- El certificado está incluido (el CMS es más grande que antes)
- Pero el formato del CMS no cumple con el schema que WSAA espera

## 📚 Posibles Causas (según manual ARCA)

### 1. Formato del CMS (PKCS#7)

WSAA espera un CMS en formato PKCS#7 SignedData con:
- Contenido (TRA) incluido o referenciado
- Firma digital con atributos autenticados
- Certificado del firmador incluido

**Estado actual:**
- ✅ Usamos `forge.pkcs7.createSignedData()`
- ✅ Incluimos el certificado con `p7.addCertificate(certificate)`
- ✅ Usamos `detached: false` (incluye contenido)
- ✅ Atributos autenticados: contentType, messageDigest, signingTime

### 2. Orden de los Elementos en el CMS

El orden puede ser importante. Actualmente:
1. Agregamos certificado
2. Agregamos signer con atributos
3. Firmamos

### 3. Formato del Contenido (TRA)

El TRA debe estar en UTF-8 y bien formado. Actualmente:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <source>CN=pruebafacturacion</source>
    <destination>CN=pruebafacturacion</destination>
    <uniqueId>1767132418257</uniqueId>
    <generationTime>20251230190658</generationTime>
    <expirationTime>20251231070658</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>
```

### 4. Escape del XML en el SOAP

El CMS (Base64) debe estar correctamente escapado en el SOAP request.

## 🔧 Próximos Pasos a Probar

### Opción 1: Usar `detached: true` en lugar de `false`

WSAA puede esperar un CMS "detached" donde el contenido no está incluido en el CMS, sino que se envía por separado o se referencia.

### Opción 2: Verificar el Algoritmo de Digest

Asegurarse de que estamos usando SHA-256 correctamente y que el messageDigest está en el formato correcto.

### Opción 3: Revisar el Manual ARCA Completo

Buscar en el manual ARCA (`manual-desarrollador-ARCA-COMPG-v4-1.pdf`) la sección específica sobre WSAA y el formato del CMS.

### Opción 4: Comparar con Ejemplos Oficiales

Buscar ejemplos oficiales de AFIP o la comunidad que muestren cómo construir el CMS correctamente.

### Opción 5: Verificar el Certificado en el CMS

Asegurarse de que el certificado esté en el formato DER correcto dentro del CMS.

## 📝 Logs Actuales

```
📋 DN del certificado extraído: CN=pruebafacturacion
📝 TRA generado completo: [XML válido]
✅ TRA firmado correctamente. Longitud del CMS: 2376
📤 URL: https://wsaahomo.afip.gov.ar/ws/services/LoginCms
```

## 🎯 Recomendación

1. **Revisar el manual ARCA completo** para encontrar la especificación exacta del formato CMS
2. **Buscar ejemplos de código** que funcionen con WSAA y node-forge
3. **Probar con `detached: true`** si el manual lo especifica
4. **Verificar si hay alguna herramienta de AFIP** para generar el CMS correctamente y comparar

## 📚 Referencias

- Manual ARCA: `manual-desarrollador-ARCA-COMPG-v4-1.pdf`
- Código actual: `backend/src/services/arca/ArcaTokenManager.ts` (líneas 301-337)
- Script de prueba: `backend/scripts/test-wsaa-token.ts`
