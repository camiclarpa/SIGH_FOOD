/**
 * ============================================================================
 * ASYNC REPLICATION - PatrÃƒÆ’Ã‚Â³n de ReplicaciÃƒÆ’Ã‚Â³n AsÃƒÆ’Ã‚Â­ncrona (DDIA, CapÃƒÆ’Ã‚Â­tulo 5)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃƒÆ’Ã‚Â­tulo 5):
 * ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
 * Kleppmann describe la replicaciÃƒÆ’Ã‚Â³n asÃƒÆ’Ã‚Â­ncrona como el patrÃƒÆ’Ã‚Â³n mÃƒÆ’Ã‚Â¡s comÃƒÆ’Ã‚Âºn en la
 * prÃƒÆ’Ã‚Â¡ctica: el escritor (leader) no espera confirmaciÃƒÆ’Ã‚Â³n de las rÃƒÆ’Ã‚Â©plicas
 * (followers) antes de responder al cliente. Esto reduce la latencia percibida
 * pero introduce una ventana de inconsistencia (replication lag).
 * 
 * APLICACIÃƒÆ’Ã¢â‚¬Å“N A SIGH_FOOD:
 *   La Edge Function escribe el Lead en la cola de Upstash Redis (leader) y
 *   responde 202 Accepted inmediatamente, sin esperar a que el CRM (follower)
 *   procese el evento. Esto es replicaciÃƒÆ’Ã‚Â³n asÃƒÆ’Ã‚Â­ncrona pura.
 * 
 * PROBLEMA DE REPLICATION LAG (SecciÃƒÆ’Ã‚Â³n 5.2):
 *   Si la pÃƒÆ’Ã‚Â¡gina de "Gracias" intentara leer el estado del Lead desde el CRM
 *   inmediatamente despuÃƒÆ’Ã‚Â©s del envÃƒÆ’Ã‚Â­o, existirÃƒÆ’Ã‚Â­a una ventana donde el CRM
 *   todavÃƒÆ’Ã‚Â­a no procesÃƒÆ’Ã‚Â³ el evento ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â el usuario verÃƒÆ’Ã‚Â­a un estado vacÃƒÆ’Ã‚Â­o.
 * 
 * SOLUCIÃƒÆ’Ã¢â‚¬Å“N APLICADA:
 *   La pÃƒÆ’Ã‚Â¡gina de "Gracias" de SIGH_FOOD nunca depende del CRM para renderizarse
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â es contenido estÃƒÆ’Ã‚Â¡tico (SSG) con un mensaje genÃƒÆ’Ã‚Â©rico de confirmaciÃƒÆ’Ã‚Â³n.
 *   Cualquier dato especÃƒÆ’Ã‚Â­fico del Lead se toma del estado local del formulario
 *   en el cliente, eliminando estructuralmente la anomalÃƒÆ’Ã‚Â­a de replication lag.
 * 
 * REFERENCIAS DEL LIBRO:
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ CapÃƒÆ’Ã‚Â­tulo 5: ReplicaciÃƒÆ’Ã‚Â³n
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ SecciÃƒÆ’Ã‚Â³n 5.2: Replication Lag y anomalÃƒÆ’Ã‚Â­as de consistencia
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ SecciÃƒÆ’Ã‚Â³n 5.3: Problema de "leer tus propias escrituras"
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
 * Simula el estado de replicaciÃƒÆ’Ã‚Â³n asÃƒÆ’Ã‚Â­ncrona de un Lead hacia el CRM.
 * 
 * En producciÃƒÆ’Ã‚Â³n, esto se implementarÃƒÆ’Ã‚Â­a con:
 *   1. Un campo `queuedAt` en el evento de la cola (timestamp de escritura)
 *   2. Un webhook de confirmaciÃƒÆ’Ã‚Â³n del CRM que actualice `crmSyncedAt`
 *   3. CÃƒÆ’Ã‚Â¡lculo de `replicationLagMs = crmSyncedAt - queuedAt`
 * 
 * Para SIGH_FOOD, no necesitamos exponer este estado al usuario ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la pÃƒÆ’Ã‚Â¡gina
 * de "Gracias" es SSG y no lee del CRM, eliminando la anomalÃƒÆ’Ã‚Â­a por diseÃƒÆ’Ã‚Â±o.
 */
export function getReplicationStatus(lead: Lead): ReplicationStatus {
  return {
    queuedAt: Date.now(),
    isSynced: false, // El CRM aÃƒÆ’Ã‚Âºn no ha procesado el evento
    // crmSyncedAt y replicationLagMs se actualizarÃƒÆ’Ã‚Â­an vÃƒÆ’Ã‚Â­a webhook
  };
}

/**
 * PatrÃƒÆ’Ã‚Â³n de mitigaciÃƒÆ’Ã‚Â³n: "Leer del lÃƒÆ’Ã‚Â­der para datos propios recientes"
 * 
 * Kleppmann recomienda que, cuando un usuario acaba de escribir un dato y
 * necesita leerlo inmediatamente despuÃƒÆ’Ã‚Â©s, la lectura debe dirigirse al lÃƒÆ’Ã‚Â­der
 * (la fuente de escritura) en vez de a una rÃƒÆ’Ã‚Â©plica que podrÃƒÆ’Ã‚Â­a tener lag.
 * 
 * AplicaciÃƒÆ’Ã‚Â³n: Si SIGH_FOOD necesitara mostrar el estado del Lead en la pÃƒÆ’Ã‚Â¡gina
 * de "Gracias", deberÃƒÆ’Ã‚Â­a leerlo de la cola de Upstash (lÃƒÆ’Ã‚Â­der) en vez del CRM
 * (rÃƒÆ’Ã‚Â©plica asÃƒÆ’Ã‚Â­ncrona), o mejor aÃƒÆ’Ã‚Âºn, usar el estado local del formulario.
 */
export function shouldReadFromLeader(
  timeSinceWriteMs: number,
  expectedReplicationLagMs: number = 5000
): boolean {
  // Si han pasado menos de 5 segundos desde la escritura, leer del lÃƒÆ’Ã‚Â­der
  return timeSinceWriteMs < expectedReplicationLagMs;
}