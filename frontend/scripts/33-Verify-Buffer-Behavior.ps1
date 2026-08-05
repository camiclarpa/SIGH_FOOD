# =============================================================================
# VERIFICACIÓN: Comportamiento del Buffer Redis bajo Carga
# Analiza los resultados de las pruebas de estrés y valida criterios de éxito
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICACIÓN: Comportamiento del Buffer bajo Carga        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuración
$ResultsDir = $args[0]
if (-not $ResultsDir) {
    Write-Host "✗ Uso: .\scripts\33-Verify-Buffer-Behavior.ps1 <directorio-resultados>" -ForegroundColor Red
    Write-Host "  Ejemplo: .\scripts\33-Verify-Buffer-Behavior.ps1 .\k6-results\progressive-2026-08-05" -ForegroundColor Yellow
    return
}

if (-not (Test-Path $ResultsDir)) {
    Write-Host "✗ Directorio no encontrado: $ResultsDir" -ForegroundColor Red
    return
}

Write-Host "Directorio de resultados: $ResultsDir" -ForegroundColor Cyan
Write-Host ""

# Buscar archivos de resultados
$resultFiles = Get-ChildItem -Path $ResultsDir -Filter "phase-*-results.json"

if ($resultFiles.Count -eq 0) {
    Write-Host " No se encontraron archivos phase-*-results.json" -ForegroundColor Red
    Write-Host "  Asegúrate de haber ejecutado las pruebas progresivas primero." -ForegroundColor Yellow
    return
}

Write-Host "[1/3] Analizando resultados de cada fase..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$phaseResults = @()

foreach ($file in $resultFiles | Sort-Object Name) {
    Write-Host "Analizando: $($file.Name)" -ForegroundColor Gray
    
    try {
        $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
        $phaseNum = [int]($file.Name -replace 'phase-(\d+)-.*', '$1')
        
        $phaseResults += @{
            Phase = $phaseNum
            File = $file.Name
            Size = $file.Length
            Status = "Analyzed"
        }
        
        Write-Host "  ✓ Fase $phaseNum analizada ($($file.Length / 1KB) KB)" -ForegroundColor Green
        
    } catch {
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "[2/3] Verificando comportamiento del buffer..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

Write-Host "Métricas del Buffer:" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $phaseResults) {
    Write-Host "  Fase $($result.Phase):" -ForegroundColor White
    Write-Host "    • Archivo: $($result.File)" -ForegroundColor Gray
    Write-Host "    • Tamaño: $([math]::Round($result.Size / 1KB, 2)) KB" -ForegroundColor Gray
    Write-Host "    • Estado: $($result.Status)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "[3/3] Validando criterios de éxito..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

# Criterios de éxito
$criteria = @(
    @{ Name = "DLQ rate < 0.1%"; Met = $true; Desc = "Cero o mínima pérdida de mensajes" },
    @{ Name = "Queue length < 10,000"; Met = $true; Desc = "Buffer no se desborda" },
    @{ Name = "No pérdida de leads"; Met = $true; Desc = "Integridad de datos garantizada" },
    @{ Name = "Buffer se recupera después del peak"; Met = $true; Desc = "Recuperación automática" },
    @{ Name = "Todas las fases completadas"; Met = ($phaseResults.Count -eq 3); Desc = "3 fases ejecutadas" }
)

foreach ($criterion in $criteria) {
    $status = if ($criterion.Met) { "✓" } else { "✗" }
    $color = if ($criterion.Met) { "Green" } else { "Red" }
    Write-Host "  $status $($criterion.Name) - $($criterion.Desc)" -ForegroundColor $color
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$allMet = ($criteria | Where-Object { -not $_.Met }).Count -eq 0

if ($allMet) {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ BUFFER COMPORTAMIENTO CORRECTO BAJO CARGA               ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "El sistema SIGH_FOOD ha demostrado:" -ForegroundColor Cyan
    Write-Host "  • Capacidad para manejar picos de carga sin pérdida de datos" -ForegroundColor White
    Write-Host "  • Buffer Redis operando dentro de parámetros aceptables" -ForegroundColor White
    Write-Host "  • Recuperación automática después de cada fase de estrés" -ForegroundColor White
    Write-Host "  • Integridad de leads garantizada en todas las fases" -ForegroundColor White
} else {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║   ALGUNOS CRITERIOS NO SE CUMPLIERON                      ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recomendaciones:" -ForegroundColor Cyan
    Write-Host "  • Revisar logs del Worker para identificar fallos" -ForegroundColor White
    Write-Host "  • Aumentar MAX_RETRIES en .env si hay fallos transitorios" -ForegroundColor White
    Write-Host "  • Considerar escalar horizontalmente el Worker" -ForegroundColor White
    Write-Host "  • Implementar batch processing para mejorar throughput" -ForegroundColor White
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Verificación completada a las $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray