/**
 * HUBSPOT LEAD REPOSITORY — Adaptador Concreto para HubSpot CRM
 * 
 * Este adaptador implementa la interfaz LeadRepository del dominio,
 * siguiendo el patrón de puertos y adaptadores de Clean Architecture.
 * 
 * NOTA: En producción, este adaptador NO escribe directamente a HubSpot.
 * En su lugar, la Edge Function realiza un LPUSH a la cola de Upstash Redis
 * (patrón append-only, similar a LSM-Tree), y un consumidor asíncrono
 * sincroniza los leads al CRM.
 * 
 * Ver RFC-DDIA Sección 3.2: "Upstash Redis como LSM-Tree"
 */

import { type Lead } from '@sighfood/domain/entities/Lead';
import { type LeadRepository } from '@sighfood/domain/ports/LeadRepository';

export class HubSpotLeadRepository implements LeadRepository {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.hubapi.com/crm/v3/objects/contacts';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Guarda un lead en HubSpot CRM.
   * 
   * En producción, este método es invocado por el consumidor asíncrono
   * de la cola de Upstash Redis, NO directamente por la Edge Function.
   * 
   * La Edge Function solo hace:
   *   await redis.lpush('lead-events-log', JSON.stringify(lead));
   * 
   * Esto sigue el patrón append-only de LSM-Tree descrito en RFC-DDIA.
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