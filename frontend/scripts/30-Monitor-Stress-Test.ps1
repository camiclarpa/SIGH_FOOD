param(
    [string]$DeploymentUrl,
    [int]$IntervalSeconds = 10
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  MONITOREO EN TIEMPO REAL: Pruebas de Estrés               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $DeploymentUrl) {
    Write-Host "✗ No se proporcionó URL" -ForegroundColor Red
    return
}

Write-Host "URL: $DeploymentUrl" -ForegroundColor Cyan
Write-Host "Intervalo: ${IntervalSeconds}s" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

try {
    while ($true) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timestamp] Verificando..." -ForegroundColor Gray
        
        # Health check
        try {
            $response = Invoke-WebRequest -Uri "$DeploymentUrl/health" -Method GET -TimeoutSec 5 -UseBasicParsing
            $status = $response.StatusCode
            $body = $response.Content | ConvertFrom-Json
            
            Write-Host "  ✓ Health: $status" -ForegroundColor Green
            Write-Host "    Status: $($body.status)" -ForegroundColor Gray
            
            if ($body.dependencies) {
                foreach ($dep in $body.dependencies.PSObject.Properties) {
                    $depStatus = if ($dep.Value.status -eq "up") { "✓" } else { "✗" }
                    Write-Host "    $depStatus $($dep.Name): $($dep.Value.status)" -ForegroundColor $(if ($dep.Value.status -eq "up") { "Green" } else { "Red" })
                }
            }
        } catch {
            Write-Host "  ✗ Health: Error - $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host ""
        Start-Sleep -Seconds $IntervalSeconds
    }
} catch {
    Write-Host ""
    Write-Host "Monitoreo detenido" -ForegroundColor Yellow
}