# =============================================================================
# SCRIPT DE PRESENTACIÓN: Reporte Fase 5
# Muestra el reporte en el navegador y genera resumen ejecutivo
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRESENTACIÓN DEL REPORTE FASE 5                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$reportPath = "$PWD\FASE5-REPORTE-FINAL-CONSOLIDADO.md"

if (Test-Path $reportPath) {
    Write-Host "✓ Reporte encontrado: $reportPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opciones de visualización:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Abrir en navegador (Markdown viewer):" -ForegroundColor White
    Write-Host "   start $reportPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Convertir a HTML (requiere pandoc):" -ForegroundColor White
    Write-Host "   pandoc $reportPath -o FASE5-REPORTE-FINAL.html" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Ver en VS Code:" -ForegroundColor White
    Write-Host "   code $reportPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Ver contenido en consola:" -ForegroundColor White
    Write-Host "   Get-Content $reportPath" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "✗ Reporte no encontrado en: $reportPath" -ForegroundColor Red
}