# Script 04: Setup Connections - Configuración de Redis/SQS
Write-Host "Configurando conexiones Redis/SQS..." -ForegroundColor Cyan

if (-not (Test-Path "src/clients")) {
    New-Item -ItemType Directory -Force -Path "src/clients" | Out-Null
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

Write-Host "Conexiones configuradas" -ForegroundColor Green