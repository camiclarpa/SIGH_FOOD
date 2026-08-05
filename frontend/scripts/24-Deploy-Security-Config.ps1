Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DESPLIEGUE: Configuración de Seguridad y Cache            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar archivos
Write-Host "[1/3] Verificando archivos de configuración..." -ForegroundColor Yellow

$files = @{
    "vercel.json" = (Test-Path "vercel.json")
    "next.config.js" = (Test-Path "next.config.js")
}

$allGood = $true
foreach ($file in $files.GetEnumerator()) {
    if ($file.Value) {
        Write-Host "  ✓ $($file.Key) existe" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $($file.Key) NO existe" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host ""
    Write-Host "✗ Faltan archivos críticos. Ejecuta primero la Tarea 3." -ForegroundColor Red
    return
}
Write-Host ""

# Desplegar
Write-Host "[2/3] Desplegando cambios de seguridad a Vercel..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

try {
    $deployOutput = vercel --prod 2>&1
    Write-Host $deployOutput -ForegroundColor White
    
    # Extraer URL
    $deploymentUrl = ($deployOutput | Select-String "https://.*\.vercel\.app" | Select-Object -First 1).ToString().Trim()
    
    if ($deploymentUrl) {
        Write-Host ""
        Write-Host "[3/3] Verificando configuración de seguridad..." -ForegroundColor Yellow
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
        Write-Host ""
        
        # Esperar 10 segundos para que el deploy se propague
        Write-Host "Esperando 10s para propagación del deploy..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
        
        # Ejecutar verificación
        & ".\scripts\23-Verify-Security.ps1" -DeploymentUrl $deploymentUrl
    }
} catch {
    Write-Host ""
    Write-Host " Error en el despliegue: $($_.Exception.Message)" -ForegroundColor Red
}