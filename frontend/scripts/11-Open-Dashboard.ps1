Write-Host "Abriendo Dashboard de Observabilidad..." -ForegroundColor Cyan
$dashboardUrl = "http://localhost:3000/admin"

# Intentar abrir en el navegador por defecto
try {
    Start-Process $dashboardUrl
    Write-Host "✓ Dashboard abierto en: $dashboardUrl" -ForegroundColor Green
} catch {
    Write-Host "No se pudo abrir automáticamente. Copia y pega esta URL en tu navegador:" -ForegroundColor Yellow
    Write-Host $dashboardUrl -ForegroundColor Cyan
}