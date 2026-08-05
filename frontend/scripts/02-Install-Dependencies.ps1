# Script 02: Install Dependencies - Instalación de dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Cyan

if (Test-Path "pnpm-lock.yaml") {
    pnpm install
} elseif (Test-Path "package-lock.json") {
    npm install
} else {
    npm install
}

Write-Host "Dependencias instaladas" -ForegroundColor Green