# Configuración AFIP/ARCA - Facturación Electrónica

## Requisitos Previos

1. **CUIT/CUIL del desarrollador** (para homologación) o del cliente (para producción)
2. **Certificado digital AFIP** (.p12 o .pfx) descargado desde el sitio de AFIP
3. **Contraseña del certificado** (la que usaste al descargarlo)

## Pasos de Configuración

### 1. Obtener Certificado desde AFIP

1. Ingresar a [AFIP - Certificados Digitales](https://www.afip.gob.ar/fe/ayuda/certificados.asp)
2. Descargar el certificado en formato `.p12` o `.pfx` (ambos funcionan igual)
3. Guardar la contraseña que usaste al descargarlo

### 2. Convertir Certificado a Base64

#### En Linux/Mac:

```bash
# Opción 1: Usando base64
cat certificado.p12 certificado.pfx | base64 -w 0 > certificado_base64.txt

# Opción 2: Usando openssl (más compatible)
openssl base64 -in certificado.p12 -out certificado_base64.txt
# O si es .pfx:
openssl base64 -in certificado.pfx -out certificado_base64.txt
```

#### En Windows (PowerShell):

```powershell
# Opción 1: Usando certutil
certutil -encode certificado.p12 certificado_base64.txt
# O si es .pfx:
certutil -encode certificado.pfx certificado_base64.txt

# Opción 2: Usando PowerShell nativo
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.p12")) | Out-File -Encoding ASCII certificado_base64.txt
# O si es .pfx:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificado.pfx")) | Out-File -Encoding ASCII certificado_base64.txt
```

#### En Node.js (si prefieres hacerlo programáticamente):

```javascript
const fs = require('fs');
// Funciona con .p12 o .pfx
const certBuffer = fs.readFileSync('certificado.p12'); // o 'certificado.pfx'
const certBase64 = certBuffer.toString('base64');
console.log(certBase64);
```

### 3. Configurar Variables de Entorno

Editar el archivo `.env` en `backend/`:

```env
# Entorno AFIP
AFIP_ENV="homo"  # 'homo' para homologación, 'prod' para producción

# CUIT del emisor (formato con o sin guiones)
AFIP_CUIT="20-12345678-9"

# Certificado en Base64 (copiar TODO el contenido sin saltos de línea)
AFIP_CERT_P12_BASE64="MIIKpAIBAzCCCl4GCSqGSIb3DQEHAaCCCk8EggpLMIIKRzCCBXcGCSqGSIb3..."

# Contraseña del certificado
AFIP_CERT_P12_PASSWORD="tu_contraseña_secreta"

# Punto de venta (opcional - se descubre automáticamente si no se especifica)
AFIP_PTO_VTA=1
```

### 4. Validar Configuración

El servidor validará automáticamente las variables al iniciar:

- Si **ninguna** variable de AFIP está presente: ✅ La app funciona sin facturación electrónica
- Si **alguna** variable de AFIP está presente: ✅ **TODAS** deben estar configuradas correctamente
- Si el formato es inválido: ❌ El servidor no iniciará y mostrará el error

## Homologación vs Producción

### Homologación (`AFIP_ENV="homo"`)

- Usa el CUIT del **desarrollador** (monotributista)
- Endpoints de prueba de AFIP
- No genera comprobantes reales
- Ideal para desarrollo y testing

### Producción (`AFIP_ENV="prod"`)

- Usa el CUIT del **cliente final**
- Endpoints reales de AFIP
- Genera comprobantes fiscales reales
- ⚠️ **CUIDADO**: Solo usar cuando esté completamente probado

## Verificar que Funciona

Una vez configurado, puedes verificar que la facturación está habilitada:

```typescript
import { isFiscalEnabled } from './config/env.js'

if (isFiscalEnabled()) {
  console.log('✅ Facturación electrónica habilitada')
} else {
  console.log('⚠️ Facturación electrónica no configurada')
}
```

## Troubleshooting

### Error: "CUIT debe tener formato válido"

- Verificar que el CUIT tenga 11 dígitos
- Puede tener guiones: `20-12345678-9` o sin guiones: `20123456789`

### Error: "El certificado Base64 parece inválido"

- Verificar que no haya saltos de línea en `AFIP_CERT_P12_BASE64`
- El certificado Base64 debe ser una sola línea continua
- Verificar que el archivo `.p12` no esté corrupto

### Error: "AFIP_CUIT es requerido cuando se configura facturación electrónica"

- Si configuraste alguna variable de AFIP, **todas** deben estar presentes
- O bien, comenta/elimina todas las variables de AFIP si no las necesitas aún

## Seguridad

⚠️ **IMPORTANTE**:

- **NUNCA** subas el archivo `.env` a Git
- El certificado y contraseña son **secretos sensibles**
- En producción, usa variables de entorno del servidor, no archivos `.env`
- El certificado Base64 puede ser muy largo, asegúrate de que no se trunque

