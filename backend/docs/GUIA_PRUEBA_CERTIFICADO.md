# 🧪 Guía Rápida: Probar Certificado .pfx/.p12

## 📋 Pasos para Configurar y Probar

### 1. Convertir tu Certificado .pfx a Base64

Abre PowerShell en la carpeta donde está tu certificado `.pfx` y ejecuta:

```powershell
# Opción 1: Usando PowerShell (recomendado)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("tu_certificado.pfx")) | Out-File -Encoding ASCII certificado_base64.txt

# Opción 2: Usando certutil
certutil -encode tu_certificado.pfx certificado_base64.txt
```

**IMPORTANTE**: 
- El archivo `certificado_base64.txt` tendrá encabezados. **Elimínalos** antes de copiar.
- Solo copia el contenido Base64 (la línea larga de caracteres), sin los encabezados `-----BEGIN CERTIFICATE-----` ni `-----END CERTIFICATE-----`
- Debe ser **una sola línea continua** sin saltos de línea

### 2. Configurar Variables de Entorno

Edita el archivo `.env` en la carpeta `backend/` y agrega:

```env
# Entorno AFIP (homo = homologación, prod = producción)
AFIP_ENV="homo"

# Tu CUIT/CUIL (con o sin guiones)
AFIP_CUIT="20-12345678-9"

# Certificado en Base64 (pega TODO el contenido de una sola línea)
AFIP_CERT_P12_BASE64="MIIKpAIBAzCCCl4GCSqGSIb3DQEHAaCCCk8EggpLMIIKRzCCBXcGCSqGSIb3..."

# Contraseña del certificado (la que usaste al descargarlo)
AFIP_CERT_P12_PASSWORD="tu_contraseña_aqui"
```

### 3. Verificar Configuración (Sin Autenticación)

Antes de probar el token, verifica que la configuración esté correcta:

```bash
# Desde el navegador o con curl
GET http://localhost:3000/api/fiscal/test/config
```

Deberías ver algo como:

```json
{
  "fiscalEnabled": true,
  "config": {
    "env": "homo",
    "hasCuit": true,
    "cuit": "20-12345678-9",
    "hasCert": true,
    "certLength": 5000,
    "hasPassword": true,
    "hasPtoVta": false,
    "ptoVta": null
  },
  "status": "✅ Configuración completa - Listo para usar"
}
```

### 4. Probar Obtención de Token (Requiere Autenticación)

Primero, obtén un token JWT del sistema:

```bash
# Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@cotillon.local",
  "password": "admin123"
}
```

Copia el `token` de la respuesta.

Luego, prueba la obtención del token WSAA:

```bash
# Probar Token WSAA
GET http://localhost:3000/api/fiscal/test/token
Authorization: Bearer TU_TOKEN_JWT_AQUI
```

### 5. Respuesta Exitosa

Si todo está bien configurado, deberías ver:

```json
{
  "success": true,
  "message": "Token WSAA obtenido exitosamente",
  "data": {
    "tokenPreview": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...",
    "signPreview": "MIIKpAIBAzCCCl4GCSqGSIb3DQEHAaCCCk8EggpLMIIKRzCCBXc...",
    "tokenLength": 2500,
    "signLength": 344,
    "elapsedTimeMs": 1234,
    "environment": "homo"
  },
  "info": {
    "cuit": "20-12345678-9",
    "env": "homo",
    "hasPtoVta": false,
    "ptoVta": "auto-detect"
  }
}
```

## ❌ Errores Comunes

### Error: "Contraseña del certificado incorrecta"
- Verifica que `AFIP_CERT_P12_PASSWORD` sea exactamente la misma que usaste al descargar el certificado
- No debe tener espacios al inicio o final

### Error: "No se pudo extraer la clave privada del certificado"
- Verifica que `AFIP_CERT_P12_BASE64` sea válido
- Asegúrate de que no tenga saltos de línea
- Verifica que el archivo `.pfx` no esté corrupto

### Error: "Respuesta de WSAA no contiene loginCmsReturn"
- Verifica que el certificado esté **autorizado** en AFIP
- Verifica que el CUIT sea correcto
- Verifica que estés usando `AFIP_ENV="homo"` para homologación

### Error: "Facturación electrónica no está configurada"
- Verifica que **todas** las variables estén en el `.env`
- Si alguna variable está presente, **todas** deben estar configuradas

## 🔍 Verificar desde Swagger

También puedes probar desde la documentación interactiva:

1. Inicia el servidor: `npm run dev` en `backend/`
2. Abre: `http://localhost:3000/docs`
3. Busca la sección **"Fiscal - Testing"**
4. Prueba primero `/api/fiscal/test/config` (sin autenticación)
5. Luego prueba `/api/fiscal/test/token` (requiere autenticación)

## ✅ Checklist

- [ ] Certificado `.pfx` convertido a Base64
- [ ] Base64 copiado sin encabezados ni saltos de línea
- [ ] Variables de entorno configuradas en `.env`
- [ ] CUIT correcto (formato válido)
- [ ] Contraseña correcta
- [ ] `AFIP_ENV="homo"` para pruebas
- [ ] Servidor reiniciado después de cambiar `.env`
- [ ] Test de configuración exitoso
- [ ] Test de token exitoso

## 🎯 Siguiente Paso

Una vez que el test de token funcione, puedes continuar con:
- **Tarea 4**: Implementar `ArcaWsfeClient` para usar el token
- **Tarea 5**: Implementar `FiscalService` para emitir comprobantes

