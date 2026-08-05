# Script 01: Setup Project - Inicialización del proyecto Edge Function
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("cloudflare", "vercel", "deno")]
    [string]$Runtime
)

Write-Host "Inicializando proyecto Edge Function con runtime: $Runtime" -ForegroundColor Cyan

$directories = @("src/functions", "src/validators", "src/utils", "src/config", "src/clients", "src/middleware", "tests", "scripts")
foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Host "Estructura de carpetas creada exitosamente" -ForegroundColor Green