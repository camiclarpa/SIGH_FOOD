# =============================================================================
# 04-Run-Lighthouse-CI.ps1
# Ejecuta Lighthouse CI contra el landing page local
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  TESTING: Lighthouse CI                                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$targetUrl = "http://localhost:3000/b2b"
$outputDir = "lighthouse-reports"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

Write-Host "Verificando Lighthouse..." -ForegroundColor Yellow
try {
    $lhVersion = lighthouse --version 2>&1
    Write-Host "  ✓ Lighthouse instalado: $lhVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Lighthouse no está instalado." -ForegroundColor Red
    Write-Host "  Ejecuta: pnpm add -D lighthouse" -ForegroundColor Yellow
    return
}

Write-Host "`nEjecutando Lighthouse contra $targetUrl ..." -ForegroundColor Yellow
Write-Host "⚠ Asegúrate de que 'pnpm dev' esté corriendo en otra terminal." -ForegroundColor Gray
Write-Host ""

try {
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $htmlReport = "$outputDir\lighthouse-$timestamp.html"
    $jsonReport = "$outputDir\lighthouse-$timestamp.json"
    
    Write-Host "Ejecutando auditoría (esto puede tomar 30-60 segundos)..." -ForegroundColor Gray
    
    lighthouse $targetUrl `
        --output=html `
        --output=json `
        --output-path=$htmlReport `
        --chrome-flags="--headless --no-sandbox --disable-gpu" 2>&1 | Out-Null
    
    # Lighthouse a veces genera el JSON con un nombre predeterminado
    if (Test-Path "$PWD\lighthouse.report.json") {
        Move-Item "$PWD\lighthouse.report.json" $jsonReport -Force
    }
    
    Write-Host "  ✓ Reporte HTML generado: $htmlReport" -ForegroundColor Green
    Write-Host "  ✓ Reporte JSON generado: $jsonReport" -ForegroundColor Green
    Write-Host ""
    
    # Leer y mostrar resumen básico del JSON
    if (Test-Path $jsonReport) {
        $report = Get-Content $jsonReport -Raw | ConvertFrom-Json
        $categories = $report.categories
        
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host " RESULTADOS LIGHTHOUSE" -ForegroundColor Cyan
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
        
        $perfScore = [math]::Round($categories.performance.score * 100, 1)
        $accScore = [math]::Round($categories.accessibility.score * 100, 1)
        
        Write-Host "  Performance:     $perfScore/100 $(if ($perfScore -ge 90) { '✓' } else { '⚠' })" -ForegroundColor $(if ($perfScore -ge 90) { "Green" } else { "Yellow" })
        Write-Host "  Accessibility:   $accScore/100 $(if ($accScore -ge 100) { '✓' } else { '⚠' })" -ForegroundColor $(if ($accScore -ge 100) { "Green" } else { "Yellow" })
        Write-Host "  Best Practices:  $([math]::Round($categories.'best-practices'.score * 100, 1))/100" -ForegroundColor White
        Write-Host "  SEO:             $([math]::Round($categories.seo.score * 100, 1))/100" -ForegroundColor White
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
    }
    
    Write-Host "`nAbriendo reporte HTML en el navegador..." -ForegroundColor Cyan
    Start-Process $htmlReport
    
} catch {
    Write-Host "  ✗ Error al ejecutar Lighthouse: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Asegúrate de que el servidor esté corriendo en $targetUrl" -ForegroundColor Yellow
}