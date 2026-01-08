# Script para convertir certificado Base64 a una sola línea
# Uso: .\fix-cert-base64.ps1 -InputFile "certificado_base64.txt"

param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile
)

Write-Host "Leyendo archivo: $InputFile" -ForegroundColor Cyan

if (-not (Test-Path $InputFile)) {
    Write-Host "Error: El archivo no existe: $InputFile" -ForegroundColor Red
    exit 1
}

# Leer el contenido y eliminar saltos de línea, espacios y encabezados
$content = Get-Content $InputFile -Raw

# Eliminar encabezados comunes
$content = $content -replace '-----BEGIN CERTIFICATE-----', ''
$content = $content -replace '-----END CERTIFICATE-----', ''
$content = $content -replace '-----BEGIN PKCS12-----', ''
$content = $content -replace '-----END PKCS12-----', ''

# Eliminar todos los saltos de línea y espacios en blanco
$content = $content -replace "`r`n", ''
$content = $content -replace "`n", ''
$content = $content -replace "`r", ''
$content = $content -replace '\s+', ''

# Eliminar espacios al inicio y final
$content = $content.Trim()

Write-Host "`nCertificado Base64 (una sola línea):" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host $content -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Green
Write-Host "`nLongitud: $($content.Length) caracteres" -ForegroundColor Cyan
Write-Host "`nCopia este contenido y pégalo en tu .env como:" -ForegroundColor Cyan
Write-Host 'AFIP_CERT_P12_BASE64="' -NoNewline -ForegroundColor Yellow
Write-Host $content -NoNewline -ForegroundColor White
Write-Host '"' -ForegroundColor Yellow

