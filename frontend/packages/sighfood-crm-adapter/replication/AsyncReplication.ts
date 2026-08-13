/**
 * ============================================================================
 * ASYNC REPLICATION - Patrón de Replicación Asíncrona (DDIA, Capítulo 5)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (Capítulo 5):
 * ──────────────────────────────────────────────────────────────────────────
 * Kleppmann describe la replicación asíncrona como el patrón más común en la
 * práctica: el escritor (leader) no espera confirmación de las réplicas
 * (followers) antes de responder al cliente. Esto reduce la latencia percibida
 * pero introduce una ventana de inconsistencia (replication lag).
 * 
 * APLICACIÓN A SIGH_FOOD:
 *   La Edge Function escribe el Lead en la cola de Upstash Redis (leader) y
 *   responde 202 Accepted inmediatamente, sin esperar a que el CRM (follower)
 *   procese el evento. Esto es replicación asíncrona pura.
 * 
 * PROBLEMA DE REPLICATION LAG (Sección 5.2):
 *   Si la página de "Gracias" intentara leer el estado del Lead desde el CRM
 *   inmediatamente después del envío, existiría una ventana donde el CRM
 *   todavía no procesó el evento — el usuario vería un estado vacío.
 * 
 * SOLUCIÓN APLICADA:
 *   La página de "Gracias" de SIGH_FOOD nunca depende del CRM para renderizarse
 *   — es contenido estático (SSG) con un mensaje genérico de confirmación.
 *   Cualquier dato específico del Lead se toma del estado local del formulario
 *   en el cliente, eliminando estructuralmente la anomalía de replication lag.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 5: Replicación
 *   • Sección 5.2: Replication Lag y anomalías de consistencia
 *   • Sección 5.3: Problema de "leer tus propias escrituras"
 * ============================================================================
 */

import { type Lead } from '@sighfood/domain/entities/Lead';

export interface ReplicationStatus {
  readonly queuedAt: number;
  readonly crmSyncedAt?: number;
  readonly isSynced: boolean;
  readonly replicationLagMs?: number;
}

/**
 * Simula el estado de replicación asíncrona de un Lead hacia el CRM.
 * 
 * En producción, esto se implementaría con:
 *   1. Un campo `queuedAt` en el evento de la cola (timestamp de escritura)
 *   2. Un webhook de confirmación del CRM que actualice `crmSyncedAt`
 *   3. Cálculo de `replicationLagMs = crmSyncedAt - queuedAt`
 * 
 * Para SIGH_FOOD, no necesitamos exponer este estado al usuario — la página
 * de "Gracias" es SSG y no lee del CRM, eliminando la anomalía por diseño.
 */
export function getReplicationStatus(_lead: Lead): ReplicationStatus {
  return {
    queuedAt: Date.now(),
    isSynced: false, // El CRM aún no ha procesado el evento
    // crmSyncedAt y replicationLagMs se actualizarían vía webhook
  };
}

/**
 * Patrón de mitigación: "Leer del líder para datos propios recientes"
 * 
 * Kleppmann recomienda que, cuando un usuario acaba de escribir un dato y
 * necesita leerlo inmediatamente después, la lectura debe dirigirse al líder
 * (la fuente de escritura) en vez de a una réplica que podría tener lag.
 * 
 * Aplicación: Si SIGH_FOOD necesitara mostrar el estado del Lead en la página
 * de "Gracias", debería leerlo de la cola de Upstash (líder) en vez del CRM
 * (réplica asíncrona), o mejor aún, usar el estado local del formulario.
 */
export function shouldReadFromLeader(
  timeSinceWriteMs: number,
  expectedReplicationLagMs: number = 5000
): boolean {
  // Si han pasado menos de 5 segundos desde la escritura, leer del líder
  return timeSinceWriteMs < expectedReplicationLagMs;
}