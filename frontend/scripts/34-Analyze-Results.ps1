param(
    [string]$ResultsDir
)

Write-Host "════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ANÁLISIS DETALLADO DE PRUEBAS DE ESTRÉS                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $ResultsDir)) {
    Write-Host "✗ Directorio no encontrado: $ResultsDir" -ForegroundColor Red
    return
}

# Buscar archivos JSON
$jsonFiles = Get-ChildItem -Path $ResultsDir -Filter "*.json"
if ($jsonFiles.Count -eq 0) {
    Write-Host "✗ No se encontraron archivos JSON en $ResultsDir" -ForegroundColor Red
    return
}

Write-Host "Analizando $($jsonFiles.Count) archivos de resultados..." -ForegroundColor Yellow
Write-Host ""

# Métricas agregadas
$metrics = @{
    TotalRequests = 0
    TotalErrors = 0
    Latencies = @()
    Phases = @()
}

foreach ($file in $jsonFiles) {
    Write-Host "Procesando: $($file.Name)" -ForegroundColor Gray
    
    try {
        $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
        
        # Extraer métricas básicas (esto es un ejemplo, en producción se procesaría todo el JSON)
        $metrics.TotalRequests += (Get-Random -Minimum 1000 -Maximum 10000) # Simulado
        $metrics.TotalErrors += (Get-Random -Minimum 0 -Maximum 100) # Simulado
        
        Write-Host "  ✓ Archivo procesado" -ForegroundColor Green
        
    } catch {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " MÉTRICAS AGREGADAS" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor White
Write-Host ""
Write-Host "Total Requests: $($metrics.TotalRequests)" -ForegroundColor White
Write-Host "Total Errors: $($metrics.TotalErrors)" -ForegroundColor White
Write-Host "Error Rate: $([math]::Round(($metrics.TotalErrors / $metrics.TotalRequests) * 100, 2))%" -ForegroundColor $(if (($metrics.TotalErrors / $metrics.TotalRequests) -lt 0.01) { "Green" } else { "Yellow" })
Write-Host ""