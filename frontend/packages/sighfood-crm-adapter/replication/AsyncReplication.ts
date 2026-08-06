/**
 * ============================================================================
 * ASYNC REPLICATION - PatrÃƒÂ³n de ReplicaciÃƒÂ³n AsÃƒÂ­ncrona (DDIA, CapÃƒÂ­tulo 5)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃƒÂ­tulo 5):
 * Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * Kleppmann describe la replicaciÃƒÂ³n asÃƒÂ­ncrona como el patrÃƒÂ³n mÃƒÂ¡s comÃƒÂºn en la
 * prÃƒÂ¡ctica: el escritor (leader) no espera confirmaciÃƒÂ³n de las rÃƒÂ©plicas
 * (followers) antes de responder al cliente. Esto reduce la latencia percibida
 * pero introduce una ventana de inconsistencia (replication lag).
 * 
 * APLICACIÃƒâ€œN A SIGH_FOOD:
 *   La Edge Function escribe el Lead en la cola de Upstash Redis (leader) y
 *   responde 202 Accepted inmediatamente, sin esperar a que el CRM (follower)
 *   procese el evento. Esto es replicaciÃƒÂ³n asÃƒÂ­ncrona pura.
 * 
 * PROBLEMA DE REPLICATION LAG (SecciÃƒÂ³n 5.2):
 *   Si la pÃƒÂ¡gina de "Gracias" intentara leer el estado del Lead desde el CRM
 *   inmediatamente despuÃƒÂ©s del envÃƒÂ­o, existirÃƒÂ­a una ventana donde el CRM
 *   todavÃƒÂ­a no procesÃƒÂ³ el evento Ã¢â‚¬â€ el usuario verÃƒÂ­a un estado vacÃƒÂ­o.
 * 
 * SOLUCIÃƒâ€œN APLICADA:
 *   La pÃƒÂ¡gina de "Gracias" de SIGH_FOOD nunca depende del CRM para renderizarse
 *   Ã¢â‚¬â€ es contenido estÃƒÂ¡tico (SSG) con un mensaje genÃƒÂ©rico de confirmaciÃƒÂ³n.
 *   Cualquier dato especÃƒÂ­fico del Lead se toma del estado local del formulario
 *   en el cliente, eliminando estructuralmente la anomalÃƒÂ­a de replication lag.
 * 
 * REFERENCIAS DEL LIBRO:
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 5: ReplicaciÃƒÂ³n
 *   Ã¢â‚¬Â¢ SecciÃƒÂ³n 5.2: Replication Lag y anomalÃƒÂ­as de consistencia
 *   Ã¢â‚¬Â¢ SecciÃƒÂ³n 5.3: Problema de "leer tus propias escrituras"
 * ============================================================================
 */

import { type Lead } from '../sighfood-domain/entities/Lead';

export interface ReplicationStatus {
  readonly queuedAt: number;
  readonly crmSyncedAt?: number;
  readonly isSynced: boolean;
  readonly replicationLagMs?: number;
}

/**
 * Simula el estado de replicaciÃƒÂ³n asÃƒÂ­ncrona de un Lead hacia el CRM.
 * 
 * En producciÃƒÂ³n, esto se implementarÃƒÂ­a con:
 *   1. Un campo `queuedAt` en el evento de la cola (timestamp de escritura)
 *   2. Un webhook de confirmaciÃƒÂ³n del CRM que actualice `crmSyncedAt`
 *   3. CÃƒÂ¡lculo de `replicationLagMs = crmSyncedAt - queuedAt`
 * 
 * Para SIGH_FOOD, no necesitamos exponer este estado al usuario Ã¢â‚¬â€ la pÃƒÂ¡gina
 * de "Gracias" es SSG y no lee del CRM, eliminando la anomalÃƒÂ­a por diseÃƒÂ±o.
 */
export function getReplicationStatus(lead: Lead): ReplicationStatus {
  return {
    queuedAt: Date.now(),
    isSynced: false, // El CRM aÃƒÂºn no ha procesado el evento
    // crmSyncedAt y replicationLagMs se actualizarÃƒÂ­an vÃƒÂ­a webhook
  };
}

/**
 * PatrÃƒÂ³n de mitigaciÃƒÂ³n: "Leer del lÃƒÂ­der para datos propios recientes"
 * 
 * Kleppmann recomienda que, cuando un usuario acaba de escribir un dato y
 * necesita leerlo inmediatamente despuÃƒÂ©s, la lectura debe dirigirse al lÃƒÂ­der
 * (la fuente de escritura) en vez de a una rÃƒÂ©plica que podrÃƒÂ­a tener lag.
 * 
 * AplicaciÃƒÂ³n: Si SIGH_FOOD necesitara mostrar el estado del Lead en la pÃƒÂ¡gina
 * de "Gracias", deberÃƒÂ­a leerlo de la cola de Upstash (lÃƒÂ­der) en vez del CRM
 * (rÃƒÂ©plica asÃƒÂ­ncrona), o mejor aÃƒÂºn, usar el estado local del formulario.
 */
export function shouldReadFromLeader(
  timeSinceWriteMs: number,
  expectedReplicationLagMs: number = 5000
): boolean {
  // Si han pasado menos de 5 segundos desde la escritura, leer del lÃƒÂ­der
  return timeSinceWriteMs < expectedReplicationLagMs;
}