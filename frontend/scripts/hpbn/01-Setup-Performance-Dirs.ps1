# =============================================================================
# 01-Setup-Performance-Dirs.ps1
# Configura directorios, dependencias y variables de entorno para RFC-HPBN
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SETUP: Directorios y Dependencias de Rendimiento          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Crear directorios
$dirs = @("tests\performance", "scripts\hpbn", "src\app\api\edge\pilot-request", "src\workers", "lighthouse-reports")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "  ✓ Creado: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Existe: $dir" -ForegroundColor Gray
    }
}

# 2. Verificar dependencias
Write-Host "`nVerificando dependencias..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    
    if ($packageJson.dependencies -and $packageJson.dependencies.'@upstash/redis') {
        Write-Host "  ✓ @upstash/redis instalado" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ @upstash/redis no encontrado. Ejecuta: pnpm add @upstash/redis" -ForegroundColor Yellow
    }

    if ($packageJson.devDependencies -and $packageJson.devDependencies.'lighthouse') {
        Write-Host "  ✓ lighthouse instalado" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ lighthouse no encontrado. Ejecuta: pnpm add -D lighthouse" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ package.json no encontrado" -ForegroundColor Red
}

# 3. Configurar variables de entorno
$envPath = ".\.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    if ($content -notmatch "UPSTASH_REDIS_REST_URL=") {
        $redisVars = @"

# ==========================================
# UPSTASH REDIS (Performance & Queue)
# ==========================================
UPSTASH_REDIS_REST_URL=https://tu-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=tu-token-aqui
"@
        Add-Content -Path $envPath -Value $redisVars -Encoding UTF8
        Write-Host "  ✓ Variables de Upstash añadidas a .env" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Variables de Upstash ya existen en .env" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠ .env no encontrado. Crea el archivo manualmente." -ForegroundColor Yellow
}

Write-Host "`nSetup completado exitosamente." -ForegroundColor Green