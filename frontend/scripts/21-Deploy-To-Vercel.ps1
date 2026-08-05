Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DESPLIEGUE AUTOMATIZADO EN VERCEL                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar Vercel CLI
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✓ Vercel CLI instalado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host " Vercel CLI NO instalado" -ForegroundColor Red
    Write-Host "  Ejecuta: npm i -g vercel" -ForegroundColor Yellow
    return
}
Write-Host ""

# Verificar sesión
Write-Host "Verificando sesión de Vercel..." -ForegroundColor Yellow
try {
    $vercelWho = vercel whoami 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Sesión activa como: $vercelWho" -ForegroundColor Green
    } else {
        Write-Host "✗ No hay sesión activa" -ForegroundColor Red
        Write-Host "  Ejecuta: vercel login" -ForegroundColor Yellow
        return
    }
} catch {
    Write-Host "✗ Error al verificar sesión" -ForegroundColor Red
    return
}
Write-Host ""

# Vincular proyecto
Write-Host "Vinculando proyecto con Vercel..." -ForegroundColor Yellow
try {
    vercel link --yes 2>&1 | Out-Null
    Write-Host "✓ Proyecto vinculado" -ForegroundColor Green
} catch {
    Write-Host "⚠ No se pudo vincular automáticamente" -ForegroundColor Yellow
    Write-Host "  Ejecuta manualmente: vercel link" -ForegroundColor Gray
}
Write-Host ""

# Desplegar
Write-Host "Iniciando despliegue en producción..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""

try {
    $deployOutput = vercel --prod 2>&1
    Write-Host $deployOutput -ForegroundColor White
    
    # Extraer URL del despliegue
    $deploymentUrl = ($deployOutput | Select-String "https://.*\.vercel\.app" | Select-Object -First 1).ToString().Trim()
    
    if ($deploymentUrl) {
        Write-Host ""
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
        Write-Host "✓ DESPLIEGUE EXITOSO" -ForegroundColor Green
        Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
        Write-Host ""
        Write-Host "URL de producción: $deploymentUrl" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Para verificar los endpoints, ejecuta:" -ForegroundColor Yellow
        Write-Host "  .\scripts\20-Verify-Deploy.ps1 -DeploymentUrl $deploymentUrl" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "⚠ No se pudo extraer la URL automáticamente" -ForegroundColor Yellow
        Write-Host "  Revisa la salida del comando vercel --prod" -ForegroundColor Gray
    }
} catch {
    Write-Host ""
    Write-Host " Error en el despliegue: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Revisa los logs de Vercel para más detalles" -ForegroundColor Yellow
}