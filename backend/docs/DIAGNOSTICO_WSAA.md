# 🔍 Diagnóstico WSAA - Según Manual ARCA

## 📋 Problema Identificado

El certificado de prueba **NO tiene el CUIT en el Subject** (campo SERIALNUMBER). Esto puede causar errores 500 en WSAA.

## ✅ Correcciones Aplicadas

### 1. URL de WSAA Corregida

**ANTES (INCORRECTO):**
```typescript
homo: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'  // ❌ Esta es la URL de WSFEv1, NO de WSAA
```

**DESPUÉS (CORRECTO):**
```typescript
homo: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms'  // ✅ URL correcta de WSAA
```

**IMPORTANTE**: WSAA y WSFEv1 son servicios **DIFERENTES**:
- **WSAA** = Web Service de Autenticación y Autorización (obtener Token + Sign)
- **WSFEv1** = Web Service de Facturación Electrónica (usar Token + Sign para emitir comprobantes)

### 2. Validación del Certificado

Se creó un script de prueba (`backend/scripts/test-certificate.ts`) que valida:

✅ Certificado es X.509  
✅ Clave privada corresponde al certificado  
✅ Certificado NO está vencido  
⚠️ **CUIT no encontrado en Subject** (normal para certificados de prueba)  
⚠️ **Verificar manualmente**: Certificado asociado a "Facturación Electrónica"

### 3. Logging Mejorado

Ahora se muestra:
- TRA completo generado
- DN del certificado extraído
- SOAP request (sin CMS completo para no saturar)
- Respuesta completa de WSAA en caso de error

## 🚨 Problema Crítico Encontrado

### Certificado sin CUIT en Subject

El certificado de prueba tiene:
- **CN**: `pruebafacturacion`
- **SERIALNUMBER (CUIT)**: **NO ENCONTRADO**

Esto es **normal para certificados de prueba en homologación**, pero puede causar problemas si:
1. El certificado no está asociado al servicio "Facturación Electrónica" en AFIP
2. El CUIT del certificado no coincide con el CUIT configurado en `.env`

## 📖 Según el Manual ARCA

### Regla de Oro (antes de empezar)

> **Nunca debuguees WSFE si WSAA no está 100% confirmado.**  
> El 80% de los errores 500 "misteriosos" vienen de WSAA mal hecho.

### WSAA - Autenticación (el 50% de los errores)

**Verificar TODO esto:**

- ✅ El certificado es X.509
- ✅ La clave privada corresponde al certificado
- ✅ NO está vencido
- ⚠️ Fue generado para Web Services
- ⚠️ **Está asociado al servicio "Facturación Electrónica"** ← **CRÍTICO**
- ⚠️ El CUIT del certificado es el mismo CUIT que vas a usar en WSFE

> **Si el certificado no está asociado al servicio: WSAA puede devolver algo "válido" pero WSFE responde 500 siempre.**

## 🔧 Próximos Pasos

### 1. Verificar en AFIP

1. Ingresa a [AFIP - Web Services](https://www.afip.gob.ar/ws/)
2. Verifica que el certificado esté **asociado al servicio "Facturación Electrónica"**
3. Si no está asociado, asócialo desde el panel de AFIP

### 2. Probar Obtención de Token

```bash
# 1. Reinicia el servidor
cd backend
npm run dev

# 2. En Postman o similar:
GET http://localhost:3000/api/fiscal/test/token
Authorization: Bearer TU_TOKEN_JWT
```

### 3. Revisar Logs

Busca en los logs del servidor:
- `📝 TRA generado completo:` - Verifica que el TRA tenga el formato correcto
- `📋 DN del certificado extraído:` - Verifica que el DN sea correcto
- `📤 Enviando request SOAP a WSAA:` - Verifica la URL y el formato del SOAP
- `=== WSAA Error Response ===` - Si hay error, revisa la respuesta completa

## 📝 Formato del TRA (según manual)

El TRA debe tener este formato:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <source>CN=pruebafacturacion</source>
    <destination>CN=pruebafacturacion</destination>
    <uniqueId>1735578145000</uniqueId>
    <generationTime>20251230140225</generationTime>
    <expirationTime>20251231040225</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>
```

**Nota**: Para certificados de prueba, el `source` y `destination` pueden ser solo `CN=pruebafacturacion` (sin CUIT).

## 🔍 Troubleshooting

### Error 500 de WSAA

**Posibles causas:**
1. ❌ Certificado no asociado al servicio "Facturación Electrónica"
2. ❌ URL incorrecta (debe ser `https://wsaahomo.afip.gov.ar/ws/services/LoginCms`)
3. ❌ Formato del TRA incorrecto
4. ❌ Firma CMS incorrecta
5. ❌ Certificado vencido o inválido

### Error: "Token o Sign no encontrados"

**Posibles causas:**
1. ❌ Respuesta de WSAA no es XML válido
2. ❌ Estructura de la respuesta cambió
3. ❌ Error en el parsing del XML

## ✅ Checklist

- [x] URL de WSAA corregida
- [x] Script de validación de certificado creado
- [x] Logging mejorado
- [ ] Certificado asociado a "Facturación Electrónica" en AFIP (verificar manualmente)
- [ ] Token WSAA obtenido exitosamente
- [ ] Pruebas completadas

## 📚 Referencias

- Manual ARCA: `manual-desarrollador-ARCA-COMPG-v4-1.pdf`
- Script de prueba: `backend/scripts/test-certificate.ts`
- Token Manager: `backend/src/services/arca/ArcaTokenManager.ts`

