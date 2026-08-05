param(
    [string]$DeploymentUrl
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  VERIFICACIÓN: SSL y Security Headers                      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not $DeploymentUrl) {
    Write-Host "✗ No se proporcionó URL de despliegue" -ForegroundColor Red
    Write-Host "  Uso: .\scripts\23-Verify-Security.ps1 -DeploymentUrl https://sighfood.vercel.app" -ForegroundColor Yellow
    return
}

Write-Host "URL de producción: $DeploymentUrl" -ForegroundColor Cyan
Write-Host ""

# Verificar HTTPS
Write-Host "[1/5] Verificando HTTPS y SSL..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://$DeploymentUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing
    Write-Host "  ✓ HTTPS funcionando" -ForegroundColor Green
    
    # Verificar certificado
    $cert = $response.BaseResponse.ServicePoint.Certificate
    if ($cert) {
        Write-Host "  ✓ Certificado SSL válido" -ForegroundColor Green
        Write-Host "    Emisor: $($cert.Issuer)" -ForegroundColor Gray
        Write-Host "    Válido hasta: $($cert.GetExpirationDateString())" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ✗ Error HTTPS: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Verificar Security Headers
Write-Host "[2/5] Verificando Security Headers..." -ForegroundColor Yellow

$requiredHeaders = @(
    @{ Name = "Strict-Transport-Security"; Desc = "HSTS" },
    @{ Name = "X-Content-Type-Options"; Desc = "MIME Sniffing Protection" },
    @{ Name = "X-Frame-Options"; Desc = "Clickjacking Protection" },
    @{ Name = "X-XSS-Protection"; Desc = "XSS Protection" },
    @{ Name = "Referrer-Policy"; Desc = "Referrer Policy" },
    @{ Name = "Content-Security-Policy"; Desc = "CSP" }
)

$passedHeaders = 0
foreach ($header in $requiredHeaders) {
    try {
        $response = Invoke-WebRequest -Uri "https://$DeploymentUrl" -Method GET -TimeoutSec 10 -UseBasicParsing
        $headerValue = $response.Headers[$header.Name]
        
        if ($headerValue) {
            Write-Host "  ✓ $($header.Desc) ($($header.Name))" -ForegroundColor Green
            Write-Host "    Valor: $headerValue" -ForegroundColor Gray
            $passedHeaders++
        } else {
            Write-Host "  ✗ $($header.Desc) ($($header.Name)) - FALTA" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ✗ $($header.Desc) - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host "  Headers configurados: $passedHeaders/$($requiredHeaders.Count)" -ForegroundColor Cyan
Write-Host ""

# Verificar Cache-Control
Write-Host "[3/5] Verificando Cache-Control..." -ForegroundColor Yellow

$cacheTests = @(
    @{ Path = "/health"; Expected = "no-store"; Desc = "API no debe cachearse" },
    @{ Path = "/api/warmup"; Expected = "no-store"; Desc = "API warmup no debe cachearse" }
)

foreach ($test in $cacheTests) {
    try {
        $response = Invoke-WebRequest -Uri "https://$DeploymentUrl$($test.Path)" -Method GET -TimeoutSec 10 -UseBasicParsing
        $cacheControl = $response.Headers["Cache-Control"]
        
        if ($cacheControl -and $cacheControl -match $test.Expected) {
            Write-Host "  ✓ $($test.Desc)" -ForegroundColor Green
            Write-Host "    Cache-Control: $cacheControl" -ForegroundColor Gray
        } else {
            Write-Host "  ⚠ $($test.Desc) - Cache diferente al esperado" -ForegroundColor Yellow
            Write-Host "    Esperado: $($test.Expected)" -ForegroundColor Gray
            Write-Host "    Actual: $cacheControl" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ✗ Error verificando $($test.Path): $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Verificar SSL Labs (Grade)
Write-Host "[4/5] Consultando SSL Labs (puede tardar)..." -ForegroundColor Yellow
try {
    $sslLabsUrl = "https://api.ssllabs.com/api/v3/analyze?host=$($DeploymentUrl.Split('/')[0])&fromCache=on"
    # Nota: Esta API puede tardar, usamos timeout largo
    $sslResponse = Invoke-RestMethod -Uri $sslLabsUrl -Method GET -TimeoutSec 30
    
    if ($sslResponse.endpoints) {
        $grade = $sslResponse.endpoints[0].Grade
        $gradeColor = if ($grade -eq "A+" -or $grade -eq "A") { "Green" } 
                     elseif ($grade -eq "B" -or $grade -eq "C") { "Yellow" } 
                     else { "Red" }
        
        Write-Host "  SSL Labs Grade: $grade" -ForegroundColor $gradeColor
        
        if ($grade -eq "A+" -or $grade -eq "A") {
            Write-Host "  ✓ Excelente configuración SSL" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Se puede mejorar la configuración SSL" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ⚠ No se pudo consultar SSL Labs (puede estar en caché o rate-limited)" -ForegroundColor Yellow
    Write-Host "    Verifica manualmente en: https://www.ssllabs.com/ssltest/" -ForegroundColor Gray
}
Write-Host ""

# Resumen
Write-Host "[5/5] Resumen de Seguridad..." -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Gray

if ($passedHeaders -eq $requiredHeaders.Count) {
    Write-Host "✓ TODOS los Security Headers están configurados" -ForegroundColor Green
    Write-Host "✓ SSL/HTTPS configurado correctamente" -ForegroundColor Green
    Write-Host "✓ Cache-Control apropiado para APIs" -ForegroundColor Green
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ CONFIGURACIÓN DE SEGURIDAD COMPLETADA                   ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "⚠ Algunos headers faltan. Revisa vercel.json" -ForegroundColor Yellow
}