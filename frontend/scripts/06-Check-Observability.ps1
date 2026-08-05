Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICACIÓN DE OBSERVABILIDAD (LOGS Y MÉTRICAS)          ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$filesToCheck = @("worker-output.log", "worker-error.log", "vercel-output.log")

foreach ($file in $filesToCheck) {
    Write-Host "Verificando: $file" -ForegroundColor Yellow
    if (Test-Path $file) {
        $lineCount = (Get-Content $file | Measure-Object -Line).Lines
        Write-Host "  ✓ Existe ($lineCount líneas)" -ForegroundColor Green
        
        if ($lineCount -gt 0) {
            Write-Host "  Últimas 3 líneas:" -ForegroundColor Gray
            Get-Content $file -Tail 3 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
        }
    } else {
        Write-Host "  ⚠ No existe aún (se genera al ejecutar el servidor/worker)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "Para ver los logs en tiempo real, usa:" -ForegroundColor Cyan
Write-Host "  Get-Content worker-output.log -Tail 20 -Wait" -ForegroundColor Gray