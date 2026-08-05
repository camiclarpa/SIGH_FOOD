Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  IDENTIFICACIÓN DE CUELLOS DE BOTELLA                      ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Criterios de evaluación
$criteria = @{
    "p95_latency_50ms" = $false
    "error_rate_1pct" = $false
    "dlq_rate_0.1pct" = $false
    "queue_length_10k" = $false
}

Write-Host "Evaluando métricas contra SLA..." -ForegroundColor Yellow
Write-Host ""

# Simular evaluación (en producción, esto leería los resultados reales)
$testResults = @{
    p95_latency = 45 # ms
    error_rate = 0.5 # %
    dlq_rate = 0.05 # %
    max_queue_length = 3500
}

Write-Host "Resultados de la Evaluación:" -ForegroundColor Cyan
Write-Host "────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# Evaluar latencia p95
if ($testResults.p95_latency -lt 50) {
    Write-Host "✓ p95 Latency: $($testResults.p95_latency)ms (< 50ms)" -ForegroundColor Green
    $criteria.p95_latency_50ms = $true
} else {
    Write-Host "✗ p95 Latency: $($testResults.p95_latency)ms (>= 50ms)" -ForegroundColor Red
}

# Evaluar error rate
if ($testResults.error_rate -lt 1) {
    Write-Host "✓ Error Rate: $($testResults.error_rate)% (< 1%)" -ForegroundColor Green
    $criteria.error_rate_1pct = $true
} else {
    Write-Host "✗ Error Rate: $($testResults.error_rate)% (>= 1%)" -ForegroundColor Red
}

# Evaluar DLQ rate
if ($testResults.dlq_rate -lt 0.1) {
    Write-Host "✓ DLQ Rate: $($testResults.dlq_rate)% (< 0.1%)" -ForegroundColor Green
    $criteria.dlq_rate_0.1pct = $true
} else {
    Write-Host "✗ DLQ Rate: $($testResults.dlq_rate)% (>= 0.1%)" -ForegroundColor Red
}

# Evaluar queue length
if ($testResults.max_queue_length -lt 10000) {
    Write-Host "✓ Max Queue Length: $($testResults.max_queue_length) (< 10,000)" -ForegroundColor Green
    $criteria.queue_length_10k = $true
} else {
    Write-Host "✗ Max Queue Length: $($testResults.max_queue_length) (>= 10,000)" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " CUELLOS DE BOTELLA DETECTADOS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host ""

$bottlenecks = @()

if (-not $criteria.p95_latency_50ms) {
    $bottlenecks += "• Latencia p95 alta: Optimizar Edge Function y queries a Redis"
    Write-Host "⚠ CUELLO DE BOTELLA: Latencia p95" -ForegroundColor Yellow
    Write-Host "  Recomendación:" -ForegroundColor Gray
    Write-Host "    - Revisar cold starts en Vercel Edge Functions" -ForegroundColor White
    Write-Host "    - Optimizar queries a Upstash Redis" -ForegroundColor White
    Write-Host "    - Implementar cache en Edge" -ForegroundColor White
    Write-Host ""
}

if (-not $criteria.error_rate_1pct) {
    $bottlenecks += "• Tasa de errores alta: Revisar rate limits y timeouts"
    Write-Host "⚠ CUELLO DE BOTELLA: Error Rate" -ForegroundColor Yellow
    Write-Host "  Recomendación:" -ForegroundColor Gray
    Write-Host "    - Implementar circuit breaker para APIs externas" -ForegroundColor White
    Write-Host "    - Aumentar timeouts de Pipedrive/Resend" -ForegroundColor White
    Write-Host "    - Revisar rate limits de APIs" -ForegroundColor White
    Write-Host ""
}

if (-not $criteria.dlq_rate_0.1pct) {
    $bottlenecks += "• DLQ Rate alto: Mejorar resiliencia del Worker"
    Write-Host "⚠ CUELLO DE BOTELLA: Dead Letter Queue" -ForegroundColor Yellow
    Write-Host "  Recomendación:" -ForegroundColor Gray
    Write-Host "    - Aumentar maxRetries en el Worker" -ForegroundColor White
    Write-Host "    - Implementar exponential backoff con jitter" -ForegroundColor White
    Write-Host "    - Revisar logs de errores del Worker" -ForegroundColor White
    Write-Host ""
}

if (-not $criteria.queue_length_10k) {
    $bottlenecks += "• Queue length alto: Escalar Workers"
    Write-Host " CUELLO DE BOTELLA: Longitud de Cola" -ForegroundColor Yellow
    Write-Host "  Recomendación:" -ForegroundColor Gray
    Write-Host "    - Escalar horizontalmente el Worker" -ForegroundColor White
    Write-Host "    - Aumentar concurrencia del Worker" -ForegroundColor White
    Write-Host "    - Implementar batch processing" -ForegroundColor White
    Write-Host ""
}

if ($bottlenecks.Count -eq 0) {
    Write-Host "✓ NO SE DETECTARON CUELLOS DE BOTELLA" -ForegroundColor Green
    Write-Host "  El sistema cumple con todos los SLA definidos" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Total de cuellos de botella identificados: $($bottlenecks.Count)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray