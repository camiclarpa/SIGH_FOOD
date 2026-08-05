Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA: Envío de Lead a Edge Function                     ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar que el servidor esté corriendo
$testUrl = "http://localhost:3001/health"
Write-Host "Verificando servidor en $testUrl..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-WebRequest -Uri $testUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✓ Servidor está corriendo" -ForegroundColor Green
    } else {
        Write-Host "⚠ Servidor respondió con código: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ No se pudo conectar al servidor" -ForegroundColor Red
    Write-Host "  Asegúrate de ejecutar: .\scripts\07-Run-Local.ps1" -ForegroundColor Yellow
    Write-Host "  O inicia manualmente: npx vercel dev --listen-port 3001" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Enviando lead de prueba..." -ForegroundColor Yellow

# Datos de prueba
$leadData = @{
    establishmentName = "Gastrobar El Rincón"
    decisionMaker = "Carlos Rodríguez"
    phone = "+57 300 123 4567"
    topLiquors = "Gin, Mezcal, Ron Añejo"
    estimatedWeeklyVolume = 150
} | ConvertTo-Json

$leadUrl = "http://localhost:3001/api/leads"

try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri $leadUrl -Method Post -Body $leadData -ContentType "application/json" -TimeoutSec 10
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host ""
    Write-Host "✓ Respuesta recibida en $([math]::Round($duration, 2)) ms" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Green
    
    $responseBody = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 202) {
        Write-Host "  ✓ ¡202 Accepted! Lead encolado exitosamente" -ForegroundColor Green
        Write-Host "  Idempotency Key: $($responseBody.idempotencyKey)" -ForegroundColor Cyan
        Write-Host "  Message ID: $($responseBody.messageId)" -ForegroundColor Cyan
        Write-Host "  Tiempo estimado de procesamiento: $($responseBody.metadata.estimatedProcessingTime)" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠ Respuesta inesperada: $($responseBody.message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Respuesta completa:" -ForegroundColor Gray
    Write-Host ($responseBody | ConvertTo-Json -Depth 5) -ForegroundColor DarkGray
    
} catch {
    Write-Host ""
    Write-Host "✗ Error al enviar lead: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Status Code: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 400) {
            Write-Host "  → Error de validación. Revisa los datos del lead." -ForegroundColor Yellow
        } elseif ($statusCode -eq 500) {
            Write-Host "  → Error del servidor. Revisa los logs." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA COMPLETADA                                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan