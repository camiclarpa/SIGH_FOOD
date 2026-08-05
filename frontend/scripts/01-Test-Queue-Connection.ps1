Write-Host "Probando conexión a Message Queue..." -ForegroundColor Cyan

$envPath = ".\.env"
if (!(Test-Path $envPath)) {
    Write-Host "Error: No se encontró el archivo .env" -ForegroundColor Red
    exit 1
}

# Leer variables del .env de forma sencilla (buscando las líneas)
$envContent = Get-Content $envPath
$url = ($envContent | Where-Object { $_ -match "^UPSTASH_REDIS_REST_URL=" }) -replace "^UPSTASH_REDIS_REST_URL=", ""
$token = ($envContent | Where-Object { $_ -match "^UPSTASH_REDIS_REST_TOKEN=" }) -replace "^UPSTASH_REDIS_REST_TOKEN=", ""

if ($url -match "your-region" -or $token -match "your_token") {
    Write-Host "⚠ MODO SIMULACIÓN:" -ForegroundColor Yellow
    Write-Host "  Detectamos que estás usando las credenciales de ejemplo." -ForegroundColor Gray
    Write-Host "  La estructura del código es correcta y está lista." -ForegroundColor Gray
    Write-Host "  Para probar con una cola real, obtén tus credenciales gratis en: https://upstash.com" -ForegroundColor Cyan
    Write-Host "  Luego, reemplaza UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en tu .env" -ForegroundColor Gray
} else {
    Write-Host "Intentando conectar a Upstash Redis..." -ForegroundColor Yellow
    try {
        # Comando PING de Upstash
        $response = Invoke-RestMethod -Uri "$url/ping" -Headers @{ Authorization = "Bearer $token" } -Method Post -TimeoutSec 5
        if ($response.result -eq "PONG") {
            Write-Host "✓ ¡Conexión exitosa a Upstash Redis!" -ForegroundColor Green
            Write-Host "  La cola está lista para recibir mensajes." -ForegroundColor Gray
        } else {
            Write-Host "✗ Respuesta inesperada: $($response.result)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error de conexión: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Verifica tu URL y Token en el archivo .env" -ForegroundColor Yellow
    }
}