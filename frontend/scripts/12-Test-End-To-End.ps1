Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA E2E: Flujo Completo SIGH_FOOD                      ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuración
$baseUrl = "http://localhost:3001"
$testResults = @{
    Total = 0
    Passed = 0
    Failed = 0
}

function Test-Step {
    param([string]$StepName, [scriptblock]$Test)
    
    $testResults.Total++
    Write-Host "[$($testResults.Total)/5] $StepName..." -ForegroundColor Yellow
    
    try {
        & $Test
        $testResults.Passed++
        Write-Host "  ✓ PASÓ" -ForegroundColor Green
    } catch {
        $testResults.Failed++
        Write-Host "  ✗ FALLÓ: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# ============================================================================
# PASO 1: Verificar que el servidor Edge esté corriendo
# ============================================================================
Test-Step -StepName "Verificar servidor Edge" -Test {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -ne 200) {
        throw "Servidor respondió con código $($response.StatusCode)"
    }
    
    $body = $response.Content | ConvertFrom-Json
    if ($body.status -ne "healthy") {
        throw "Servidor no está healthy: $($body.status)"
    }
    
    Write-Host "  Servidor version: $($body.version)" -ForegroundColor Gray
}

# ============================================================================
# PASO 2: Enviar lead de prueba y capturar idempotencyKey
# ============================================================================
$global:idempotencyKey = $null

Test-Step -StepName "Enviar lead de prueba (POST /api/leads)" -Test {
    $leadData = @{
        establishmentName = "Gastrobar El Rincón"
        decisionMaker = "Carlos Rodríguez"
        phone = "+57 300 123 4567"
        topLiquors = "Gin, Mezcal, Ron Añejo"
        estimatedWeeklyVolume = 250
    } | ConvertTo-Json

    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$baseUrl/api/leads" -Method Post -Body $leadData -ContentType "application/json" -TimeoutSec 10
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds

    if ($response.StatusCode -ne 202) {
        throw "Esperado 202, recibido $($response.StatusCode)"
    }

    $body = $response.Content | ConvertFrom-Json
    $global:idempotencyKey = $body.idempotencyKey

    Write-Host "  Respuesta en $([math]::Round($duration, 2)) ms" -ForegroundColor Gray
    Write-Host "  Idempotency Key: $global:idempotencyKey" -ForegroundColor Gray
    
    if (-not $global:idempotencyKey) {
        throw "No se recibió idempotencyKey"
    }
}

# ============================================================================
# PASO 3: Consultar Status API inmediatamente (debería ser 'queued')
# ============================================================================
Test-Step -StepName "Consultar Status API (estado inicial)" -Test {
    if (-not $global:idempotencyKey) {
        throw "No hay idempotencyKey disponible"
    }

    $response = Invoke-WebRequest -Uri "$baseUrl/api/leads/status?idempotencyKey=$global:idempotencyKey" -Method Get -TimeoutSec 5 -ErrorAction Stop
    
    if ($response.StatusCode -ne 200) {
        throw "Esperado 200, recibido $($response.StatusCode)"
    }

    $body = $response.Content | ConvertFrom-Json
    
    if (-not $body.success) {
        throw "Status API retornó success=false"
    }

    Write-Host "  Estado inicial: $($body.data.status)" -ForegroundColor Gray
    Write-Host "  Timestamp: $($body.data.timestamp)" -ForegroundColor Gray
    
    if ($body.data.status -notin @("queued", "processing", "processed")) {
        throw "Estado inesperado: $($body.data.status)"
    }
}

# ============================================================================
# PASO 4: Esperar 5 segundos y consultar nuevamente (Worker debería haber procesado)
# ============================================================================
Test-Step -StepName "Esperar procesamiento y consultar Status API (estado final)" -Test {
    if (-not $global:idempotencyKey) {
        throw "No hay idempotencyKey disponible"
    }

    Write-Host "  Esperando 5 segundos para que el Worker procese..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    $response = Invoke-WebRequest -Uri "$baseUrl/api/leads/status?idempotencyKey=$global:idempotencyKey" -Method Get -TimeoutSec 5 -ErrorAction Stop
    $body = $response.Content | ConvertFrom-Json

    Write-Host "  Estado final: $($body.data.status)" -ForegroundColor Gray
    
    if ($body.data.status -eq "processed") {
        Write-Host "  CRM Contact ID: $($body.data.crmContactId)" -ForegroundColor Gray
        Write-Host "  CRM Deal ID: $($body.data.crmDealId)" -ForegroundColor Gray
        Write-Host "  Notificación: $($body.data.notificationChannel)" -ForegroundColor Gray
    } elseif ($body.data.status -eq "queued") {
        Write-Host "  ⚠ El Worker no está corriendo o no procesó el lead" -ForegroundColor Yellow
    } elseif ($body.data.status -eq "dlq") {
        Write-Host "   El lead fue movido a DLQ: $($body.data.lastError)" -ForegroundColor Red
    }
}

# ============================================================================
# PASO 5: Validar que las pruebas de Vitest pasen
# ============================================================================
Test-Step -StepName "Ejecutar pruebas de Vitest (E2E)" -Test {
    $process = Start-Process -FilePath "npx" -ArgumentList "vitest", "run", "tests/sighfood-e2e.test.ts", "--reporter=verbose" -Wait -PassThru -NoNewWindow -RedirectStandardOutput "vitest-output.log" -RedirectStandardError "vitest-error.log"
    
    if ($process.ExitCode -ne 0) {
        $errorContent = Get-Content "vitest-error.log" -Raw
        throw "Vitest falló con código $($process.ExitCode): $errorContent"
    }
    
    Write-Host "  Todas las pruebas de Vitest pasaron" -ForegroundColor Gray
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host " RESULTADO DE PRUEBAS E2E:" -ForegroundColor Cyan
Write-Host "   Total   : $($testResults.Total)" -ForegroundColor White
Write-Host "   Pasaron : $($testResults.Passed)" -ForegroundColor Green
Write-Host "   Fallaron: $($testResults.Failed)" -ForegroundColor Red
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

if ($testResults.Failed -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ ¡TODAS LAS PRUEBAS E2E PASARON! SEMANA 3 COMPLETA       ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  ⚠ ALGUNAS PRUEBAS FALLARON. Revisa los errores arriba.    ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
}