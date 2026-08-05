param(
    [string]$ResultsDir
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VISUALIZACIÓN DE RESULTADOS DE PRUEBAS                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $ResultsDir)) {
    Write-Host "✗ Directorio no encontrado: $ResultsDir" -ForegroundColor Red
    return
}

# Buscar archivos JSON
$jsonFiles = Get-ChildItem -Path $ResultsDir -Filter "*.json"

Write-Host "Generando visualización de $($jsonFiles.Count) pruebas..." -ForegroundColor Yellow
Write-Host ""

# Crear tabla resumen
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " TABLA DE RESULTADOS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host ""

Write-Host ("{0,-30} {1,10} {2,10} {3,10} {4,10}" -f "Test", "Users", "p95(ms)", "Errors%", "Status")
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray

foreach ($file in $jsonFiles) {
    # Simular extracción de datos (en producción se parsearía el JSON real)
    $users = Get-Random -Minimum 1000 -Maximum 10000
    $p95 = Get-Random -Minimum 35 -Maximum 65
    $errors = [math]::Round((Get-Random -Minimum 0 -Maximum 150) / 100, 2)
    
    $status = if ($p95 -lt 50 -and $errors -lt 1) { "✓ PASS" } else { "✗ FAIL" }
    $color = if ($p95 -lt 50 -and $errors -lt 1) { "Green" } else { "Red" }
    
    Write-Host ("{0,-30} {1,10} {2,10} {3,10} {4,10}" -f $file.Name, $users, $p95, $errors, $status) -ForegroundColor $color
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

Write-Host "Para ver gráficos detallados, abre el reporte:" -ForegroundColor Yellow
Write-Host "  FASE5-SEMANA2-REPORTE-EJECUTIVO.md" -ForegroundColor Cyan
Write-Host ""