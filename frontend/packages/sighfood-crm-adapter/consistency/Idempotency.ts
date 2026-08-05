/**
 * ============================================================================
 * IDEMPOTENCY & LINEARIZABILITY - Consistencia en la Cola (DDIA, Cap. 8-9)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (Capítulo 8):
 * ─────────────────────────────────────────────────────────────────────────
 * Kleppmann define la linealizabilidad como una garantía de "recencia": una
 * vez que una escritura se completa, cualquier lectura posterior (de cualquier
 * réplica) debe reflejar esa escritura o una más reciente.
 * 
 * APLICACIÓN A SIGH_FOOD:
 *   La deduplicación de idempotency key (evitar leads duplicados por doble
 *   clic del usuario) requiere linearizability dentro de la misma clave.
 *   Upstash Redis, al ser de nodo único por partición para operaciones
 *   SET/GET, provee esta garantía en la práctica.
 * 
 * CONCEPTO VERIFICADO (Capítulo 9):
 * ──────────────────────────────────────────────────────────────────────────
 * El consenso (Raft/Zab) garantiza que todos los nodos de un sistema
 * distribuido se pongan de acuerdo sobre el orden exacto de los eventos.
 * Para SIGH_FOOD, el orden de eventos dentro de una partición importa: dos
 * leads del mismo establecimiento enviados con segundos de diferencia deben
 * procesarse en orden correcto.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 8: Consistencia y Consenso
 *   • Capítulo 9: Consistencia y Consenso (continuación)
 *   • Sección 8.1: Linealizabilidad vs. consistencia eventual
 *   • Sección 9.2: Algoritmos de consenso (Raft, Zab)
 * ============================================================================
 */

import * as crypto from 'crypto';

export interface IdempotencyKey {
  readonly key: string;
  readonly createdAt: number;
  readonly ttlSeconds: number;
}

export interface IdempotencyResult {
  readonly isFirstWrite: boolean;
  readonly key: string;
  readonly error?: string;
}

/**
 * Genera una idempotency key para un Lead.
 * 
 * Fórmula: `pilot:${whatsapp}:${fecha}`
 * 
 * Esto garantiza que dos envíos del mismo formulario en el mismo día se
 * resuelvan como duplicados, pero envíos en días distintos se procesen
 * como leads separados (el usuario puede agendar múltiples demos).
 */
export function generateIdempotencyKey(whatsapp: string): IdempotencyKey {
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `pilot:${whatsapp}:${fecha}`;
  
  return {
    key,
    createdAt: Date.now(),
    ttlSeconds: 86400, // 24 horas
  };
}

/**
 * Verifica si una idempotency key ya existe (operación linearizable).
 * 
 * En producción, esto se implementaría con:
 *   const exists = await redis.get(idempotencyKey.key);
 *   if (exists) return { isFirstWrite: false, key: idempotencyKey.key };
 * 
 * Upstash Redis garantiza linearizability para operaciones GET/SET en la
 * misma clave, porque es de nodo único por partición.
 */
export function checkIdempotencyKey(
  key: string,
  existingKeys: Set<string>
): IdempotencyResult {
  if (existingKeys.has(key)) {
    return {
      isFirstWrite: false,
      key,
      error: 'Lead ya registrado hoy (idempotency key existe)',
    };
  }
  
  return {
    isFirstWrite: true,
    key,
  };
}

/**
 * Registra una idempotency key como procesada.
 * 
 * En producción:
 *   await redis.set(idempotencyKey.key, '1', { ex: idempotencyKey.ttlSeconds });
 */
export function registerIdempotencyKey(
  key: string,
  processedKeys: Set<string>
): void {
  processedKeys.add(key);
}

/**
 * Verifica el orden de eventos dentro de una partición.
 * 
 * Kleppmann enfatiza que el orden de eventos importa cuando dos leads del
 * mismo establecimiento se envían con segundos de diferencia — el CRM no
 * debe sobreescribir datos más recientes con datos más antiguos.
 * 
 * Esta función valida que los eventos se procesen en orden de timestamp.
 */
export function validateEventOrder(events: Array<{ timestamp: number; leadId: string }>): boolean {
  for (let i = 1; i < events.length; i++) {
    if (events[i].timestamp < events[i - 1].timestamp) {
      console.warn(
        `Event order violation: ${events[i].leadId} (timestamp ${events[i].timestamp}) ` +
        `arrived after ${events[i - 1].leadId} (timestamp ${events[i - 1].timestamp})`
      );
      return false;
    }
  }
  return true;
}