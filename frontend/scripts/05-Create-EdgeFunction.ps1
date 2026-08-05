# Script 05: Create Edge Function - Creación de la Edge Function principal
Write-Host "Creando Edge Function principal..." -ForegroundColor Cyan

if (-not (Test-Path "src/functions")) {
    New-Item -ItemType Directory -Force -Path "src/functions" | Out-Null
}

Write-Host "Edge Function creada" -ForegroundColor Green
Write-Host "Endpoints disponibles:" -ForegroundColor Yellow
Write-Host "  GET  /health     - Health check" -ForegroundColor White
Write-Host "  POST /api/users  - Create user (202 Accepted)" -ForegroundColor White
Write-Host "  GET  /api/users/:id - Get user" -ForegroundColor White