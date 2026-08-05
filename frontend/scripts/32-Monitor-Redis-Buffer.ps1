# =============================================================================
# SCRIPT DE MONITOREO REDIS (Versión sin parámetros - Lee .env automáticamente)
# Diseño: Seguro para pegar en consola o ejecutar como archivo
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  MONITOREO DE BUFFER REDIS (Automático)                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Leer credenciales directamente del archivo .env
$envPath = ".\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "✗ Error: No se encontró el archivo .env" -ForegroundColor Red
    return
}

$envContent = Get-Content $envPath -Raw
$redisUrl = ([regex]::Match($envContent, "UPSTASH_REDIS_REST_URL=(.*)")).Groups[1].Value.Trim()
$redisToken = ([regex]::Match($envContent, "UPSTASH_REDIS_REST_TOKEN=(.*)")).Groups[1].Value.Trim()

# 2. Validar credenciales
if ([string]::IsNullOrWhiteSpace($redisUrl) -or $redisUrl -match "your-region|your_token") {
    Write-Host "✗ Error: Las credenciales de Redis en .env no son válidas." -ForegroundColor Red
    Write-Host "  Por favor, abre .env y reemplaza UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN con tus valores reales de Upstash." -ForegroundColor Yellow
    return
}

Write-Host "✓ Credenciales cargadas desde .env" -ForegroundColor Green
$maskedUrl = if ($redisUrl.Length -gt 25) { "$($redisUrl.Substring(0, 25))..." } else { $redisUrl }
Write-Host "  URL: $maskedUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el monitoreo" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $redisToken"
    "Content-Type" = "application/json"
}

$metrics = @{ QueueLength = @(); DLQLength = @(); Timestamps = @() }
$interval = 10

try {
    while ($true) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        try {
            $queueResponse = Invoke-RestMethod -Uri "$redisUrl/XLEN/stream:sighfood-leads-queue" -Method POST -Headers $headers -Body '{}' -TimeoutSec 5
            $queueLength = $queueResponse.result
            
            $dlqResponse = Invoke-RestMethod -Uri "$redisUrl/XLEN/stream:sighfood-leads-dlq" -Method POST -Headers $headers -Body '{}' -TimeoutSec 5
            $dlqLength = $dlqResponse.result
            
            $today = Get-Date -Format "yyyy-MM-dd"
            $processedResponse = Invoke-RestMethod -Uri "$redisUrl/GET/metrics:processed:$today" -Method POST -Headers $headers -Body '{}' -TimeoutSec 5
            $processedCount = if ($processedResponse.result) { [int]$processedResponse.result } else { 0 }
            
            $metrics.QueueLength += $queueLength
            $metrics.DLQLength += $dlqLength
            $metrics.Timestamps += $timestamp
            
            $maxQueue = ($metrics.QueueLength | Measure-Object -Maximum).Maximum
            $avgQueue = [math]::Round(($metrics.QueueLength | Measure-Object -Average).Average, 2)
            $maxDLQ = ($metrics.DLQLength | Measure-Object -Maximum).Maximum
            
            $queueColor = if ($queueLength -lt 100) { "Green" } elseif ($queueLength -lt 1000) { "Yellow" } else { "Red" }
            $dlqColor = if ($dlqLength -eq 0) { "Green" } elseif ($dlqLength -lt 10) { "Yellow" } else { "Red" }
            
            Write-Host "[$timestamp] Buffer Status:" -ForegroundColor Cyan
            Write-Host "  • Queue Length: $queueLength (max: $maxQueue, avg: $avgQueue)" -ForegroundColor $queueColor
            Write-Host "  • DLQ Length: $dlqLength (max: $maxDLQ)" -ForegroundColor $dlqColor
            Write-Host "  • Processed Today: $processedCount" -ForegroundColor White
            Write-Host ""
            
            if ($queueLength -gt 1000) { Write-Host "  ⚠ ALERTA: Queue length > 1000" -ForegroundColor Red }
            if ($dlqLength -gt 0) { Write-Host "  ⚠ ALERTA: DLQ tiene $dlqLength mensajes" -ForegroundColor Yellow }
            
        } catch {
            Write-Host "[$timestamp] Error consultando Redis: $($_.Exception.Message)" -ForegroundColor Red
        }
        Start-Sleep -Seconds $interval
    }
} catch {
    Write-Host ""
    Write-Host "Monitoreo detenido" -ForegroundColor Yellow
}