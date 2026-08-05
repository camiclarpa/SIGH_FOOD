Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICACIÓN: Configuración de Producción                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar .env.production
if (Test-Path ".env.production") {
    Write-Host "✓ .env.production existe" -ForegroundColor Green
    $envProd = Get-Content ".env.production" -Raw
    
    $requiredVars = @(
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "PIPEDRIVE_API_TOKEN",
        "RESEND_API_KEY",
        "ADMIN_TOKEN",
        "CRON_SECRET"
    )
    
    $missingVars = @()
    foreach ($var in $requiredVars) {
        if ($envProd -notmatch "$var=") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -gt 0) {
        Write-Host " Variables faltantes en .env.production:" -ForegroundColor Yellow
        foreach ($var in $missingVars) {
            Write-Host "  - $var" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✓ Todas las variables requeridas están configuradas" -ForegroundColor Green
    }
} else {
    Write-Host "✗ .env.production NO existe" -ForegroundColor Red
}

# Verificar vercel.json
if (Test-Path "vercel.json") {
    Write-Host "✓ vercel.json existe" -ForegroundColor Green
    $vercel = Get-Content "vercel.json" -Raw | ConvertFrom-Json
    
    if ($vercel.crons) {
        Write-Host "  ✓ Cron Jobs configurados: $($vercel.crons.Count)" -ForegroundColor Green
        foreach ($cron in $vercel.crons) {
            Write-Host "    • $($cron.path) → $($cron.schedule)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ✗ No hay Cron Jobs configurados" -ForegroundColor Red
    }
} else {
    Write-Host "✗ vercel.json NO existe" -ForegroundColor Red
}

# Verificar Vercel CLI
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "✓ Vercel CLI instalado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host " Vercel CLI NO instalado. Ejecuta: npm i -g vercel" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "Siguientes pasos:" -ForegroundColor Cyan
Write-Host "  1. Completa el checklist: FASE5-CHECKLIST.md" -ForegroundColor White
Write-Host "  2. Ejecuta: vercel link" -ForegroundColor White
Write-Host "  3. Ejecuta: vercel --prod" -ForegroundColor White
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray