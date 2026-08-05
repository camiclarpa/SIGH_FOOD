Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBA: Sistema de Notificaciones Inteligentes            ║" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar configuración
$envPath = ".\.env"
if (!(Test-Path $envPath)) {
    Write-Host "✗ No se encontró el archivo .env" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envPath -Raw
$hasResend = $envContent -match "RESEND_API_KEY=your_resend_api_key_here"
$hasTwilio = $envContent -match "TWILIO_ACCOUNT_SID=your_twilio_account_sid_here"

Write-Host "Estado de configuración de notificaciones:" -ForegroundColor Yellow
if ($hasResend) {
    Write-Host "  📧 Email (Resend): MODO MOCK" -ForegroundColor Yellow
} else {
    Write-Host "  📧 Email (Resend): CONFIGURADO" -ForegroundColor Green
}

if ($hasTwilio) {
    Write-Host "  💬 WhatsApp (Twilio): MODO MOCK" -ForegroundColor Yellow
} else {
    Write-Host "  💬 WhatsApp (Twilio): CONFIGURADO" -ForegroundColor Green
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Enviando 2 leads de prueba para probar el enrutamiento:" -ForegroundColor Yellow
Write-Host "  1. Lead NORMAL (< 300 tragos/semana) → Resumen email" -ForegroundColor White
Write-Host "  2. Lead PRIORITARIO (>= 300 tragos/semana) → Alerta inmediata" -ForegroundColor White
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
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

# Lead 1: Normal (150 tragos/semana)
Write-Host "[1/2] Enviando lead NORMAL (150 tragos/semana)..." -ForegroundColor Cyan
$normalLead = @{
    establishmentName = "Bar La Esquina"
    decisionMaker = "Ana Martínez"
    phone = "+57 301 234 5678"
    topLiquors = "Ron, Gin"
    estimatedWeeklyVolume = 150
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/leads" -Method Post -Body $normalLead -ContentType "application/json" -TimeoutSec 10
    if ($response.StatusCode -eq 202) {
        Write-Host "  ✓ 202 Accepted - Lead encolado" -ForegroundColor Green
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Lead 2: Prioritario (400 tragos/semana)
Write-Host "[2/2] Enviando lead PRIORITARIO (400 tragos/semana)..." -ForegroundColor Cyan
$priorityLead = @{
    establishmentName = "Rooftop Sky Lounge"
    decisionMaker = "Carlos Rodríguez (Gerente A&B)"
    phone = "+57 300 987 6543"
    topLiquors = "Mezcal, Whisky, Gin Premium"
    estimatedWeeklyVolume = 400
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/leads" -Method Post -Body $priorityLead -ContentType "application/json" -TimeoutSec 10
    if ($response.StatusCode -eq 202) {
        Write-Host "  ✓ 202 Accepted - Lead encolado" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Leads enviados. Ahora inicia el Worker para procesarlos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Stop-Process -Name 'node' -Force -ErrorAction SilentlyContinue" -ForegroundColor Gray
Write-Host "  2. .\scripts\03-Start-Worker.ps1" -ForegroundColor Gray
Write-Host "  3. Get-Content worker-output.log -Tail 20 -Wait" -ForegroundColor Gray
Write-Host ""
Write-Host "Deberías ver en los logs:" -ForegroundColor Cyan
Write-Host "  • Lead NORMAL → 'Lead de valor normal, acumulando para resumen diario'" -ForegroundColor White
Write-Host "  • Lead PRIORITARIO → 'Lead de ALTO VALOR detectado, enviando alerta inmediata'" -ForegroundColor White
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray