Write-Host "Iniciando servidor de desarrollo en segundo plano..." -ForegroundColor Cyan

if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npx no está disponible. Asegúrate de que Node.js esté instalado." -ForegroundColor Red
    exit 1
}

Write-Host "Iniciando Vercel Dev en puerto 3001..." -ForegroundColor Yellow
$process = Start-Process -FilePath "npx" `
                         -ArgumentList "vercel", "dev", "--listen-port", "3001" `
                         -NoNewWindow `
                         -PassThru `
                         -RedirectStandardOutput "vercel-output.log" `
                         -RedirectStandardError "vercel-error.log"

Write-Host "✓ Servidor iniciado en segundo plano (PID: $($process.Id))" -ForegroundColor Green
Write-Host "  Esta terminal NO está bloqueada. Puedes seguir escribiendo comandos." -ForegroundColor Gray
Write-Host "  Para ver logs en vivo: Get-Content vercel-output.log -Tail 20 -Wait" -ForegroundColor Gray
Write-Host "  Para detener el servidor: Stop-Process -Id $($process.Id) -Force" -ForegroundColor Gray
Write-Host "  Abre tu navegador en: http://localhost:3001" -ForegroundColor Cyan