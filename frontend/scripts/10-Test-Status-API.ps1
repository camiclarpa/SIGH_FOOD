Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA: API de Consulta de Estado (Status API)            ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar servidor
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Servidor Edge está corriendo" -ForegroundColor Green
} catch {
    Write-Host "✗ No se pudo conectar al servidor Edge" -ForegroundColor Red
    Write-Host "  Ejecuta: .\scripts\07-Run-Local.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PASO 1: Enviar un lead y capturar el idempotencyKey" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$leadData = @{
    establishmentName = "Gastrobar El Rincón"
    decisionMaker = "Carlos Rodríguez"
    phone = "+57 300 123 4567"
    topLiquors = "Gin, Mezcal, Ron Añejo"
    estimatedWeeklyVolume = 250
} | ConvertTo-Json

$idempotencyKey = $null

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/leads" -Method Post -Body $leadData -ContentType "application/json" -TimeoutSec 10
    
    if ($response.StatusCode -eq 202) {
        $responseBody = $response.Content | ConvertFrom-Json
        $idempotencyKey = $responseBody.idempotencyKey
        Write-Host "✓ Lead encolado exitosamente" -ForegroundColor Green
        Write-Host "  Idempotency Key: $idempotencyKey" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Error al enviar lead: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PASO 2: Consultar el estado del lead (inmediatamente)" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

try {
    $startTime = Get-Date
    $statusResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/leads/status?idempotencyKey=$idempotencyKey" -Method Get -TimeoutSec 5 -ErrorAction Stop
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    $statusBody = $statusResponse.Content | ConvertFrom-Json
    
    Write-Host "✓ Status API respondió en $([math]::Round($duration, 2)) ms" -ForegroundColor Green
    Write-Host "  Status Code: $($statusResponse.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Estado del lead:" -ForegroundColor Cyan
    Write-Host "  • idempotencyKey: $($statusBody.data.idempotencyKey)" -ForegroundColor White
    Write-Host "  • status: $($statusBody.data.status)" -ForegroundColor $(if ($statusBody.data.status -eq 'queued') { "Yellow" } else { "Green" })
    Write-Host "  • timestamp: $($statusBody.data.timestamp)" -ForegroundColor Gray
    Write-Host "  • duration: $($statusBody.metadata.duration)ms" -ForegroundColor Gray
    
    if ($statusBody.data.crmContactId) {
        Write-Host "  • crmContactId: $($statusBody.data.crmContactId)" -ForegroundColor Green
    }
    if ($statusBody.data.crmDealId) {
        Write-Host "  • crmDealId: $($statusBody.data.crmDealId)" -ForegroundColor Green
    }
    
} catch {
    Write-Host "✗ Error al consultar status: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PASO 3: Pruebas de validación" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

# Test: Parámetro faltante
Write-Host "[Test 1] Sin parámetro idempotencyKey..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/leads/status" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode) (esperado 400)" -ForegroundColor $(if ($response.StatusCode -eq 400) { "Green" } else { "Red" })
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode (esperado 400)" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
}

# Test: UUID inválido
Write-Host "[Test 2] Con UUID inválido..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/leads/status?idempotencyKey=invalid-uuid" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode) (esperado 400)" -ForegroundColor $(if ($response.StatusCode -eq 400) { "Green" } else { "Red" })
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode (esperado 400)" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
}

# Test: Lead inexistente
Write-Host "[Test 3] Con UUID válido pero lead inexistente..." -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/leads/status?idempotencyKey=00000000-0000-0000-0000-000000000000" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  Status: $($response.StatusCode) (esperado 404)" -ForegroundColor $(if ($response.StatusCode -eq 404) { "Green" } else { "Red" })
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  Status: $statusCode (esperado 404)" -ForegroundColor $(if ($statusCode -eq 404) { "Green" } else { "Red" })
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "PASO 4: Consulta final (después de que el Worker procese)" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "Si el Worker está corriendo, espera 5 segundos y vuelve a consultar:" -ForegroundColor White
Write-Host "  Start-Sleep -Seconds 5" -ForegroundColor Gray
Write-Host "  Invoke-WebRequest -Uri 'http://localhost:3001/api/leads/status?idempotencyKey=$idempotencyKey'" -ForegroundColor Gray
Write-Host ""
Write-Host "Deberías ver el estado cambiar de 'queued' → 'processing' → 'processed'" -ForegroundColor Cyan
Write-Host "Y los campos crmContactId y crmDealId populated." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray