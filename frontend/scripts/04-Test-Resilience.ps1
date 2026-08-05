Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA: Resiliencia y Reintentos                          ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar que el servidor esté corriendo
$testUrl = "http://localhost:3001/health"
Write-Host "Verificando servidor en $testUrl..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-WebRequest -Uri $testUrl -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✓ Servidor está corriendo" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ No se pudo conectar al servidor" -ForegroundColor Red
    Write-Host "  Ejecuta: .\scripts\07-Run-Local.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Enviando 5 leads de prueba para probar resiliencia..." -ForegroundColor Yellow
Write-Host "(El CRM simula 10% de fallos, así que deberías ver algunos reintentos)" -ForegroundColor Gray
Write-Host ""

$leadData = @{
    establishmentName = "Gastrobar El Rincón"
    decisionMaker = "Carlos Rodríguez"
    phone = "+57 300 123 4567"
    topLiquors = "Gin, Mezcal, Ron Añejo"
    estimatedWeeklyVolume = 150
}

$leadUrl = "http://localhost:3001/api/leads"
$successCount = 0
$failCount = 0

for ($i = 1; $i -le 5; $i++) {
    Write-Host "[$i/5] Enviando lead..." -ForegroundColor Cyan
    
    # Modificar ligeramente el nombre para que cada lead sea único
    $leadData.establishmentName = "Gastrobar El Rincón #$i"
    $body = $leadData | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri $leadUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
        
        if ($response.StatusCode -eq 202) {
            Write-Host "  ✓ 202 Accepted - Lead encolado" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Yellow
            $failCount++
        }
    } catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    # Pequeña pausa entre envíos
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "  ✓ Encolados exitosamente: $successCount" -ForegroundColor Green
Write-Host "  ✗ Fallos: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "Observa los logs del Worker para ver:" -ForegroundColor Yellow
Write-Host "  • Procesamientos exitosos (✅)" -ForegroundColor White
Write-Host "  • Reintentos con backoff (⏳)" -ForegroundColor White
Write-Host "  • Leads movidos a DLQ si superan 3 intentos ()" -ForegroundColor White
Write-Host ""
Write-Host "Comando para ver logs en vivo:" -ForegroundColor Cyan
Write-Host "  Get-Content worker-output.log -Tail 20 -Wait" -ForegroundColor Gray
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray