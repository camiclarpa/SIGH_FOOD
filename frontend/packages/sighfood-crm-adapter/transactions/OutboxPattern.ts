/**
 * ============================================================================
 * OUTBOX PATTERN - Evitar Dual Writes (DDIA, CapÃƒÆ’Ã‚Â­tulo 7)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃƒÆ’Ã‚Â­tulo 7):
 * ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
 * Kleppmann describe el problema de "dual writes": cuando una aplicaciÃƒÆ’Ã‚Â³n
 * escribe explÃƒÆ’Ã‚Â­citamente a dos sistemas distintos (ej. base de datos + ÃƒÆ’Ã‚Â­ndice
 * de bÃƒÆ’Ã‚Âºsqueda), pueden ocurrir dos fallas independientes:
 * 
 * 1. CondiciÃƒÆ’Ã‚Â³n de carrera: dos escrituras concurrentes llegan en orden distinto
 *    a cada sistema, dejÃƒÆ’Ã‚Â¡ndolos permanentemente inconsistentes.
 * 
 * 2. Falla parcial: una escritura tiene ÃƒÆ’Ã‚Â©xito y la otra falla, sin ningÃƒÆ’Ã‚Âºn
 *    mecanismo que garantice que ambas se completen juntas.
 * 
 * APLICACIÃƒÆ’Ã¢â‚¬Å“N A SIGH_FOOD:
 *   Si la Edge Function escribiera directamente al CRM y enviara un email de
 *   confirmaciÃƒÆ’Ã‚Â³n como dos operaciones independientes, un fallo de red entre
 *   esas dos escrituras dejarÃƒÆ’Ã‚Â­a un Lead registrado sin email (o viceversa).
 * 
 * SOLUCIÃƒÆ’Ã¢â‚¬Å“N: PatrÃƒÆ’Ã‚Â³n Outbox (Cola ÃƒÆ’Ã…Â¡nica como Fuente de Verdad)
 *   La Edge Function realiza UNA sola escritura atÃƒÆ’Ã‚Â³mica: LPUSH a la cola de
 *   Upstash Redis. El CRM, el email de confirmaciÃƒÆ’Ã‚Â³n, y el dashboard son todos
 *   consumidores independientes de esa misma cola.
 * 
 * REFERENCIAS DEL LIBRO:
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ CapÃƒÆ’Ã‚Â­tulo 7: Transacciones
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ SecciÃƒÆ’Ã‚Â³n 7.2: El problema de "dual writes"
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ SecciÃƒÆ’Ã‚Â³n 7.3: Alternativas a 2PC (Two-Phase Commit)
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
 * Este es el ÃƒÆ’Ã…Â¡NICO punto de escritura en el sistema ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â no hay dual writes.
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
 * PatrÃƒÆ’Ã‚Â³n de consumo: mÃƒÆ’Ã‚Âºltiples lectores independientes del mismo log.
 * 
 * Cada consumidor procesa eventos de forma independiente:
 *   - Consumidor 1: Sincroniza al CRM (HubSpot/Pipedrive)
 *   - Consumidor 2: EnvÃƒÆ’Ã‚Â­a email de confirmaciÃƒÆ’Ã‚Â³n
 *   - Consumidor 3: Actualiza dashboard en tiempo real
 * 
 * Ninguno de los 3 bloquea a los otros ni depende de que los otros tengan ÃƒÆ’Ã‚Â©xito.
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
    
    // SimulaciÃƒÆ’Ã‚Â³n: en producciÃƒÆ’Ã‚Â³n, esto llamarÃƒÆ’Ã‚Â­a a HubSpot/Pipedrive API
    console.log(`[${this.name}] Syncing lead ${event.payload.establecimiento} to CRM`);
    // await hubspotApi.createContact(event.payload);
  }
}

export class EmailConfirmationConsumer implements EventConsumer {
  readonly name = 'email-confirmation';
  
  async process(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'lead_created') return;
    
    // SimulaciÃƒÆ’Ã‚Â³n: en producciÃƒÆ’Ã‚Â³n, esto enviarÃƒÆ’Ã‚Â­a un email vÃƒÆ’Ã‚Â­a Resend
    console.log(`[${this.name}] Sending confirmation email to ${event.payload.whatsapp}`);
    // await resendApi.sendEmail({ to: event.payload.whatsapp, ... });
  }
}

export class DashboardConsumer implements EventConsumer {
  readonly name = 'dashboard-realtime';
  
  async process(event: OutboxEvent): Promise<void> {
    if (event.eventType !== 'lead_created') return;
    
    // SimulaciÃƒÆ’Ã‚Â³n: en producciÃƒÆ’Ã‚Â³n, esto actualizarÃƒÆ’Ã‚Â­a un contador en Redis
    console.log(`[${this.name}] Updating dashboard counter for lead ${event.eventId}`);
    // await redis.incr('leads_today_count');
  }
}

/**
 * Orquestador de consumidores: procesa un evento con todos los consumidores.
 * 
 * Nota: cada consumidor se ejecuta de forma independiente. Si uno falla, los
 * demÃƒÆ’Ã‚Â¡s continÃƒÆ’Ã‚Âºan. El evento permanece en la cola para reintento del consumidor
 * fallido (garantÃƒÆ’Ã‚Â­a at-least-once de Upstash Redis).
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