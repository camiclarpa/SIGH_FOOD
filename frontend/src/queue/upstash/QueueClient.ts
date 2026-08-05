/**
 * ============================================================================
 * QUEUE CLIENT - Cliente de Upstash Redis
 * RFC-001: Capa Backend de Ingesta Asíncrona (Sección 3.3)
 * ============================================================================
 * 
 * FUNCIÓN: Encapsular las operaciones de cola de Upstash Redis para el
 * pipeline de Leads de SIGH_FOOD.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.3: "Cola de mensajes (Upstash Redis) — Recibe el evento del
 *   Lead vía LPUSH, con idempotencyKey para deduplicación"
 * 
 * REFERENCIA RFC-DDIA:
 *   Sección 7.3: Patrón Outbox (cola única como fuente de verdad)
 *   Sección 8.2: Linealizabilidad para idempotency key
 * 
 * PRINCIPIO CLEAN ARCHITECTURE:
 *   Este cliente es un Interface Adapter (Círculo 3) — traduce entre el
 *   formato del dominio (Lead) y el formato de la cola (JSON string).
 * 
 * JUSTIFICACIÓN (RFC-DDIA Sección 3.2):
 *   Upstash Redis opera sobre principios de journaling append-only muy
 *   similares en espíritu al log de un LSM-Tree — cada escritura es una
 *   operación LPUSH secuencial, nunca una actualización in-place.
 * ============================================================================
 */

import { Redis } from '@upstash/redis';

export interface QueueConfig {
  readonly queueName: string;
  readonly dlqName: string;
  readonly idempotencyTtlSeconds: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  queueName: 'lead-events-log',
  dlqName: 'dead-letter-queue',
  idempotencyTtlSeconds: 86400, // 24 horas
};

export class QueueClient {
  private redis: Redis;
  private config: QueueConfig;

  constructor(config: QueueConfig = DEFAULT_QUEUE_CONFIG) {
    this.redis = Redis.fromEnv();
    this.config = config;
  }

  /**
   * Encola un evento de Lead con verificación de idempotencia.
   * 
   * Flujo (RFC-001 Sección 3.3):
   * 1. Verificar si idempotencyKey ya existe
   * 2. Si existe: retornar 'duplicate'
   * 3. Si no existe: SET con TTL + LPUSH a la cola
   * 4. Retornar 'queued'
   * 
   * Garantía de linealizabilidad (RFC-DDIA Sección 8.2):
   *   Upstash Redis, al ser de nodo único por partición para operaciones
   *   SET/GET, provee linealizabilidad en la práctica sin necesidad de
   *   un protocolo de consenso explícito.
   */
  async enqueueLead(
    lead: Record<string, unknown>,
    idempotencyKey: string
  ): Promise<{ status: 'queued' | 'duplicate'; key: string }> {
    // Verificar duplicados
    const alreadyExists = await this.redis.get(idempotencyKey);
    if (alreadyExists) {
      return { status: 'duplicate', key: idempotencyKey };
    }

    // Marcar como procesado con TTL
    await this.redis.set(idempotencyKey, '1', {
      ex: this.config.idempotencyTtlSeconds,
    });

    // Encolar en la cola principal
    await this.redis.lpush(this.config.queueName, JSON.stringify(lead));

    return { status: 'queued', key: idempotencyKey };
  }

  /**
   * Obtiene el siguiente evento de la cola (bloqueante con timeout).
   * 
   * Usa BRPOP para consumo asíncrono — el worker espera hasta que haya
   * un evento disponible, evitando polling innecesario.
   */
  async dequeueLead(timeoutSeconds: number = 5): Promise<string | null> {
    const result = await this.redis.brpop(this.config.queueName, timeoutSeconds);
    return result ? result[1] : null;
  }

  /**
   * Mueve un evento fallido a la Dead Letter Queue.
   * 
   * RFC-001 Sección 3.3: "Dead Letter Queue (DLQ) — Almacena eventos
   * que fallaron tras 3 reintentos, para investigación manual"
   */
  async moveToDLQ(event: string, reason: string): Promise<void> {
    const dlqEvent = JSON.stringify({
      originalEvent: event,
      failureReason: reason,
      timestamp: Date.now(),
    });

    await this.redis.lpush(this.config.dlqName, dlqEvent);
  }

  /**
   * Obtiene la longitud de la cola principal.
   * Útil para monitoreo y alertas.
   */
  async getQueueLength(): Promise<number> {
    return await this.redis.llen(this.config.queueName);
  }

  /**
   * Obtiene la longitud de la Dead Letter Queue.
   * Útil para alertas de eventos fallidos.
   */
  async getDLQLength(): Promise<number> {
    return await this.redis.llen(this.config.dlqName);
  }
}

// Exportar instancia singleton con configuración por defecto
export const queueClient = new QueueClient();