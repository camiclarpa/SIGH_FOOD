Write-Host "Iniciando pruebas de integración con Vitest..." -ForegroundColor Cyan
Write-Host "Modo: run (una sola vez, sin bloquear la terminal)" -ForegroundColor Gray
Write-Host ""

# Ejecutar vitest en modo 'run' (no 'watch') para que termine y devuelva el control
npx vitest run tests/sighfood-flow.test.ts --reporter=verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ PRUEBAS PASARON CORRECTAMENTE                           ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ✗ ALGUNAS PRUEBAS FALLARON                                ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
}