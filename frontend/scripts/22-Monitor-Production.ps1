param(
    [string]$DeploymentUrl,
    [int]$IntervalSeconds = 60
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  MONITOREO CONTINUO DE PRODUCCIÓN                          ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $DeploymentUrl) {
    Write-Host "✗ No se proporcionó URL de despliegue" -ForegroundColor Red
    Write-Host "  Uso: .\scripts\22-Monitor-Production.ps1 -DeploymentUrl https://sighfood.vercel.app" -ForegroundColor Yellow
    return
}

Write-Host "URL de producción: $DeploymentUrl" -ForegroundColor Cyan
Write-Host "Intervalo de monitoreo: ${IntervalSeconds}s" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona Ctrl+C para detener el monitoreo" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

$monitoring = $true

try {
    while ($monitoring) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] Verificando endpoints..." -ForegroundColor Gray
        
        # Health Check
        try {
            $response = Invoke-WebRequest -Uri "$DeploymentUrl/health" -Method GET -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✓ /health → $($response.StatusCode) OK" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ /health → $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ✗ /health → Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Warmup
        try {
            $response = Invoke-WebRequest -Uri "$DeploymentUrl/api/warmup" -Method GET -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "  ✓ /api/warmup → $($response.StatusCode) OK" -ForegroundColor Green
            } else {
                Write-Host "  ⚠ /api/warmup → $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ✗ /api/warmup → Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Esperando ${IntervalSeconds}s..." -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
    }
} catch {
    Write-Host ""
    Write-Host "Monitoreo detenido" -ForegroundColor Yellow
}