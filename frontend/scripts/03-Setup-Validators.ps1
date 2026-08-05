# Script 03: Setup Validators - Configuración de Zod Validators
Write-Host "Configurando Zod Validators..." -ForegroundColor Cyan

if (-not (Test-Path "src/validators")) {
    New-Item -ItemType Directory -Force -Path "src/validators" | Out-Null
}

Write-Host "Validators configurados" -ForegroundColor Green