param(
    [string]$DeploymentUrl
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICACIÓN: Core Web Vitals                             ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $DeploymentUrl) {
    Write-Host "✗ No se proporcionó URL de despliegue" -ForegroundColor Red
    Write-Host "  Uso: .\scripts\25-Verify-CoreWebVitals.ps1 -DeploymentUrl https://sighfood.vercel.app" -ForegroundColor Yellow
    return
}

Write-Host "URL de producción: $DeploymentUrl" -ForegroundColor Cyan
Write-Host ""

# Verificar que Lighthouse CLI esté instalado
Write-Host "[1/4] Verificando Lighthouse CLI..." -ForegroundColor Yellow
try {
    $lhVersion = lighthouse --version 2>&1
    Write-Host "  ✓ Lighthouse instalado: $lhVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Lighthouse no está instalado" -ForegroundColor Red
    Write-Host "  Instala con: npm install -g lighthouse" -ForegroundColor Yellow
    return
}
Write-Host ""

# Ejecutar Lighthouse
Write-Host "[2/4] Ejecutando Lighthouse (esto puede tardar 2-3 min)..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray

$outputPath = "$PWD\lighthouse-report.html"
$jsonPath = "$PWD\lighthouse-report.json"

try {
    lighthouse $DeploymentUrl `
        --output=html `
        --output=json `
        --output-path=$outputPath `
        --quiet `
        --chrome-flags="--headless" 2>&1 | Out-Null
    
    # Mover JSON a ubicación esperada
    if (Test-Path "$PWD\lighthouse.report.json") {
        Move-Item "$PWD\lighthouse.report.json" $jsonPath -Force
    }
    
    Write-Host "  ✓ Reporte generado" -ForegroundColor Green
    Write-Host "    HTML: $outputPath" -ForegroundColor Gray
    Write-Host "    JSON: $jsonPath" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Error ejecutando Lighthouse: $($_.Exception.Message)" -ForegroundColor Red
    return
}
Write-Host ""

# Analizar resultados
Write-Host "[3/4] Analizando resultados..." -ForegroundColor Yellow

if (Test-Path $jsonPath) {
    $report = Get-Content $jsonPath -Raw | ConvertFrom-Json
    
    $categories = $report.categories
    $audits = $report.audits
    
    Write-Host ""
    Write-Host "  Puntuaciones:" -ForegroundColor Cyan
    
    # Performance
    $perfScore = $categories.performance.score * 100
    $perfColor = if ($perfScore -ge 90) { "Green" } elseif ($perfScore -ge 50) { "Yellow" } else { "Red" }
    Write-Host "  • Performance: $([math]::Round($perfScore, 1))/100" -ForegroundColor $perfColor
    
    # Accessibility
    $accScore = $categories.accessibility.score * 100
    $accColor = if ($accScore -ge 90) { "Green" } elseif ($accScore -ge 50) { "Yellow" } else { "Red" }
    Write-Host "  • Accessibility: $([math]::Round($accScore, 1))/100" -ForegroundColor $accColor
    
    # Best Practices
    $bpScore = $categories['best-practices'].score * 100
    $bpColor = if ($bpScore -ge 90) { "Green" } elseif ($bpScore -ge 50) { "Yellow" } else { "Red" }
    Write-Host "  • Best Practices: $([math]::Round($bpScore, 1))/100" -ForegroundColor $bpColor
    
    # SEO
    $seoScore = $categories.seo.score * 100
    $seoColor = if ($seoScore -ge 90) { "Green" } elseif ($seoScore -ge 50) { "Yellow" } else { "Red" }
    Write-Host "  • SEO: $([math]::Round($seoScore, 1))/100" -ForegroundColor $seoColor
    
    Write-Host ""
    Write-Host "  Core Web Vitals:" -ForegroundColor Cyan
    
    # LCP
    if ($audits.'largest-contentful-paint') {
        $lcp = $audits.'largest-contentful-paint'.numericValue / 1000
        $lcpColor = if ($lcp -lt 2.5) { "Green" } elseif ($lcp -lt 4) { "Yellow" } else { "Red" }
        Write-Host "  • LCP: $([math]::Round($lcp, 2))s (objetivo: <2.5s)" -ForegroundColor $lcpColor
    }
    
    # CLS
    if ($audits.'cumulative-layout-shift') {
        $cls = $audits.'cumulative-layout-shift'.numericValue
        $clsColor = if ($cls -lt 0.1) { "Green" } elseif ($cls -lt 0.25) { "Yellow" } else { "Red" }
        Write-Host "  • CLS: $([math]::Round($cls, 3)) (objetivo: <0.1)" -ForegroundColor $clsColor
    }
    
    # TBT (Total Blocking Time - proxy para FID/INP)
    if ($audits.'total-blocking-time') {
        $tbt = $audits.'total-blocking-time'.numericValue / 1000
        $tbtColor = if ($tbt -lt 0.2) { "Green" } elseif ($tbt -lt 0.6) { "Yellow" } else { "Red" }
        Write-Host "  • TBT: $([math]::Round($tbt, 2))s (objetivo: <0.2s)" -ForegroundColor $tbtColor
    }
    
    Write-Host ""
    
    # Verificar si cumple objetivos
    $allGood = ($perfScore -ge 100 -and $accScore -ge 100 -and $bpScore -ge 100 -and $seoScore -ge 100)
    
    if ($allGood) {
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║  ✓ ¡PUNTUACIÓN PERFECTA 100/100 EN TODAS LAS CATEGORÍAS!  ║" -ForegroundColor Green
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    } else {
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
        Write-Host "║  ⚠ ALGUNAS CATEGORÍAS NECESITAN MEJORA                     ║" -ForegroundColor Yellow
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Abre el reporte HTML para ver recomendaciones detalladas:" -ForegroundColor White
        Write-Host "  $outputPath" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ✗ No se pudo leer el reporte JSON" -ForegroundColor Red
}

Write-Host ""
Write-Host "[4/4] Resumen..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "Para abrir el reporte en el navegador:" -ForegroundColor White
Write-Host "  start $outputPath" -ForegroundColor Gray
Write-Host ""
Write-Host "O usa Chrome DevTools:" -ForegroundColor White
Write-Host "  1. Abre $DeploymentUrl" -ForegroundColor Gray
Write-Host "  2. F12 → Lighthouse" -ForegroundColor Gray
Write-Host "  3. Click en 'Analyze page load'" -ForegroundColor Gray
Write-Host ""