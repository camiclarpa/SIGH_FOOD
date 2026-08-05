# =============================================================================
# 02-Implement-Edge-Function.ps1
# Verifica e implementa la Edge Function del formulario
# =============================================================================

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  DEPLOY: Edge Function 202 Accepted                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$routePath = "src\app\api\edge\pilot-request\route.ts"

if (Test-Path $routePath) {
    Write-Host "  ✓ Edge Function ya existe en: $routePath" -ForegroundColor Green
    
    $content = Get-Content $routePath -Raw
    if ($content -match "export const runtime = 'edge'") {
        Write-Host "  ✓ Runtime 'edge' configurado correctamente" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Falta 'export const runtime = ''edge''' " -ForegroundColor Red
    }
    
    if ($content -match "status:\s*202") {
        Write-Host "  ✓ Respuesta 202 Accepted configurada" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Falta respuesta 202 Accepted" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠ Edge Function no encontrada. Ejecuta la Fase 2 primero." -ForegroundColor Yellow
}

Write-Host "`nPara probar localmente:" -ForegroundColor Cyan
Write-Host "  1. Ejecuta: pnpm dev" -ForegroundColor White
Write-Host "  2. En otra terminal, ejecuta:" -ForegroundColor White
Write-Host "     curl -X POST http://localhost:3000/api/edge/pilot-request -H 'Content-Type: application/json' -d '{""whatsapp"":""+573001234567"",""establecimiento"":""Test Bar""}'" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Deberías recibir: {""status"":""queued"",""latency_ms"":<50}" -ForegroundColor White