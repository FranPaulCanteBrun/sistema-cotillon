# 🔧 Solución: Certificado Base64 con Saltos de Línea

## Problema

Si tu certificado Base64 tiene saltos de línea, el archivo `.env` no lo leerá correctamente. El certificado **debe estar en una sola línea continua**.

## Solución Rápida

### Opción 1: Usar el Script PowerShell (Recomendado)

1. Asegúrate de tener tu archivo `certificado_base64.txt` con el Base64 (puede tener saltos de línea)

2. Ejecuta el script desde la carpeta `backend/`:

```powershell
.\scripts\fix-cert-base64.ps1 -InputFile "ruta\a\tu\certificado_base64.txt"
```

3. El script te mostrará el Base64 en una sola línea. Cópialo completo.

4. Edita tu `.env` y pega el Base64 en una sola línea:

```env
AFIP_CERT_P12_BASE64="MIIKpAIBAzCCCl4GCSqGSIb3DQEHAaCCCk8EggpLMIIKRzCCBXcGCSqGSIb3..."
```

### Opción 2: Manualmente en PowerShell

Si tienes el archivo `certificado_base64.txt`, ejecuta:

```powershell
# Leer y limpiar el Base64
$content = Get-Content "certificado_base64.txt" -Raw
$content = $content -replace "`r`n", '' -replace "`n", '' -replace "`r", '' -replace '\s+', ''
$content = $content.Trim()

# Mostrar (copia esto)
$content
```

### Opción 3: Usar un Editor de Texto

1. Abre `certificado_base64.txt` en un editor de texto (Notepad++, VS Code, etc.)
2. Busca y reemplaza:
   - Buscar: `\r\n` o `\n` (saltos de línea)
   - Reemplazar: (nada, dejar vacío)
3. Asegúrate de que sea una sola línea
4. Copia todo el contenido
5. Pégalo en tu `.env` entre comillas:

```env
AFIP_CERT_P12_BASE64="PEGA_AQUI_EL_BASE64_SIN_SALTOS_DE_LINEA"
```

## Verificar que Funciona

Después de corregir el `.env`:

1. **Reinicia el servidor** (muy importante):
   ```bash
   # Detén el servidor (Ctrl+C) y vuelve a iniciarlo
   npm run dev
   ```

2. Prueba la configuración:
   ```bash
   GET http://localhost:3000/api/fiscal/test/config
   ```

3. Deberías ver:
   ```json
   {
     "fiscalEnabled": true,
     "config": {
       "hasCert": true,
       "certLength": 5000,  // Un número grande, no 0
       ...
     }
   }
   ```

## Errores Comunes

### "certLength": 0
- El certificado tiene saltos de línea
- El certificado está vacío
- La variable no se está leyendo

### "hasCert": false
- La variable `AFIP_CERT_P12_BASE64` no está en el `.env`
- Hay un error de sintaxis en el `.env`
- El servidor no se reinició después de cambiar el `.env`

## Checklist

- [ ] Certificado Base64 en **una sola línea** (sin saltos)
- [ ] Entre comillas dobles: `AFIP_CERT_P12_BASE64="..."`
- [ ] Sin espacios al inicio o final
- [ ] Sin encabezados como `-----BEGIN CERTIFICATE-----`
- [ ] Servidor reiniciado después de cambiar `.env`
- [ ] Test de configuración muestra `hasCert: true` y `certLength > 0`

