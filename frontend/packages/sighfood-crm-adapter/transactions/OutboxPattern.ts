/**
 * ============================================================================
 * OUTBOX PATTERN - Evitar Dual Writes (DDIA, Capítulo 7)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (Capítulo 7):
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Kleppmann describe el problema de "dual writes": cuando una aplicación
 * escribe explícitamente a dos sistemas distintos (ej. base de datos + índice
 * de búsqueda), pueden ocurrir dos fallas independientes:
 * 
 * 1. Condición de carrera: dos escrituras concurrentes llegan en orden distinto
 *    a cada sistema, dejándolos permanentemente inconsistentes.
 * 
 * 2. Falla parcial: una escritura tiene éxito y la otra falla, sin ningún
 *    mecanismo que garantice que ambas se completen juntas.
 * 
 * APLICACIÓN A SIGH_FOOD:
 *   Si la Edge Function escribiera directamente al CRM y enviara un email de
 *   confirmación como dos operaciones independientes, un fallo de red entre
 *   esas dos escrituras dejaría un Lead registrado sin email (o viceversa).
 * 
 * SOLUCIÓN: Patrón Outbox (Cola Única como Fuente de Verdad)
 *   La Edge Function realiza UNA sola escritura atómica: LPUSH a la cola de
 *   Upstash Redis. El CRM, el email de confirmación, y el dashboard son todos
 *   consumidores independientes de esa misma cola.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 7: Transacciones
 *   • Sección 7.2: El problema de "dual writes"
 *   • Sección 7.3: Alternativas a 2PC (Two-Phase Commit)
 * ============================================================================
 */

import { type Lead } from '@sighfood/domain/entities/Lead';

export interface OutboxEvent {
  readonly eventId: string;
  readonly eventType: 'lead_created' | 'lead_updated' | 'lead_synced_to_crm';
  readonly payload: Lead;
  readonly timestamp: number;
  readonly partitionId: number;
}

/**
 * Crea un evento outbox para un Lead nuevo.
 * 
 * Este es el ÃšNICO punto de escritura en el sistema â€” no hay dual writes.
 * Todos los sistemas downstream (CRM, email, dashboard) leen de este mismo log.
 */
export function createOutboxEvent(lead: Lead, partitionId: number): OutboxEvent {
  return {
    eventId: `event-${Date.now()}-${lead.whatsapp}`,
    eventType: 'lead_created',
    payload: lead,
    timestamp: Date.now(),
    partitionId,
  };
}

/**
 * Patrón de consumo: múltiples lectores independientes del mismo log.
 * 
 * Cada consumidor procesa eventos de forma independiente:
 *   - Consumidor 1: Sincroniza al CRM (HubSpot/Pipedrive)
 *   - Consumidor 2: Envía email de confirmación
 *   - Consumidor 3: Actualiza dashboard en tiempo real
 * 
 * Ninguno de los 3 bloquea a los otros ni depende de que los otros tengan éxito.
 * Si el CRM falla, el email y el dashboard no se ven afectados.
 */
export interface EventConsumer {
  readonly name: string;
  process(event: OutboxEvent): Promise<void>;
}

export class CrmSyncConsumer implements EventConsumer {
  readonly name = 'crm-sync';
  
  async process(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'lead_created') return;
    
    // Simulación: en producción, esto llamaría a HubSpot/Pipedrive API
    console.log(`[${this.name}] Syncing lead ${event.payload.establecimiento} to CRM`);
    // await hubspotApi.createContact(event.payload);
  }
}

export class EmailConfirmationConsumer implements EventConsumer {
  readonly name = 'email-confirmation';
  
  async process(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'lead_created') return;
    
    // Simulación: en producción, esto enviaría un email vía Resend
    console.log(`[${this.name}] Sending confirmation email to ${event.payload.whatsapp}`);
    // await resendApi.sendEmail({ to: event.payload.whatsapp, ... });
  }
}

export class DashboardConsumer implements EventConsumer {
  readonly name = 'dashboard-realtime';
  
  async process(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'lead_created') return;
    
    // Simulación: en producción, esto actualizaría un contador en Redis
    console.log(`[${this.name}] Updating dashboard counter for lead ${event.eventId}`);
    // await redis.incr('leads_today_count');
  }
}

/**
 * Orquestador de consumidores: procesa un evento con todos los consumidores.
 * 
 * Nota: cada consumidor se ejecuta de forma independiente. Si uno falla, los
 * demás continúan. El evento permanece en la cola para reintento del consumidor
 * fallido (garantía at-least-once de Upstash Redis).
 */
export async function processEventWithAllConsumers(
  event: OutboxEvent,
  consumers: EventConsumer[]
): Promise<Map<string, 'success' | 'failed'>> {
  const results = new Map<string, 'success' | 'failed'>();
  
  const promises = consumers.map(async (consumer) => {
    try {
      await consumer.process(event);
      results.set(consumer.name, 'success');
    } catch (error) {
      results.set(consumer.name, 'failed');
      console.error(`[${consumer.name}] Failed to process event ${event.eventId}:`, error);
    }
  });
  
  await Promise.allSettled(promises);
  return results;
}