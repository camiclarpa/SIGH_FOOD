param(
    [string]$DeploymentUrl,
    [int]$MaxIterations = 3
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ITERACIÓN LIGHTHOUSE: Ajuste hasta 100/100                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $DeploymentUrl) {
    Write-Host "✗ No se proporcionó URL" -ForegroundColor Red
    Write-Host "  Uso: .\scripts\26-Iterate-Lighthouse.ps1 -DeploymentUrl https://sighfood.vercel.app" -ForegroundColor Yellow
    return
}

Write-Host "URL: $DeploymentUrl" -ForegroundColor Cyan
Write-Host "Máximo de iteraciones: $MaxIterations" -ForegroundColor Cyan
Write-Host ""

# Directorio para reportes
$reportsDir = "$PWD\lighthouse-reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Force -Path $reportsDir | Out-Null
}

$iteration = 1
$perfectScore = $false

while ($iteration -le $MaxIterations -and -not $perfectScore) {
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host " ITERACIÓN $iteration / $MaxIterations" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
    Write-Host ""

    # Ejecutar Lighthouse
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $htmlReport = "$reportsDir\report-iter${iteration}_${timestamp}.html"
    $jsonReport = "$reportsDir\report-iter${iteration}_${timestamp}.json"

    Write-Host "[Paso 1] Ejecutando Lighthouse..." -ForegroundColor Yellow
    try {
        lighthouse $DeploymentUrl `
            --output=html `
            --output=json `
            --output-path=$htmlReport `
            --quiet `
            --chrome-flags="--headless --no-sandbox --disable-gpu" 2>&1 | Out-Null
        
        # Mover JSON
        if (Test-Path "$PWD\lighthouse.report.json") {
            Move-Item "$PWD\lighthouse.report.json" $jsonReport -Force
        }
        
        Write-Host "  ✓ Reporte generado: $htmlReport" -ForegroundColor Green
    } catch {
        Write-Host "   Error ejecutando Lighthouse: $($_.Exception.Message)" -ForegroundColor Red
        break
    }
    Write-Host ""

    # Analizar resultados
    Write-Host "[Paso 2] Analizando resultados..." -ForegroundColor Yellow
    
    if (-not (Test-Path $jsonReport)) {
        Write-Host "  ✗ No se pudo leer el reporte JSON" -ForegroundColor Red
        break
    }

    $report = Get-Content $jsonReport -Raw | ConvertFrom-Json
    $categories = $report.categories
    $audits = $report.audits

    # Calcular scores
    $perfScore = [math]::Round($categories.performance.score * 100, 1)
    $accScore = [math]::Round($categories.accessibility.score * 100, 1)
    $bpScore = [math]::Round($categories['best-practices'].score * 100, 1)
    $seoScore = [math]::Round($categories.seo.score * 100, 1)

    Write-Host ""
    Write-Host "  Puntuaciones:" -ForegroundColor Cyan
    Write-Host "  • Performance: $perfScore/100" -ForegroundColor $(if ($perfScore -ge 90) { "Green" } elseif ($perfScore -ge 50) { "Yellow" } else { "Red" })
    Write-Host "  • Accessibility: $accScore/100" -ForegroundColor $(if ($accScore -ge 90) { "Green" } elseif ($accScore -ge 50) { "Yellow" } else { "Red" })
    Write-Host "  • Best Practices: $bpScore/100" -ForegroundColor $(if ($bpScore -ge 90) { "Green" } elseif ($bpScore -ge 50) { "Yellow" } else { "Red" })
    Write-Host "  • SEO: $seoScore/100" -ForegroundColor $(if ($seoScore -ge 90) { "Green" } elseif ($seoScore -ge 50) { "Yellow" } else { "Red" })
    Write-Host ""

    # Core Web Vitals
    Write-Host "  Core Web Vitals:" -ForegroundColor Cyan
    
    $lcp = if ($audits.'largest-contentful-paint') { [math]::Round($audits.'largest-contentful-paint'.numericValue / 1000, 2) } else { 0 }
    $cls = if ($audits.'cumulative-layout-shift') { [math]::Round($audits.'cumulative-layout-shift'.numericValue, 3) } else { 0 }
    $tbt = if ($audits.'total-blocking-time') { [math]::Round($audits.'total-blocking-time'.numericValue / 1000, 2) } else { 0 }

    Write-Host "  • LCP: ${lcp}s (objetivo: <2.5s)" -ForegroundColor $(if ($lcp -lt 2.5) { "Green" } elseif ($lcp -lt 4) { "Yellow" } else { "Red" })
    Write-Host "  • CLS: $cls (objetivo: <0.1)" -ForegroundColor $(if ($cls -lt 0.1) { "Green" } elseif ($cls -lt 0.25) { "Yellow" } else { "Red" })
    Write-Host "  • TBT: ${tbt}s (objetivo: <0.2s)" -ForegroundColor $(if ($tbt -lt 0.2) { "Green" } elseif ($tbt -lt 0.6) { "Yellow" } else { "Red" })
    Write-Host ""

    # Identificar audits fallidos
    Write-Host "[Paso 3] Identificando oportunidades de mejora..." -ForegroundColor Yellow
    
    $failedAudits = @()
    foreach ($auditId in $audits.PSObject.Properties.Name) {
        $audit = $audits.$auditId
        if ($audit.score -eq 0 -and $audit.title) {
            $failedAudits += @{
                Title = $audit.title
                Description = $audit.description
                Score = $audit.score
            }
        }
    }

    if ($failedAudits.Count -gt 0) {
        Write-Host "  Audits fallidos ($($failedAudits.Count)):" -ForegroundColor Red
        foreach ($audit in $failedAudits | Select-Object -First 10) {
            Write-Host "    • $($audit.Title)" -ForegroundColor Yellow
        }
        if ($failedAudits.Count -gt 10) {
            Write-Host "    ... y $($failedAudits.Count - 10) más" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✓ No hay audits fallidos" -ForegroundColor Green
    }
    Write-Host ""

    # Verificar si alcanzamos 100/100
    $allPerfect = ($perfScore -ge 100 -and $accScore -ge 100 -and $bpScore -ge 100 -and $seoScore -ge 100)
    
    if ($allPerfect) {
        $perfectScore = $true
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║  ✓ ¡PUNTUACIÓN PERFECTA 100/100 ALCANZADA!                 ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    } else {
        Write-Host "⚠ Aún no se alcanza 100/100. Se requieren ajustes manuales." -ForegroundColor Yellow
        Write-Host "  Revisa el reporte: $htmlReport" -ForegroundColor Gray
        Write-Host ""
        
        if ($iteration -lt $MaxIterations) {
            Write-Host "  Después de aplicar los ajustes, ejecuta este script nuevamente." -ForegroundColor Cyan
        }
    }

    $iteration++
    Write-Host ""
}

# Resumen final
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host " RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host ""
Write-Host "Iteraciones ejecutadas: $($iteration - 1)" -ForegroundColor White
Write-Host "Reportes generados en: $reportsDir" -ForegroundColor White
Write-Host ""

if ($perfectScore) {
    Write-Host "✓ ¡Objetivo alcanzado! Puntuación 100/100 en todas las categorías." -ForegroundColor Green
} else {
    Write-Host "⚠ No se alcanzó 100/100 en $MaxIterations iteraciones." -ForegroundColor Yellow
    Write-Host "  Revisa los reportes y aplica las recomendaciones manualmente." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Abre el último reporte:" -ForegroundColor White
    Write-Host "    start $htmlReport" -ForegroundColor Gray
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray