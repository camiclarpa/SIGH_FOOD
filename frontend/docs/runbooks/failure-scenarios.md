# Runbook: Escenarios de Fallo y Mitigación

## Escenario 1: CRM Caído o Degradado

**Síntoma:** Worker Consumer no puede sincronizar leads con HubSpot/Pipedrive

**Mitigación:**
1. La cola retiene el evento indefinidamente
2. Worker reintenta con backoff exponencial (2s, 8s, 30s)
3. Tras 3 reintentos fallidos, evento va a Dead Letter Queue
4. Alerta automática a Slack del equipo de ingeniería
5. Resolución manual desde DLQ cuando CRM se recupere

**Comando de verificación:**
\\\ash
# Ver longitud de la cola
redis-cli LLEN lead-events-log

# Ver eventos en DLQ
redis-cli LLEN dead-letter-queue
\\\

## Escenario 2: Pico de Tráfico de Campaña (10x)

**Síntoma:** Aumento súbito de solicitudes POST /api/leads

**Mitigación:**
1. Edge Functions escalan horizontalmente sin límite práctico
2. Cola Upstash absorbe el pico de escritura
3. CRM procesa a su propio ritmo sostenible
4. Monitorear latencia de aceptación (objetivo: <50ms)

**Comando de verificación:**
\\\ash
# Ver métricas de Edge Functions
vercel inspect --function /api/leads

# Ver longitud de cola en tiempo real
redis-cli MONITOR | grep LPUSH
\\\

## Escenario 3: Usuario Duplica Envío (Doble Clic)

**Síntoma:** Mismo formulario enviado múltiples veces

**Mitigación:**
1. Edge Function genera idempotencyKey único
2. Verificación antes de encolar: si clave existe, retornar 200 con mensaje "ya recibido"
3. CRM descarta duplicados por idempotencyKey

**Comando de verificación:**
\\\ash
# Verificar clave de idempotencia
redis-cli GET "pilot:+573001234567:2026-08-05"
\\\

## Escenario 4: Upstash Redis con Latencia Alta

**Síntoma:** Edge Function tarda >50ms en responder

**Mitigación:**
1. Timeout de Edge Function acotado a 3 segundos
2. Ante escritura anormalmente lenta, fallar rápido
3. Cliente puede reintentar con idempotencyKey
4. Monitorear latencia de Redis en Datadog RUM

**Comando de verificación:**
\\\ash
# Ver latencia de Redis
redis-cli --latency
\\\

## Contacto de Emergencia

- **Equipo de Ingeniería:** #sighfood-engineering (Slack)
- **On-Call:** Rotación semanal en PagerDuty
- **Documentación:** docs/runbooks/