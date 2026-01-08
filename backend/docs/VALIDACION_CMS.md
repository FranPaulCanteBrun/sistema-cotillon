# 🔍 Validación del CMS según Manual WSAA v20.2.19

## 📋 Requisitos del CMS para `loginCms(in0)`

Según el manual WSAA, el parámetro `in0` de `loginCms` debe contener:

### ✅ Formato Correcto

1. **SOLO Base64 puro**
   - Caracteres permitidos: `[A-Za-z0-9+/=]`
   - Saltos de línea opcionales (pero se recomienda removerlos)

2. **Sin headers MIME**
   - NO debe incluir `Content-Type: multipart/signed`
   - NO debe incluir `MIME-Version: 1.0`
   - NO debe incluir `Content-Transfer-Encoding: base64`

3. **Sin marcadores**
   - NO debe incluir `-----BEGIN CMS-----`
   - NO debe incluir `-----END CMS-----`

4. **NO detached**
   - El CMS debe incluir el contenido (TRA) dentro del CMS
   - Equivalente a `!PKCS7_DETACHED` en OpenSSL

### ❌ Formatos Incorrectos

**Ejemplo INCORRECTO (con headers MIME):**
```
Content-Type: multipart/signed; protocol="application/x-pkcs7-signature"; micalg=sha-256; boundary="----=_Part_0_123456"
MIME-Version: 1.0

------=_Part_0_123456
MIIG...
------=_Part_0_123456--
```

**Ejemplo INCORRECTO (con marcadores):**
```
-----BEGIN CMS-----
MIIG...
-----END CMS-----
```

**Ejemplo CORRECTO (solo Base64):**
```
MIIGpQIBAzCCCl4GCSqGSIb3DQEHAaCCCk8EggpLMIIKRzCCBXc...
```

## 🔍 Validaciones Implementadas

### 1. Limpieza del CMS

El código ahora:
- Remueve cualquier header MIME que pueda estar presente
- Remueve marcadores BEGIN/END CMS
- Remueve saltos de línea para obtener Base64 puro
- Valida que solo contenga caracteres Base64 válidos

### 2. Logging de Diagnóstico

Se registra:
- Longitud total del CMS
- Primeros 80 caracteres
- Últimos 80 caracteres
- Validación de headers MIME (debe ser NO)
- Validación de marcadores BEGIN/END (debe ser NO)
- Validación de formato Base64 (debe ser SÍ)

### 3. Validación en el SOAP Request

Se verifica que el contenido de `<in0>` en el SOAP:
- No contenga headers MIME
- No contenga marcadores BEGIN/END
- Sea solo Base64 puro

## 📝 Comparación con CMS de Referencia

Se creó un script `backend/scripts/generate-cms-reference.sh` que genera un CMS de referencia usando OpenSSL, siguiendo exactamente el método del manual:

1. Genera CMS con `openssl cms -sign -nodetach`
2. Remueve las primeras 4 líneas (headers MIME)
3. Remueve marcadores BEGIN/END CMS
4. Remueve saltos de línea

Este CMS de referencia se puede comparar byte-a-byte con el generado por node-forge.

## 🎯 Criterios de Éxito

El CMS es válido cuando:
- ✅ Longitud > 1000 caracteres (CMS típico tiene ~2000-3000)
- ✅ Empieza con `MII` (típico de Base64 DER)
- ✅ NO contiene headers MIME
- ✅ NO contiene marcadores BEGIN/END
- ✅ Solo contiene caracteres Base64 válidos
- ✅ `loginCms` devuelve `loginTicketResponse` con `token` y `sign`

## 📚 Referencias

- WSAA Manual del Desarrollador (Pub. 20.2.19)
- Sección: "Generación del CMS" y "Parámetro in0 de loginCms"
- Código: `backend/src/services/arca/ArcaTokenManager.ts` (método `signTRA`)
