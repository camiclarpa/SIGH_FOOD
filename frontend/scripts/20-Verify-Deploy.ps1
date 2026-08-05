param(
    [string]$DeploymentUrl
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICACIÓN: Endpoints en Producción                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $DeploymentUrl) {
    Write-Host "✗ No se proporcionó URL de despliegue" -ForegroundColor Red
    Write-Host "  Uso: .\scripts\20-Verify-Deploy.ps1 -DeploymentUrl https://sighfood.vercel.app" -ForegroundColor Yellow
    return
}

Write-Host "URL de producción: $DeploymentUrl" -ForegroundColor Cyan
Write-Host ""

# Endpoints a verificar
$endpoints = @(
    @{ Method = "GET"; Path = "/health"; ExpectedStatus = 200; Desc = "Health Check" },
    @{ Method = "GET"; Path = "/api/warmup"; ExpectedStatus = 200; Desc = "Warmup Endpoint" },
    @{ Method = "GET"; Path = "/admin/login"; ExpectedStatus = 200; Desc = "Admin Login Page" }
)

$results = @()

foreach ($ep in $endpoints) {
    Write-Host "Probando $($ep.Method) $($ep.Path)..." -ForegroundColor Yellow
    
    try {
        $url = "$($DeploymentUrl)$($ep.Path)"
        $startTime = Get-Date
        
        if ($ep.Method -eq "GET") {
            $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 10 -UseBasicParsing
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $statusOk = $response.StatusCode -eq $ep.ExpectedStatus
        $statusColor = if ($statusOk) { "Green" } else { "Red" }
        
        Write-Host "  Status: $($response.StatusCode) (esperado $($ep.ExpectedStatus))" -ForegroundColor $statusColor
        Write-Host "  Tiempo: $([math]::Round($duration, 2)) ms" -ForegroundColor Gray
        
        $results += @{
            Endpoint = "$($ep.Method) $($ep.Path)"
            Status = $response.StatusCode
            Expected = $ep.ExpectedStatus
            Duration = $duration
            OK = $statusOk
        }
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{
            Endpoint = "$($ep.Method) $($ep.Path)"
            Status = "Error"
            Expected = $ep.ExpectedStatus
            Duration = 0
            OK = $false
        }
    }
    Write-Host ""
}

# Probar POST /api/leads
Write-Host "Probando POST /api/leads..." -ForegroundColor Yellow
try {
    $testLead = @{
        establishmentName = "Test Bar Deploy"
        decisionMaker = "Deploy Tester"
        phone = "+573001234567"
        topLiquors = "Gin"
        estimatedWeeklyVolume = 100
    } | ConvertTo-Json
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$DeploymentUrl/api/leads" -Method POST -Body $testLead -ContentType "application/json" -TimeoutSec 10 -UseBasicParsing
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    $statusOk = $response.StatusCode -eq 202
    Write-Host "  Status: $($response.StatusCode) (esperado 202)" -ForegroundColor $(if ($statusOk) { "Green" } else { "Red" })
    Write-Host "  Tiempo: $([math]::Round($duration, 2)) ms" -ForegroundColor Gray
    
    $body = $response.Content | ConvertFrom-Json
    if ($body.idempotencyKey) {
        Write-Host "  ✓ idempotencyKey recibido: $($body.idempotencyKey)" -ForegroundColor Green
        
        # Guardar para probar status API
        $global:TestIdempotencyKey = $body.idempotencyKey
    }
    
    $results += @{
        Endpoint = "POST /api/leads"
        Status = $response.StatusCode
        Expected = 202
        Duration = $duration
        OK = $statusOk
    }
} catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    $results += @{
        Endpoint = "POST /api/leads"
        Status = "Error"
        Expected = 202
        Duration = 0
        OK = $false
    }
}
Write-Host ""

# Probar GET /api/leads/status si tenemos idempotencyKey
if ($global:TestIdempotencyKey) {
    Write-Host "Probando GET /api/leads/status..." -ForegroundColor Yellow
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri "$DeploymentUrl/api/leads/status?idempotencyKey=$global:TestIdempotencyKey" -Method GET -TimeoutSec 10 -UseBasicParsing
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Tiempo: $([math]::Round($duration, 2)) ms" -ForegroundColor Gray
        
        $results += @{
            Endpoint = "GET /api/leads/status"
            Status = $response.StatusCode
            Expected = "200/404"
            Duration = $duration
            OK = ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404)
        }
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Resumen
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host " RESUMEN DE VERIFICACIÓN" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White

$passed = ($results | Where-Object { $_.OK }).Count
$total = $results.Count

Write-Host "  Endpoints probados: $total" -ForegroundColor White
Write-Host "  Exitosos: $passed" -ForegroundColor Green
Write-Host "  Fallidos: $($total - $passed)" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
Write-Host ""

if ($passed -eq $total) {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ ¡TODOS LOS ENDPOINTS FUNCIONAN CORRECTAMENTE!          ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  ⚠ ALGUNOS ENDPOINTS FALLARON. Revisa los logs arriba.    ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
}