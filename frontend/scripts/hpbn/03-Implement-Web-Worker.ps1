# =============================================================================
# 03-Implement-Web-Worker.ps1
# Verifica la implementación del Web Worker para la calculadora ROI
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SETUP: Web Worker para Calculadora ROI                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$workerPath = "src\workers\roiCalculator.worker.ts"
$componentPath = "src\components\landing\RoiCalculator.tsx"

if (Test-Path $workerPath) {
    Write-Host "  ✓ Web Worker existe en: $workerPath" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Web Worker no encontrado. Ejecuta la Fase 2 primero." -ForegroundColor Yellow
}

if (Test-Path $componentPath) {
    $content = Get-Content $componentPath -Raw
    if ($content -match "new Worker") {
        Write-Host "  ✓ Componente RoiCalculator.tsx integra el Web Worker" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Componente RoiCalculator.tsx no parece integrar el Web Worker" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ Componente RoiCalculator.tsx no encontrado." -ForegroundColor Yellow
}

Write-Host "`nPara verificar que no bloquea el hilo principal:" -ForegroundColor Cyan
Write-Host "  1. Abre Chrome DevTools -> pestaña Performance" -ForegroundColor White
Write-Host "  2. Activa la grabación (círculo gris)" -ForegroundColor White
Write-Host "  3. Mueve el slider de la calculadora ROI rápidamente" -ForegroundColor White
Write-Host "  4. Detén la grabación" -ForegroundColor White
Write-Host "  5. Verifica que no haya 'Long Tasks' (barras rojas) en el Main Thread" -ForegroundColor White
Write-Host ""