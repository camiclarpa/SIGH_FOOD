/**
 * HUBSPOT LEAD REPOSITORY â€” Adaptador Concreto para HubSpot CRM
 * 
 * Este adaptador implementa la interfaz LeadRepository del dominio,
 * siguiendo el patrÃ³n de puertos y adaptadores de Clean Architecture.
 * 
 * NOTA: En producciÃ³n, este adaptador NO escribe directamente a HubSpot.
 * En su lugar, la Edge Function realiza un LPUSH a la cola de Upstash Redis
 * (patrÃ³n append-only, similar a LSM-Tree), y un consumidor asÃ­ncrono
 * sincroniza los leads al CRM.
 * 
 * Ver RFC-DDIA SecciÃ³n 3.2: "Upstash Redis como LSM-Tree"
 */

import { type Lead } from '../../sighfood-domain/entities/Lead';
import { type LeadRepository } from '../../sighfood-domain/ports/LeadRepository';

export class HubSpotLeadRepository implements LeadRepository {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.hubapi.com/crm/v3/objects/contacts';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Guarda un lead en HubSpot CRM.
   * 
   * En producciÃ³n, este mÃ©todo es invocado por el consumidor asÃ­ncrono
   * de la cola de Upstash Redis, NO directamente por la Edge Function.
   * 
   * La Edge Function solo hace:
   *   await redis.lpush('lead-events-log', JSON.stringify(lead));
   * 
   * Esto sigue el patrÃ³n append-only de LSM-Tree descrito en RFC-DDIA.
   */
  async guardar(lead: Lead): Promise<void> {
    const payload = {
      properties: {
        email: `${lead.whatsapp}@sighfood.local`,
        firstname: lead.tomadorDecision.nombre,
        company: lead.establecimiento,
        phone: lead.whatsapp,
        lifecyclestage: 'lead',
        licores_dominantes: lead.licoresDominantes.join(', '),
        ciudad: lead.ciudad || 'No especificada',
        rol_tomador_decision: lead.tomadorDecision.rol,
      },
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${errorBody}`);
    }

    console.log(`[HubSpot] Lead guardado: ${lead.establecimiento}`);
  }
}