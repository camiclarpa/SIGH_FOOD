Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA: Integración Real con CRM (Pipedrive)              ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar configuración
$envPath = ".\.env"
if (!(Test-Path $envPath)) {
    Write-Host " No se encontró el archivo .env" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envPath -Raw
$hasToken = $envContent -match "PIPEDRIVE_API_TOKEN=your_pipedrive_api_token_here"

if ($hasToken) {
    Write-Host "⚠ MODO MOCK DETECTADO:" -ForegroundColor Yellow
    Write-Host "  Estás usando el token de ejemplo. El Worker usará el MockCRMClient." -ForegroundColor Gray
    Write-Host "  Para usar Pipedrive real, obtén tu API token en:" -ForegroundColor Gray
    Write-Host "  https://app.pipedrive.com/settings/api" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "El script continuará con el modo mock para validar la estructura..." -ForegroundColor Yellow
} else {
    Write-Host "✓ Token de Pipedrive configurado. Usando cliente real." -ForegroundColor Green
}

Write-Host ""
Write-Host "Verificando que el servidor Edge esté corriendo..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✓ Servidor Edge está corriendo" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ No se pudo conectar al servidor Edge" -ForegroundColor Red
    Write-Host "  Ejecuta: .\scripts\07-Run-Local.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Enviando lead de prueba..." -ForegroundColor Yellow

$leadData = @{
    establishmentName = "Gastrobar El Rincón"
    decisionMaker = "Carlos Rodríguez"
    phone = "+57 300 123 4567"
    topLiquors = "Gin, Mezcal, Ron Añejo"
    estimatedWeeklyVolume = 150
} | ConvertTo-Json

try {
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/leads" -Method Post -Body $leadData -ContentType "application/json" -TimeoutSec 10
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host ""
    Write-Host "✓ Respuesta recibida en $([math]::Round($duration, 2)) ms" -ForegroundColor Green
    Write-Host "  Status Code: $($response.StatusCode)" -ForegroundColor Green
    
    $responseBody = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 202) {
        Write-Host "  ✓ ¡202 Accepted! Lead encolado exitosamente" -ForegroundColor Green
        Write-Host "  Idempotency Key: $($responseBody.idempotencyKey)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Ahora inicia el Worker para procesar el lead:" -ForegroundColor Yellow
        Write-Host "  .\scripts\03-Start-Worker.ps1" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Y observa los logs en tiempo real:" -ForegroundColor Yellow
        Write-Host "  Get-Content worker-output.log -Tail 20 -Wait" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Error al enviar lead: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray