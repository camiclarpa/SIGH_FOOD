Write-Host "Iniciando configuración de la Semana 1..." -ForegroundColor Cyan

$scriptsToRun = @(
    ".\scripts\03-Setup-Validators.ps1",
    ".\scripts\04-Setup-Connections.ps1",
    ".\scripts\05-Create-EdgeFunction.ps1",
    ".\scripts\06-Setup-Logging.ps1"
)

foreach ($script in $scriptsToRun) {
    if (Test-Path $script) {
        Write-Host "Ejecutando: $script" -ForegroundColor Yellow
        try {
            & $script
            Write-Host "  ✓ Completado" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Error en $script : $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  ⚠ No encontrado: $script" -ForegroundColor Yellow
    }
}

Write-Host "`nConfiguración finalizada." -ForegroundColor Green
Write-Host "Para iniciar el servidor, ejecuta: .\scripts\07-Run-Local.ps1" -ForegroundColor Cyan