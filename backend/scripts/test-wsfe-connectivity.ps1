# Script para probar conectividad con WSFEv1
# Ejecutar: .\scripts\test-wsfe-connectivity.ps1

Write-Host "🔍 Probando conectividad con WSFEv1..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Probando WSDL de homologación:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL" -Method HEAD -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ WSDL accesible - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al acceder al WSDL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Probando endpoint de homologación:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://wswhomo.afip.gov.ar/wsfev1/service.asmx" -Method HEAD -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Endpoint accesible - Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al acceder al endpoint: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Prueba completada" -ForegroundColor Cyan
