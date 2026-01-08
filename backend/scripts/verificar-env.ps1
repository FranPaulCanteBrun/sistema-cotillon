# Script para verificar que las variables de entorno AFIP estén correctamente configuradas

Write-Host "=== Verificación de Variables de Entorno AFIP ===" -ForegroundColor Cyan
Write-Host ""

$envFile = Join-Path $PSScriptRoot ".." ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: No se encontró el archivo .env en: $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Archivo .env encontrado: $envFile" -ForegroundColor Green
Write-Host ""

# Leer variables directamente del archivo
$envContent = Get-Content $envFile -Raw

$hasEnv = $envContent -match 'AFIP_ENV\s*=\s*"([^"]*)"'
$hasCuit = $envContent -match 'AFIP_CUIT\s*=\s*"([^"]*)"'
$hasCert = $envContent -match 'AFIP_CERT_P12_BASE64\s*=\s*"([^"]*)"'
$hasPassword = $envContent -match 'AFIP_CERT_P12_PASSWORD\s*=\s*"([^"]*)"'

Write-Host "Variables encontradas en .env:" -ForegroundColor Yellow
Write-Host "  AFIP_ENV: " -NoNewline
if ($hasEnv) {
    Write-Host "✅ $($matches[1])" -ForegroundColor Green
} else {
    Write-Host "❌ NO ENCONTRADA" -ForegroundColor Red
}

Write-Host "  AFIP_CUIT: " -NoNewline
if ($hasCuit) {
    $cuit = $matches[1]
    Write-Host "✅ $cuit ($($cuit.Length) caracteres)" -ForegroundColor Green
} else {
    Write-Host "❌ NO ENCONTRADA" -ForegroundColor Red
}

Write-Host "  AFIP_CERT_P12_BASE64: " -NoNewline
if ($hasCert) {
    $cert = $matches[1]
    $hasNewlines = $cert -match "`r`n|`n|`r"
    Write-Host "✅ Encontrado ($($cert.Length) caracteres)" -ForegroundColor Green
    if ($hasNewlines) {
        Write-Host "    ⚠️  ADVERTENCIA: El certificado tiene saltos de línea" -ForegroundColor Yellow
        Write-Host "    Debe estar en una sola línea continua" -ForegroundColor Yellow
    } else {
        Write-Host "    ✅ Certificado en una sola línea (correcto)" -ForegroundColor Green
    }
} else {
    Write-Host "❌ NO ENCONTRADA" -ForegroundColor Red
}

Write-Host "  AFIP_CERT_P12_PASSWORD: " -NoNewline
if ($hasPassword) {
    Write-Host "✅ Encontrada" -ForegroundColor Green
} else {
    Write-Host "❌ NO ENCONTRADA" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Verificación con Node.js (dotenv) ===" -ForegroundColor Cyan
Write-Host ""

# Verificar con Node.js
$nodeCheck = node -e @"
require('dotenv').config();
const vars = {
    AFIP_ENV: process.env.AFIP_ENV || 'NO DEFINIDO',
    AFIP_CUIT: process.env.AFIP_CUIT ? 'OK (' + process.env.AFIP_CUIT + ')' : 'NO DEFINIDO',
    AFIP_CERT_P12_BASE64: process.env.AFIP_CERT_P12_BASE64 ? 'OK (' + process.env.AFIP_CERT_P12_BASE64.length + ' chars)' : 'NO DEFINIDO',
    AFIP_CERT_P12_PASSWORD: process.env.AFIP_CERT_P12_PASSWORD ? 'OK' : 'NO DEFINIDO'
};
console.log(JSON.stringify(vars, null, 2));
"@

Write-Host $nodeCheck

Write-Host ""
Write-Host "=== Recomendaciones ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Si las variables aparecen en .env pero NO en Node.js:" -ForegroundColor Yellow
Write-Host "   - Verifica que no haya espacios alrededor del '='" -ForegroundColor White
Write-Host "   - Verifica que las comillas estén correctas" -ForegroundColor White
Write-Host "   - Verifica que no haya caracteres especiales problemáticos" -ForegroundColor White
Write-Host ""
Write-Host "2. Si el certificado tiene saltos de línea:" -ForegroundColor Yellow
Write-Host "   - Ejecuta: .\scripts\fix-cert-base64.ps1" -ForegroundColor White
Write-Host ""
Write-Host "3. Después de cambiar .env:" -ForegroundColor Yellow
Write-Host "   - REINICIA el servidor (Ctrl+C y luego npm run dev)" -ForegroundColor White
Write-Host ""

