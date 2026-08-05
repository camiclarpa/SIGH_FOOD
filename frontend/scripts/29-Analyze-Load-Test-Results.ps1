param(
    [string]$ResultPath
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ANÁLISIS DE RESULTADOS: Pruebas de Estrés                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $ResultPath) {
    Write-Host "✗ No se proporcionó ruta de resultados" -ForegroundColor Red
    Write-Host "  Uso: .\scripts\29-Analyze-Load-Test-Results.ps1 -ResultPath .\k6-results\stress-test-*.json" -ForegroundColor Yellow
    return
}

if (-not (Test-Path $ResultPath)) {
    Write-Host "✗ Archivo no encontrado: $ResultPath" -ForegroundColor Red
    return
}

Write-Host "Archivo de resultados: $ResultPath" -ForegroundColor Cyan
Write-Host ""

# Leer y analizar JSON
Write-Host "[1/3] Cargando resultados..." -ForegroundColor Yellow

try {
    $results = Get-Content $ResultPath -Raw | ConvertFrom-Json
    Write-Host "  ✓ Resultados cargados" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error al cargar resultados: $($_.Exception.Message)" -ForegroundColor Red
    return
}
Write-Host ""

# Analizar métricas
Write-Host "[2/3] Analizando métricas..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

# Extraer métricas principales (esto es un ejemplo simplificado)
# En un análisis real, se procesarían todos los puntos de datos

Write-Host "Métricas Principales:" -ForegroundColor Cyan
Write-Host ""

# Simular análisis (en producción, esto leería el JSON completo)
Write-Host "  • Total de requests: [Calcular del JSON]" -ForegroundColor White
Write-Host "  • Duración total: [Calcular del JSON]" -ForegroundColor White
Write-Host "  • Usuarios máximos concurrentes: 10,000" -ForegroundColor White
Write-Host ""

Write-Host "Percentiles de Latencia:" -ForegroundColor Cyan
Write-Host "  • p50: [Calcular] ms" -ForegroundColor White
Write-Host "  • p90: [Calcular] ms" -ForegroundColor White
Write-Host "  • p95: [Calcular] ms (objetivo: <50ms)" -ForegroundColor White
Write-Host "  • p99: [Calcular] ms" -ForegroundColor White
Write-Host ""

Write-Host "Tasa de Errores:" -ForegroundColor Cyan
Write-Host "  • Total errors: [Calcular]" -ForegroundColor White
Write-Host "  • Error rate: [Calcular]% (objetivo: <1%)" -ForegroundColor White
Write-Host ""

Write-Host "Comportamiento del Buffer:" -ForegroundColor Cyan
Write-Host "  • Queue length (max): [Calcular]" -ForegroundColor White
Write-Host "  • Buffer utilization: [Calcular]%" -ForegroundColor White
Write-Host "  • DLQ rate: [Calcular]% (objetivo: <0.1%)" -ForegroundColor White
Write-Host ""

# Generar recomendaciones
Write-Host "[3/3] Generando recomendaciones..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

Write-Host "Recomendaciones:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Si p95 > 50ms:" -ForegroundColor White
Write-Host "     • Optimizar Edge Function (reducir cold starts)" -ForegroundColor Gray
Write-Host "     • Aumentar regiones Edge (iad1, gru1, etc.)" -ForegroundColor Gray
Write-Host "     • Revisar queries a Redis" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Si error rate > 1%:" -ForegroundColor White
Write-Host "     • Revisar rate limits de APIs externas (Pipedrive, Resend)" -ForegroundColor Gray
Write-Host "     • Implementar circuit breaker" -ForegroundColor Gray
Write-Host "     • Aumentar retry backoff" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Si DLQ rate > 0.1%:" -ForegroundColor White
Write-Host "     • Aumentar maxRetries en el Worker" -ForegroundColor Gray
Write-Host "     • Revisar logs de errores del Worker" -ForegroundColor Gray
Write-Host "     • Implementar dead letter queue monitoring" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Si buffer utilization > 80%:" -ForegroundColor White
Write-Host "     • Escalar horizontalmente el Worker" -ForegroundColor Gray
Write-Host "     • Aumentar concurrencia del Worker" -ForegroundColor Gray
Write-Host "     • Implementar batch processing" -ForegroundColor Gray
Write-Host ""

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Para un análisis detallado, revisa:" -ForegroundColor White
Write-Host "  • k6 summary (al final de la ejecución)" -ForegroundColor Gray
Write-Host "  • Grafana Cloud (si usaste k6 cloud)" -ForegroundColor Gray
Write-Host "  • Vercel Analytics (para métricas de producción)" -ForegroundColor Gray
Write-Host ""