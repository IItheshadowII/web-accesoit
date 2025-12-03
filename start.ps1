# Script para iniciar Backend y Frontend simultáneamente
# Autor: Antigravity
# Fecha: 2025-12-02

Write-Host "🚀 Iniciando Backend y Frontend..." -ForegroundColor Cyan
Write-Host ""

# Función para manejar la terminación
function Stop-Services {
    Write-Host "`n🛑 Deteniendo servicios..." -ForegroundColor Yellow
    Get-Job | Stop-Job
    Get-Job | Remove-Job
    exit
}

# Registrar el manejador de Ctrl+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-Services }

try {
    # Iniciar Backend en segundo plano
    Write-Host "📦 Iniciando Backend (server)..." -ForegroundColor Green
    $backendJob = Start-Job -ScriptBlock {
        Set-Location "c:\Users\Kratos\Desktop\web-accesoit\server"
        npm run dev
    }

    # Esperar un momento para que el backend inicie
    Start-Sleep -Seconds 2

    # Iniciar Frontend en segundo plano
    Write-Host "🎨 Iniciando Frontend..." -ForegroundColor Green
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location "c:\Users\Kratos\Desktop\web-accesoit"
        npm run dev
    }

    Write-Host ""
    Write-Host "✅ Servicios iniciados correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Estado de los servicios:" -ForegroundColor Cyan
    Write-Host "   - Backend:  http://localhost:3000 (o el puerto configurado)" -ForegroundColor White
    Write-Host "   - Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Presiona Ctrl+C para detener ambos servicios" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    # Mostrar logs en tiempo real
    while ($true) {
        # Mostrar output del backend
        $backendOutput = Receive-Job -Job $backendJob
        if ($backendOutput) {
            Write-Host "[BACKEND] " -ForegroundColor Magenta -NoNewline
            Write-Host $backendOutput
        }

        # Mostrar output del frontend
        $frontendOutput = Receive-Job -Job $frontendJob
        if ($frontendOutput) {
            Write-Host "[FRONTEND] " -ForegroundColor Blue -NoNewline
            Write-Host $frontendOutput
        }

        # Verificar si algún job falló
        if ($backendJob.State -eq "Failed") {
            Write-Host "❌ El Backend falló. Revisa los logs arriba." -ForegroundColor Red
            break
        }
        if ($frontendJob.State -eq "Failed") {
            Write-Host "❌ El Frontend falló. Revisa los logs arriba." -ForegroundColor Red
            break
        }

        Start-Sleep -Milliseconds 500
    }
}
catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
finally {
    Stop-Services
}
