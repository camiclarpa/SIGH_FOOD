Write-Host "Iniciando Worker en segundo plano (Modo Seguro)..." -ForegroundColor Cyan

# Verificar si ya hay un worker corriendo
$existingWorker = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match "leadWorker" }
if ($existingWorker) {
    Write-Host "⚠ Ya parece haber un Worker corriendo. Deteniéndolo primero..." -ForegroundColor Yellow
    $existingWorker | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Iniciar el proceso de forma aislada
$process = Start-Process -FilePath "npx" `
                         -ArgumentList "tsx", "src/workers/leadWorker.ts" `
                         -NoNewWindow `
                         -PassThru `
                         -RedirectStandardOutput "worker-output.log" `
                         -RedirectStandardError "worker-error.log"

Write-Host "✓ Worker iniciado en segundo plano (PID: $($process.Id))" -ForegroundColor Green
Write-Host "  Esta terminal NO está bloqueada." -ForegroundColor Gray
Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Cyan
Write-Host "  • Ver logs en vivo: Get-Content worker-output.log -Tail 20 -Wait" -ForegroundColor White
Write-Host "  • Ver errores: Get-Content worker-error.log -Tail 20" -ForegroundColor White
Write-Host "  • Detener Worker: Stop-Process -Id $($process.Id) -Force" -ForegroundColor White