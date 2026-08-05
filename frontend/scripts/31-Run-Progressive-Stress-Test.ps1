# =============================================================================
# PRUEBAS DE ESTRÉS PROGRESIVAS: 1k → 5k → 10k Usuarios
# Ejecuta 3 fases de carga con pausas de estabilización entre ellas
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  PRUEBAS DE ESTRÉS PROGRESIVAS: 1k → 5k → 10k              ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuración
$DeploymentUrl = $args[0]
if (-not $DeploymentUrl) {
    Write-Host "✗ Uso: .\scripts\31-Run-Progressive-Stress-Test.ps1 <URL>" -ForegroundColor Red
    Write-Host "  Ejemplo: .\scripts\31-Run-Progressive-Stress-Test.ps1 https://sighfood.vercel.app" -ForegroundColor Yellow
    return
}

Write-Host "URL de producción: $DeploymentUrl" -ForegroundColor Cyan
Write-Host ""

# Verificar k6
try {
    $k6Version = k6 version 2>&1
    Write-Host "✓ k6 instalado: $k6Version" -ForegroundColor Green
} catch {
    Write-Host "✗ k6 no está instalado" -ForegroundColor Red
    return
}
Write-Host ""

# Directorio de resultados
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$resultsDir = "$PWD\k6-results\progressive-${timestamp}"
if (-not (Test-Path $resultsDir)) {
    New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
}

# Configuración de fases
$phases = @(
    @{ Name = "Fase 1: 1,000 usuarios"; Users = 1000; Duration = "5m" },
    @{ Name = "Fase 2: 5,000 usuarios"; Users = 5000; Duration = "5m" },
    @{ Name = "Fase 3: 10,000 usuarios"; Users = 10000; Duration = "5m" }
)

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host " CONFIGURACIÓN DE PRUEBAS PROGRESIVAS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host ""

foreach ($phase in $phases) {
    Write-Host "  $($phase.Name)" -ForegroundColor White
    Write-Host "    • Duración: $($phase.Duration)" -ForegroundColor Gray
    Write-Host "    • Usuarios: $($phase.Users)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "⚠ ADVERTENCIA: Las pruebas completas durarán ~25 minutos" -ForegroundColor Yellow
Write-Host "  (3 fases de 5 min + 5 min de espera entre fases)" -ForegroundColor Yellow
Write-Host ""

# Función para generar script k6 dinámico
function New-K6Script {
    param([int]$Users, [string]$Duration)
    
    return @"
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const leadCreationTime = new Trend('lead_creation_time', true);
const errorRate = new Rate('errors');
const leadsPerSecond = new Counter('leads_per_second');

export const options = {
  stages: [
    { duration: '1m', target: $Users },
    { duration: '$Duration', target: $Users },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration{p(95)}': ['<50'],
    'http_req_failed': ['<0.01'],
    'lead_creation_time': ['p(95)<50'],
    'errors': ['rate<0.01'],
  },
};

const testLeads = [
  { establishmentName: 'Bar Test 1', decisionMaker: 'User 1', phone: '+573001234567', topLiquors: 'Gin', estimatedWeeklyVolume: 150 },
  { establishmentName: 'Bar Test 2', decisionMaker: 'User 2', phone: '+573012345678', topLiquors: 'Whisky', estimatedWeeklyVolume: 300 },
  { establishmentName: 'Bar Test 3', decisionMaker: 'User 3', phone: '+573023456789', topLiquors: 'Ron', estimatedWeeklyVolume: 200 },
];

export default function () {
  const lead = testLeads[Math.floor(Math.random() * testLeads.length)];
  
  const response = http.post(`${__ENV.BASE_URL}/api/leads`, JSON.stringify(lead), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  leadCreationTime.add(response.timings.duration);
  
  if (response.status === 202) {
    leadsPerSecond.add(1);
  } else {
    errorRate.add(1);
  }
  
  sleep(Math.random() * 2 + 1);
}
"@
}

# Ejecutar fases
$results = @()
$currentPhase = 1

foreach ($phase in $phases) {
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host " INICIANDO $($phase.Name)" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
    Write-Host ""
    Write-Host "Hora de inicio: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    
    # Generar script k6 para esta fase
    $scriptContent = New-K6Script -Users $phase.Users -Duration $phase.Duration
    $scriptPath = "$resultsDir\phase-${currentPhase}.js"
    [System.IO.File]::WriteAllText($scriptPath, $scriptContent, [System.Text.Encoding]::UTF8)
    
    $phaseResultPath = "$resultsDir\phase-${currentPhase}-results.json"
    
    try {
        # Ejecutar k6
        $env:BASE_URL = $DeploymentUrl
        k6 run --out json=${phaseResultPath} $scriptPath 2>&1 | Tee-Object -Variable k6Output
        
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host " $($phase.Name) - COMPLETADA" -ForegroundColor Green
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
        Write-Host ""
        Write-Host "Resultados guardados en: $phaseResultPath" -ForegroundColor Gray
        
        $results += @{
            Phase = $currentPhase
            Name = $phase.Name
            Users = $phase.Users
            Status = "Completed"
            Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        }
        
    } catch {
        Write-Host ""
        Write-Host "✗ Error en $($phase.Name): $($_.Exception.Message)" -ForegroundColor Red
        
        $results += @{
            Phase = $currentPhase
            Name = $phase.Name
            Users = $phase.Users
            Status = "Failed"
            Error = $_.Exception.Message
            Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        }
    }
    
    $currentPhase++
    
    # Esperar entre fases (excepto después de la última)
    if ($currentPhase -le $phases.Count) {
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Yellow
        Write-Host " ESPERANDO 5 MINUTOS PARA ESTABILIZACIÓN DEL SISTEMA" -ForegroundColor Yellow
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
        Write-Host ""
        Write-Host "Hora actual: $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Gray
        Write-Host "Reanudando a las: $((Get-Date).AddMinutes(5).ToString('HH:mm:ss'))" -ForegroundColor Gray
        Write-Host ""
        
        for ($i = 300; $i -gt 0; $i--) {
            Write-Host "`rEsperando: $i segundos restantes..." -NoNewline -ForegroundColor Gray
            Start-Sleep -Seconds 1
        }
        Write-Host ""
        Write-Host ""
    }
}

# Resumen final
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " RESUMEN FINAL DE PRUEBAS PROGRESIVAS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host ""

foreach ($result in $results) {
    $statusColor = if ($result.Status -eq "Completed") { "Green" } else { "Red" }
    Write-Host "  Fase $($result.Phase): $($result.Name)" -ForegroundColor White
    Write-Host "    • Estado: $($result.Status)" -ForegroundColor $statusColor
    Write-Host "    • Usuarios: $($result.Users)" -ForegroundColor Gray
    Write-Host "    • Hora: $($result.Timestamp)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Resultados completos en: $resultsDir" -ForegroundColor White
Write-Host ""
Write-Host "Para analizar resultados, ejecuta:" -ForegroundColor Yellow
Write-Host "  .\scripts\29-Analyze-Load-Test-Results.ps1 -ResultPath $resultsDir\phase-*.json" -ForegroundColor White
Write-Host ""