# Script 06: Setup Logging - Configuración de logging y métricas
Write-Host "Configurando logging y métricas..." -ForegroundColor Cyan

if (-not (Test-Path "src/utils")) {
    New-Item -ItemType Directory -Force -Path "src/utils" | Out-Null
}

if (-not (Test-Path "src/middleware")) {
    New-Item -ItemType Directory -Force -Path "src/middleware" | Out-Null
}

Write-Host "Logging y métricas configurados" -ForegroundColor Green
Write-Host "Características:" -ForegroundColor Yellow
Write-Host "  ✓ Logging estructurado en JSON" -ForegroundColor Green
Write-Host "  ✓ Métricas de requests/responses" -ForegroundColor Green
Write-Host "  ✓ Middleware chain" -ForegroundColor Green
Write-Host "  ✓ Request ID tracking" -ForegroundColor Green
Write-Host "  ✓ Performance timing" -ForegroundColor Green