/**
 * ============================================================================
 * ASYNC REPLICATION - PatrÃ³n de ReplicaciÃ³n AsÃ­ncrona (DDIA, CapÃ­tulo 5)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃ­tulo 5):
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Kleppmann describe la replicaciÃ³n asÃ­ncrona como el patrÃ³n mÃ¡s comÃºn en la
 * prÃ¡ctica: el escritor (leader) no espera confirmaciÃ³n de las rÃ©plicas
 * (followers) antes de responder al cliente. Esto reduce la latencia percibida
 * pero introduce una ventana de inconsistencia (replication lag).
 * 
 * APLICACIÃ“N A SIGH_FOOD:
 *   La Edge Function escribe el Lead en la cola de Upstash Redis (leader) y
 *   responde 202 Accepted inmediatamente, sin esperar a que el CRM (follower)
 *   procese el evento. Esto es replicaciÃ³n asÃ­ncrona pura.
 * 
 * PROBLEMA DE REPLICATION LAG (SecciÃ³n 5.2):
 *   Si la pÃ¡gina de "Gracias" intentara leer el estado del Lead desde el CRM
 *   inmediatamente despuÃ©s del envÃ­o, existirÃ­a una ventana donde el CRM
 *   todavÃ­a no procesÃ³ el evento â€” el usuario verÃ­a un estado vacÃ­o.
 * 
 * SOLUCIÃ“N APLICADA:
 *   La pÃ¡gina de "Gracias" de SIGH_FOOD nunca depende del CRM para renderizarse
 *   â€” es contenido estÃ¡tico (SSG) con un mensaje genÃ©rico de confirmaciÃ³n.
 *   Cualquier dato especÃ­fico del Lead se toma del estado local del formulario
 *   en el cliente, eliminando estructuralmente la anomalÃ­a de replication lag.
 * 
 * REFERENCIAS DEL LIBRO:
 *   â€¢ CapÃ­tulo 5: ReplicaciÃ³n
 *   â€¢ SecciÃ³n 5.2: Replication Lag y anomalÃ­as de consistencia
 *   â€¢ SecciÃ³n 5.3: Problema de "leer tus propias escrituras"
 * ============================================================================
 */

import { type Lead } from '../../sighfood-domain/entities/Lead';

export interface ReplicationStatus {
  readonly queuedAt: number;
  readonly crmSyncedAt?: number;
  readonly isSynced: boolean;
  readonly replicationLagMs?: number;
}

/**
 * Simula el estado de replicaciÃ³n asÃ­ncrona de un Lead hacia el CRM.
 * 
 * En producciÃ³n, esto se implementarÃ­a con:
 *   1. Un campo `queuedAt` en el evento de la cola (timestamp de escritura)
 *   2. Un webhook de confirmaciÃ³n del CRM que actualice `crmSyncedAt`
 *   3. CÃ¡lculo de `replicationLagMs = crmSyncedAt - queuedAt`
 * 
 * Para SIGH_FOOD, no necesitamos exponer este estado al usuario â€” la pÃ¡gina
 * de "Gracias" es SSG y no lee del CRM, eliminando la anomalÃ­a por diseÃ±o.
 */
export function getReplicationStatus(lead: Lead): ReplicationStatus {
  return {
    queuedAt: Date.now(),
    isSynced: false, // El CRM aÃºn no ha procesado el evento
    // crmSyncedAt y replicationLagMs se actualizarÃ­an vÃ­a webhook
  };
}

/**
 * PatrÃ³n de mitigaciÃ³n: "Leer del lÃ­der para datos propios recientes"
 * 
 * Kleppmann recomienda que, cuando un usuario acaba de escribir un dato y
 * necesita leerlo inmediatamente despuÃ©s, la lectura debe dirigirse al lÃ­der
 * (la fuente de escritura) en vez de a una rÃ©plica que podrÃ­a tener lag.
 * 
 * AplicaciÃ³n: Si SIGH_FOOD necesitara mostrar el estado del Lead en la pÃ¡gina
 * de "Gracias", deberÃ­a leerlo de la cola de Upstash (lÃ­der) en vez del CRM
 * (rÃ©plica asÃ­ncrona), o mejor aÃºn, usar el estado local del formulario.
 */
export function shouldReadFromLeader(
  timeSinceWriteMs: number,
  expectedReplicationLagMs: number = 5000
): boolean {
  // Si han pasado menos de 5 segundos desde la escritura, leer del lÃ­der
  return timeSinceWriteMs < expectedReplicationLagMs;
}