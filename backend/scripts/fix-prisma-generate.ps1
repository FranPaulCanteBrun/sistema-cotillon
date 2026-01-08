# Script para regenerar Prisma después de detener el servidor
# Ejecutar: .\scripts\fix-prisma-generate.ps1

Write-Host "🛑 Deteniendo procesos de Node.js..." -ForegroundColor Yellow

# Detener todos los procesos de Node.js
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "⏳ Esperando 2 segundos para que se liberen los archivos..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "🔄 Regenerando cliente de Prisma..." -ForegroundColor Cyan
# Ya estamos en backend, no necesitamos cd backend
npx prisma generate

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cliente de Prisma regenerado exitosamente" -ForegroundColor Green
    Write-Host "💡 Ahora puedes reiniciar el servidor con: npm run dev" -ForegroundColor Cyan
} else {
    Write-Host "❌ Error al regenerar Prisma. Verifica que no haya procesos de Node.js corriendo." -ForegroundColor Red
    Write-Host "   Ejecuta: tasklist | findstr node" -ForegroundColor Yellow
}
