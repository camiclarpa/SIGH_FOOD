Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA: Endpoint de Warmup y Cold Starts                  ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

Write-Host "Verificando servidor Next.js..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop | Out-Null
    Write-Host "✓ Servidor está corriendo en puerto 3000" -ForegroundColor Green
} catch {
    try {
        Invoke-WebRequest -Uri "$baseUrl" -Method Get -TimeoutSec 3 -ErrorAction Stop | Out-Null
        Write-Host "✓ Servidor está corriendo en puerto 3000" -ForegroundColor Green
    } catch {
        Write-Host "✗ No se pudo conectar al servidor en localhost:3000" -ForegroundColor Red
        Write-Host "  Ejecuta: pnpm dev" -ForegroundColor Yellow
        return
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PRUEBA 1: Primera llamada (Simula Cold Start)" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray

$startTime = Get-Date
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/warmup" -Method Get -TimeoutSec 10 -ErrorAction Stop
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    $body = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ Warmup respondido en $([math]::Round($duration, 2)) ms" -ForegroundColor Green
    Write-Host "  Status: $($body.status)" -ForegroundColor $(if ($body.status -eq 'warm') { "Green" } else { "Yellow" })
    Write-Host "  Latencia Redis: $($body.latency)" -ForegroundColor Gray
    Write-Host "  Timestamp: $($body.timestamp)" -ForegroundColor Gray
    
} catch {
    Write-Host "✗ Error en Warmup: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PRUEBA 2: Llamadas sucesivas (Simula estado 'Caliente')" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray

$totalDuration = 0
$iterations = 5

for ($i = 1; $i -le $iterations; $i++) {
    $startTime = Get-Date
    try {
        Invoke-WebRequest -Uri "$baseUrl/api/warmup" -Method Get -TimeoutSec 5 -ErrorAction Stop | Out-Null
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        $totalDuration += $duration
        Write-Host "  Iteración $i : $([math]::Round($duration, 2)) ms" -ForegroundColor Gray
    } catch {
        Write-Host "  Iteración $i : Error" -ForegroundColor Red
    }
}

$avgDuration = $totalDuration / $iterations
Write-Host ""
Write-Host "Promedio de latencia en estado caliente: $([math]::Round($avgDuration, 2)) ms" -ForegroundColor Cyan

if ($avgDuration -lt 50) {
    Write-Host "✓ ¡Excelente! La latencia promedio está por debajo de 50ms." -ForegroundColor Green
} else {
    Write-Host "⚠ La latencia es mayor a 50ms. En producción, el Warmup cada 5 min ayudará." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "INSTRUCCIONES PARA PRODUCCIÓN:" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Para mantener la función caliente en Vercel, configura un servicio externo:" -ForegroundColor White
Write-Host ""
Write-Host "Opción A: UptimeRobot (Gratis)" -ForegroundColor Cyan
Write-Host "  1. Ve a https://uptimerobot.com/" -ForegroundColor Gray
Write-Host "  2. Crea un nuevo monitor tipo 'HTTP(s)'" -ForegroundColor Gray
Write-Host "  3. URL: https://TU-DOMINIO.vercel.app/api/warmup" -ForegroundColor Gray
Write-Host "  4. Intervalo: 5 minutos" -ForegroundColor Gray
Write-Host ""
Write-Host "Opción B: Vercel Cron (Ya configurado en vercel.json)" -ForegroundColor Cyan
Write-Host "  El cron '*/5 * * * *' ejecutará este endpoint automáticamente." -ForegroundColor Gray
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray