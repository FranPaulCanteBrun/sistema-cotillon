# Script para detener todos los procesos de Node.js que puedan estar usando el puerto 3000
# Uso: .\kill-node-processes.ps1

Write-Host "Buscando procesos que usan el puerto 3000..." -ForegroundColor Yellow

# Obtener procesos que usan el puerto 3000
$port3000 = netstat -ano | Select-String ":3000" | Select-String "LISTENING"

if ($port3000) {
    Write-Host "Procesos encontrados usando el puerto 3000:" -ForegroundColor Red
    foreach ($line in $port3000) {
        $pid = ($line -split '\s+')[-1]
        if ($pid -match '^\d+$') {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "  PID: $pid - $($process.ProcessName) - $($process.Path)" -ForegroundColor Yellow
                try {
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                    Write-Host "  ✅ Proceso $pid detenido" -ForegroundColor Green
                } catch {
                    Write-Host "  ❌ Error al detener proceso $pid : $_" -ForegroundColor Red
                }
            }
        }
    }
} else {
    Write-Host "✅ No hay procesos usando el puerto 3000" -ForegroundColor Green
}

# Esperar un momento
Start-Sleep -Seconds 2

# Verificar nuevamente
Write-Host "`nVerificando estado del puerto 3000..." -ForegroundColor Yellow
$check = netstat -ano | Select-String ":3000" | Select-String "LISTENING"
if ($check) {
    Write-Host "⚠️ Aún hay procesos usando el puerto 3000" -ForegroundColor Red
    $check
} else {
    Write-Host "✅ Puerto 3000 está libre" -ForegroundColor Green
}
