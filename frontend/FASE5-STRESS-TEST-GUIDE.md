# Guía de Pruebas de Estrés - 10,000 Usuarios
## Fase 5 - Semana 2 - Tarea 1

## OBJETIVOS

### Capacidad Máxima
- Simular **10,000 usuarios concurrentes** accediendo al sistema
- Verificar que la latencia p95 se mantenga < 50ms
- Confirmar que la tasa de errores sea < 1%
- Validar que el buffer Redis maneje la carga sin pérdidas

### Comportamiento del Buffer
- Monitorear longitud de cola bajo carga máxima
- Verificar que DLQ rate sea < 0.1%
- Confirmar que no haya pérdida de leads

## ARQUITECTURA DE PRUEBAS

### Escenarios
1. **createLeads** (principal): 0 → 10,000 VUs
2. **healthChecks** (secundario): 5 VUs constantes
3. **statusChecks** (terciario): 0 → 500 VUs

### Fases de Carga
| Fase | Duración | Usuarios | Objetivo |
|------|----------|----------|----------|
| 1. Ramp-up inicial | 2m | 0 → 1,000 | Calentamiento |
| 2. Plateau moderado | 3m | 1,000 | Estabilidad |
| 3. Ramp-up intermedio | 3m | 1,000 → 5,000 | Crecimiento |
| 4. Plateau alto | 3m | 5,000 | Carga sostenida |
| 5. Ramp-up máximo | 2m | 5,000 → 10,000 | Pico máximo |
| 6. Peak máximo | 5m | 10,000 | Estrés máximo |
| 7. Ramp-down | 2m | 10,000 → 0 | Enfriamiento |

**Duración total:** ~20 minutos

## EJECUCIÓN

### 1. Pruebas Locales
\\\powershell
.\\scripts\\28-Run-Scaled-Load-Test.ps1 -DeploymentUrl https://sighfood.vercel.app
\\\

### 2. Pruebas en k6 Cloud (Distribuido)
\\\powershell
.\\scripts\\28-Run-Scaled-Load-Test.ps1 -DeploymentUrl https://sighfood.vercel.app -Cloud
\\\

**Requisitos k6 Cloud:**
- Cuenta en https://k6.io
- Token de API configurado: \export K6_CLOUD_TOKEN=your_token\

## MONITOREO EN TIEMPO REAL

### Durante la Ejecución
1. **Vercel Dashboard:**
   - Function invocations
   - Error rate
   - Response times

2. **Upstash Console:**
   - Redis memory usage
   - Stream length (queue)
   - DLQ length

3. **k6 Output:**
   - VUs (virtual users)
   - Requests/sec
   - p95 latency
   - Error rate

### Métricas Clave a Observar
- **http_req_duration{p(95)}**: Debe mantenerse < 50ms
- **http_req_failed**: Debe ser < 1%
- **leads_per_second**: Throughput del sistema
- **queue_length**: Longitud de cola en Redis
- **buffer_utilization**: % de capacidad del buffer

## ANÁLISIS DE RESULTADOS

### Después de la Ejecución
\\\powershell
.\\scripts\\29-Analyze-Load-Test-Results.ps1 -ResultPath .\\k6-results\\stress-test-*.json
\\\

### Métricas a Verificar
| Métrica | Objetivo | Crítico si > |
|---------|----------|--------------|
| p95 latency | < 50ms | 100ms |
| Error rate | < 1% | 5% |
| DLQ rate | < 0.1% | 1% |
| Queue length (max) | < 5,000 | 10,000 |

## SOLUCIÓN DE PROBLEMAS

### p95 > 50ms
- **Causa:** Cold starts, queries lentas a Redis
- **Solución:** 
  - Verificar que /api/warmup se ejecute cada 5 min
  - Optimizar queries de Redis
  - Aumentar regiones Edge

### Error rate > 1%
- **Causa:** Rate limits de APIs externas, timeouts
- **Solución:**
  - Implementar exponential backoff
  - Aumentar timeouts
  - Usar circuit breaker

### DLQ rate > 0.1%
- **Causa:** Fallos persistentes en el Worker
- **Solución:**
  - Revisar logs del Worker
  - Aumentar maxRetries
  - Implementar retry con jitter

### Queue length > 10,000
- **Causa:** Worker no procesa lo suficientemente rápido
- **Solución:**
  - Escalar horizontalmente el Worker
  - Aumentar concurrencia
  - Implementar batch processing

## PRÓXIMOS PASOS

Después de las pruebas de estrés:

1. **Analizar resultados** con el script de análisis
2. **Identificar cuellos de botella**
3. **Aplicar optimizaciones**
4. **Re-ejecutar pruebas** para validar mejoras
5. **Generar reporte ejecutivo** (Tarea 5)

════════════════════════════════════════════════════════════