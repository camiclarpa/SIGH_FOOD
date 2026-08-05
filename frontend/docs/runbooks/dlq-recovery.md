# Runbook: Recuperación Manual desde Dead Letter Queue

## Objetivo
Recuperar Leads que fallaron tras 3 reintentos y fueron movidos a la Dead Letter Queue (DLQ).

## Escenarios de Uso
1. El CRM estuvo caído por más de 1 hora y hay eventos acumulados en la DLQ
2. Un bug en el código del Worker causó fallos masivos
3. El CRM rechazó eventos por rate limiting y ahora está disponible

## Pasos de Recuperación

### Paso 1: Verificar estado del CRM
\\\ash
# Verificar si el CRM está operativo
curl -X GET https://api.hubapi.com/crm/v3/objects/contacts -H "Authorization: Bearer "
\\\

**Criterio de éxito:** El CRM responde con 200 OK.

### Paso 2: Revisar eventos en la DLQ
\\\ash
# Conectar a Upstash Redis
redis-cli -h  -a 

# Ver cantidad de eventos en DLQ
LLEN dead-letter-queue

# Ver primeros 10 eventos
LRANGE dead-letter-queue 0 9
\\\

### Paso 3: Reencolar eventos manualmente
\\\	ypescript
// Script de recuperación - src/scripts/recover-from-dlq.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

async function recoverFromDLQ() {
  const dlqLength = await redis.llen('dead-letter-queue');
  console.log(\Eventos en DLQ: \\);

  if (dlqLength === 0) {
    console.log('No hay eventos para recuperar');
    return;
  }

  // Mover todos los eventos de DLQ a la cola principal
  for (let i = 0; i < dlqLength; i++) {
    const event = await redis.rpop('dead-letter-queue');
    if (event) {
      await redis.lpush('lead-events-log', event);
      console.log(\Evento reencolado: \...\);
    }
  }

  console.log('Recuperación completada');
}

recoverFromDLQ().catch(console.error);
\\\

### Paso 4: Monitorear procesamiento
\\\ash
# Ver longitud de cola principal
redis-cli LLEN lead-events-log

# Ver logs del Worker
kubectl logs -f deployment/lead-worker
\\\

**Criterio de éxito:** La cola principal se vacía progresivamente y no hay nuevos eventos en la DLQ.

### Paso 5: Verificar en el CRM
\\\ash
# Buscar leads recientes en HubSpot
curl -X GET "https://api.hubapi.com/crm/v3/objects/contacts?limit=10&properties=firstname,company,createdate" \
  -H "Authorization: Bearer "
\\\

**Criterio de éxito:** Los leads recuperados aparecen en el CRM con timestamps recientes.

## Rollback
Si la recuperación causa problemas:
1. Detener el Worker inmediatamente
2. Mover eventos problemáticos a una cola de cuarentena
3. Investigar causa raíz antes de reintentar

## Contacto de Emergencia
- **Equipo de Ingeniería:** #sighfood-engineering (Slack)
- **On-Call:** Rotación semanal en PagerDuty
- **Documentación:** docs/runbooks/

---

*Runbook actualizado: 2026-08-05*