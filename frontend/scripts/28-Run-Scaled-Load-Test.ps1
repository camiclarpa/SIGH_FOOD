param(
    [string]$DeploymentUrl,
    [switch]$Cloud
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBAS DE ESTRÉS ESCALADAS: 10,000 Usuarios              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar URL
if (-not $DeploymentUrl) {
    Write-Host "✗ No se proporcionó URL de despliegue" -ForegroundColor Red
    Write-Host "  Uso: .\scripts\28-Run-Scaled-Load-Test.ps1 -DeploymentUrl https://sighfood.vercel.app" -ForegroundColor Yellow
    return
}

Write-Host "URL de producción: $DeploymentUrl" -ForegroundColor Cyan
Write-Host "Modo: $(if ($Cloud) { 'k6 Cloud (distribuido)' } else { 'Local' })" -ForegroundColor Cyan
Write-Host ""

# Verificar k6
Write-Host "[1/3] Verificando k6..." -ForegroundColor Yellow
try {
    $k6Version = k6 version 2>&1
    Write-Host "  ✓ k6 instalado: $k6Version" -ForegroundColor Green
} catch {
    Write-Host "  ✗ k6 no está instalado" -ForegroundColor Red
    Write-Host "  Instala con: .\scripts\15-Run-Load-Test.ps1 (descarga automática)" -ForegroundColor Yellow
    return
}
Write-Host ""

# Preparar variables de entorno
Write-Host "[2/3] Configurando variables de entorno..." -ForegroundColor Yellow
$env:BASE_URL = $DeploymentUrl
Write-Host "  ✓ BASE_URL=$DeploymentUrl" -ForegroundColor Green
Write-Host ""

# Ejecutar pruebas
Write-Host "[3/3] Iniciando pruebas de estrés escaladas..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠ ADVERTENCIA: Esta prueba durará aproximadamente 20 minutos" -ForegroundColor Yellow
Write-Host "  y simulará hasta 10,000 usuarios concurrentes." -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Ctrl+C para cancelar en cualquier momento." -ForegroundColor Gray
Write-Host ""

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputPath = "$PWD\k6-results\stress-test-${timestamp}"

if (-not (Test-Path "$PWD\k6-results")) {
    New-Item -ItemType Directory -Force -Path "$PWD\k6-results" | Out-Null
}

try {
    if ($Cloud) {
        # Ejecutar en k6 Cloud (requiere cuenta y token)
        Write-Host "Ejecutando en k6 Cloud..." -ForegroundColor Yellow
        k6 cloud --out json=${outputPath}.json tests/load-test-scaled.js
    } else {
        # Ejecutar localmente
        Write-Host "Ejecutando localmente..." -ForegroundColor Yellow
        k6 run --out json=${outputPath}.json tests/load-test-scaled.js
    }
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✓ PRUEBAS COMPLETADAS" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
    Write-Host ""
    Write-Host "Resultados guardados en:" -ForegroundColor Cyan
    Write-Host "  ${outputPath}.json" -ForegroundColor White
    Write-Host ""
    Write-Host "Para analizar resultados, ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\scripts\29-Analyze-Load-Test-Results.ps1 -ResultPath ${outputPath}.json" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host " Error en las pruebas: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Revisa los logs para más detalles" -ForegroundColor Yellow
}