Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  EJECUCIÓN: Pruebas de Carga con k6                        ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Detectar k6
$k6Path = ".\.tools\k6\k6.exe"
$k6InPath = Get-Command "k6" -ErrorAction SilentlyContinue

if ($k6InPath) {
    $k6Command = "k6"
} elseif (Test-Path $k6Path) {
    $k6Command = $k6Path
} else {
    Write-Host "✗ k6 no encontrado. Ejecuta primero el script de setup de la Tarea 5." -ForegroundColor Red
    return
}

# URL objetivo
$targetUrl = $args[0]
if (-not $targetUrl) {
    $targetUrl = "http://localhost:3000"
}

Write-Host "URL objetivo: $targetUrl" -ForegroundColor Yellow
Write-Host "Duración estimada: 2 minutos" -ForegroundColor Yellow
Write-Host ""
Write-Host "Iniciando pruebas..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray

# Ejecutar k6
& $k6Command run --env BASE_URL=$targetUrl tests/load-test.js

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Pruebas de carga completadas exitosamente." -ForegroundColor Green
    Write-Host "  Revisa los thresholds en la salida de arriba." -ForegroundColor Gray
} else {
    Write-Host " Algunas pruebas fallaron los thresholds (SLA)." -ForegroundColor Yellow
    Write-Host "  Esto es normal en desarrollo local. En Vercel Edge debería pasar." -ForegroundColor Gray
}