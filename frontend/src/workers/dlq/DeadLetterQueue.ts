/**
 * ============================================================================
 * DEAD LETTER QUEUE - Cola de Mensajes Fallidos
 * RFC-001: Capa Backend (Sección 3.3)
 * ============================================================================
 * 
 * FUNCIÓN: Gestionar eventos que fallaron tras múltiples reintentos,
 * permitiendo investigación manual y resolución.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.3: "Dead Letter Queue (DLQ) — Almacena eventos que fallaron
 *   tras 3 reintentos, para investigación manual"
 * 
 * REFERENCIA RFC-001 Sección 6:
 *   "Fallo persistente tras 3 reintentos — Pérdida silenciosa del Lead"
 *   Mitigación: "Dead Letter Queue con alerta activa al equipo de ingeniería"
 * 
 * GARANTÍA:
 *   Cero pérdida de datos de Leads — ningún evento se descarta silenciosamente,
 *   incluso ante una falla persistente del CRM.
 * 
 * FLUJO DE RESOLUCIÓN:
 * 1. Evento falla tras 4 reintentos
 * 2. Se mueve a DLQ con razón del fallo
 * 3. Alerta automática a Slack del equipo de ingeniería
 * 4. Ingeniero investiga y resuelve manualmente
 * 5. Evento se reencola o se descarta según el caso
 * ============================================================================
 */

import { QueueClient } from '../../queue/upstash/QueueClient';

export interface DLQEvent {
  readonly originalEvent: string;
  readonly failureReason: string;
  readonly timestamp: number;
  readonly retryAttempts: number;
}

export class DeadLetterQueueManager {
  private queueClient: QueueClient;

  constructor(queueClient: QueueClient) {
    this.queueClient = queueClient;
  }

  /**
   * Obtiene todos los eventos de la DLQ.
   * 
   * @returns Lista de eventos fallidos
   */
  async getAllEvents(): Promise<DLQEvent[]> {
    const length = await this.queueClient.getDLQLength();
    if (length === 0) {
      return [];
    }

    // Obtener todos los eventos (LRANGE)
    const events = await this.queueClient.redis.lrange('dead-letter-queue', 0, length - 1);
    
    return events.map(eventJson => JSON.parse(eventJson) as DLQEvent);
  }

  /**
   * Obtiene la cantidad de eventos en la DLQ.
   * 
   * @returns Número de eventos fallidos
   */
  async getEventCount(): Promise<number> {
    return await this.queueClient.getDLQLength();
  }

  /**
   * Reencola un evento desde la DLQ para reintentar.
   * 
   * @param eventIndex - Índice del evento a reencolar
   */
  async retryEvent(eventIndex: number): Promise<void> {
    const events = await this.getAllEvents();
    if (eventIndex < 0 || eventIndex >= events.length) {
      throw new Error(`Índice inválido: ${eventIndex}`);
    }

    const event = events[eventIndex];
    
    // Reencolar en la cola principal
    await this.queueClient.redis.lpush('lead-events-log', event.originalEvent);
    
    // Remover de la DLQ (LSET + LREM)
    await this.queueClient.redis.lset('dead-letter-queue', eventIndex, 'PROCESSED');
    await this.queueClient.redis.lrem('dead-letter-queue', 0, 'PROCESSED');
    
    console.log(`[DLQ] Evento reencolado: ${event.originalEvent}`);
  }

  /**
   * Descarta un evento de la DLQ permanentemente.
   * 
   * @param eventIndex - Índice del evento a descartar
   * @param reason - Razón del descarte
   */
  async discardEvent(eventIndex: number, reason: string): Promise<void> {
    const events = await this.getAllEvents();
    if (eventIndex < 0 || eventIndex >= events.length) {
      throw new Error(`Índice inválido: ${eventIndex}`);
    }

    // Remover de la DLQ
    await this.queueClient.redis.lset('dead-letter-queue', eventIndex, 'DISCARDED');
    await this.queueClient.redis.lrem('dead-letter-queue', 0, 'DISCARDED');
    
    console.log(`[DLQ] Evento descartado: ${reason}`);
  }

  /**
   * Envía una alerta al equipo de ingeniería cuando hay eventos en la DLQ.
   * 
   * En producción, esto enviaría un mensaje a Slack/PagerDuty.
   */
  async sendAlert(): Promise<void> {
    const count = await this.getEventCount();
    if (count > 0) {
      console.log(`[ALERTA] ${count} eventos en la Dead Letter Queue requieren atención manual.`);
      // En producción:
      // await slackNotifier.send(`⚠️ ${count} eventos en DLQ`);
    }
  }
}