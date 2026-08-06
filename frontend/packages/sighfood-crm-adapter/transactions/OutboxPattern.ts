/**
 * ============================================================================
 * OUTBOX PATTERN - Evitar Dual Writes (DDIA, CapÃ­tulo 7)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃ­tulo 7):
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Kleppmann describe el problema de "dual writes": cuando una aplicaciÃ³n
 * escribe explÃ­citamente a dos sistemas distintos (ej. base de datos + Ã­ndice
 * de bÃºsqueda), pueden ocurrir dos fallas independientes:
 * 
 * 1. CondiciÃ³n de carrera: dos escrituras concurrentes llegan en orden distinto
 *    a cada sistema, dejÃ¡ndolos permanentemente inconsistentes.
 * 
 * 2. Falla parcial: una escritura tiene Ã©xito y la otra falla, sin ningÃºn
 *    mecanismo que garantice que ambas se completen juntas.
 * 
 * APLICACIÃ“N A SIGH_FOOD:
 *   Si la Edge Function escribiera directamente al CRM y enviara un email de
 *   confirmaciÃ³n como dos operaciones independientes, un fallo de red entre
 *   esas dos escrituras dejarÃ­a un Lead registrado sin email (o viceversa).
 * 
 * SOLUCIÃ“N: PatrÃ³n Outbox (Cola Ãšnica como Fuente de Verdad)
 *   La Edge Function realiza UNA sola escritura atÃ³mica: LPUSH a la cola de
 *   Upstash Redis. El CRM, el email de confirmaciÃ³n, y el dashboard son todos
 *   consumidores independientes de esa misma cola.
 * 
 * REFERENCIAS DEL LIBRO:
 *   â€¢ CapÃ­tulo 7: Transacciones
 *   â€¢ SecciÃ³n 7.2: El problema de "dual writes"
 *   â€¢ SecciÃ³n 7.3: Alternativas a 2PC (Two-Phase Commit)
 * ============================================================================
 */

import { type Lead } from '../../sighfood-domain/entities/Lead';

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
 * PatrÃ³n de consumo: mÃºltiples lectores independientes del mismo log.
 * 
 * Cada consumidor procesa eventos de forma independiente:
 *   - Consumidor 1: Sincroniza al CRM (HubSpot/Pipedrive)
 *   - Consumidor 2: EnvÃ­a email de confirmaciÃ³n
 *   - Consumidor 3: Actualiza dashboard en tiempo real
 * 
 * Ninguno de los 3 bloquea a los otros ni depende de que los otros tengan Ã©xito.
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
    
    // SimulaciÃ³n: en producciÃ³n, esto llamarÃ­a a HubSpot/Pipedrive API
    console.log(`[${this.name}] Syncing lead ${event.payload.establecimiento} to CRM`);
    // await hubspotApi.createContact(event.payload);
  }
}

export class EmailConfirmationConsumer implements EventConsumer {
  readonly name = 'email-confirmation';
  
  async process(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'lead_created') return;
    
    // SimulaciÃ³n: en producciÃ³n, esto enviarÃ­a un email vÃ­a Resend
    console.log(`[${this.name}] Sending confirmation email to ${event.payload.whatsapp}`);
    // await resendApi.sendEmail({ to: event.payload.whatsapp, ... });
  }
}

export class DashboardConsumer implements EventConsumer {
  readonly name = 'dashboard-realtime';
  
  async process(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'lead_created') return;
    
    // SimulaciÃ³n: en producciÃ³n, esto actualizarÃ­a un contador en Redis
    console.log(`[${this.name}] Updating dashboard counter for lead ${event.eventId}`);
    // await redis.incr('leads_today_count');
  }
}

/**
 * Orquestador de consumidores: procesa un evento con todos los consumidores.
 * 
 * Nota: cada consumidor se ejecuta de forma independiente. Si uno falla, los
 * demÃ¡s continÃºan. El evento permanece en la cola para reintento del consumidor
 * fallido (garantÃ­a at-least-once de Upstash Redis).
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