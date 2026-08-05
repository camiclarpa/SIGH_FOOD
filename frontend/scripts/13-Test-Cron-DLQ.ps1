Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA: Cron Job de Alertas DLQ                           ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Leer CRON_SECRET del .env
$envPath = ".\.env"
if (!(Test-Path $envPath)) {
    Write-Host " No se encontró el archivo .env" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envPath
$cronSecret = ($envContent | Where-Object { $_ -match "^CRON_SECRET=" }) -replace "^CRON_SECRET=", ""

if (-not $cronSecret -or $cronSecret -eq "") {
    Write-Host " CRON_SECRET no está configurado en el .env" -ForegroundColor Red
    exit 1
}

Write-Host "✓ CRON_SECRET leído del .env" -ForegroundColor Green
Write-Host ""

# Verificar servidor
Write-Host "Verificando servidor Next.js..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Servidor está corriendo" -ForegroundColor Green
} catch {
    # Intentar con la ruta de la Edge Function
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✓ Servidor Edge está corriendo (puerto 3001)" -ForegroundColor Green
        $baseUrl = "http://localhost:3001"
    } catch {
        Write-Host "✗ No se pudo conectar al servidor" -ForegroundColor Red
        Write-Host "  Ejecuta: pnpm dev" -ForegroundColor Yellow
        exit 1
    }
}

if (-not $baseUrl) { $baseUrl = "http://localhost:3000" }

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PRUEBA 1: Ejecutar Cron Job con autenticación válida" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$baseUrl/api/cron/check-dlq?secret=$cronSecret" -Method Get -TimeoutSec 10 -ErrorAction Stop
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    $body = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ Cron Job ejecutado en $([math]::Round($duration, 2)) ms" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultado:" -ForegroundColor Cyan
    Write-Host "  • success: $($body.success)" -ForegroundColor White
    Write-Host "  • alertSent: $($body.alertSent)" -ForegroundColor $(if ($body.alertSent) { "Yellow" } else { "Green" })
    Write-Host "  • dlqSize: $($body.dlqSize)" -ForegroundColor White
    Write-Host "  • duration: $($body.duration)ms" -ForegroundColor Gray
    
    if ($body.alertSent) {
        Write-Host ""
        Write-Host "  ⚠ Se envió una alerta porque hay leads en la DLQ" -ForegroundColor Yellow
        Write-Host "  Revisa el correo del equipo de ventas o los logs del servidor." -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "  ✓ DLQ limpia, no se enviaron alertas" -ForegroundColor Green
    }
    
} catch {
    Write-Host "✗ Error ejecutando Cron Job: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status Code: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PRUEBA 2: Intentar acceso sin autenticación (debe fallar)" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/cron/check-dlq" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor $(if ($response.StatusCode -eq 401) { "Green" } else { "Red" })
    Write-Host "  ⚠ Debería haber retornado 401 Unauthorized" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode (esperado 401)" -ForegroundColor $(if ($statusCode -eq 401) { "Green" } else { "Red" })
    if ($statusCode -eq 401) {
        Write-Host "  ✓ Protección funcionando correctamente" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PRUEBA 3: Simular DLQ con datos para probar alerta" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "Para probar una alerta real, necesitas:" -ForegroundColor White
Write-Host "  1. Tener credenciales de Resend configuradas en .env" -ForegroundColor Gray
Write-Host "  2. Tener al menos 1 lead en la DLQ (stream:sighfood-leads-dlq)" -ForegroundColor Gray
Write-Host ""
Write-Host "Puedes simular un fallo en el Worker para generar un lead en DLQ:" -ForegroundColor Gray
Write-Host "  • Detén el servidor de Pipedrive/CRM" -ForegroundColor Gray
Write-Host "  • Envía varios leads con el script 09-Test-Notifications.ps1" -ForegroundColor Gray
Write-Host "  • El Worker moverá los fallidos a la DLQ tras 3 reintentos" -ForegroundColor Gray
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray