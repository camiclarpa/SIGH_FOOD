/**
 * PIPEDRIVE LEAD REPOSITORY Ã¢â‚¬â€ Adaptador Concreto para Pipedrive CRM
 * 
 * Este adaptador implementa la interfaz LeadRepository del dominio,
 * siguiendo el patrÃƒÂ³n de puertos y adaptadores de Clean Architecture.
 * 
 * NOTA: En producciÃƒÂ³n, este adaptador NO escribe directamente a Pipedrive.
 * En su lugar, la Edge Function realiza un LPUSH a la cola de Upstash Redis
 * (patrÃƒÂ³n append-only, similar a LSM-Tree), y un consumidor asÃƒÂ­ncrono
 * sincroniza los leads al CRM.
 * 
 * Ver RFC-DDIA SecciÃƒÂ³n 3.2: "Upstash Redis como LSM-Tree"
 */

import { type Lead } from '../sighfood-domain/entities/Lead';
import { type LeadRepository } from '../sighfood-domain/ports/LeadRepository';

export class PipedriveLeadRepository implements LeadRepository {
  private readonly apiToken: string;
  private readonly baseUrl = 'https://api.pipedrive.com/v1/persons';

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Guarda un lead en Pipedrive CRM.
   * 
   * En producciÃƒÂ³n, este mÃƒÂ©todo es invocado por el consumidor asÃƒÂ­ncrono
   * de la cola de Upstash Redis, NO directamente por la Edge Function.
   * 
   * La Edge Function solo hace:
   *   await redis.lpush('lead-events-log', JSON.stringify(lead));
   * 
   * Esto sigue el patrÃƒÂ³n append-only de LSM-Tree descrito en RFC-DDIA.
   */
  async guardar(lead: Lead): Promise<void> {
    const payload = {
      name: lead.tomadorDecision.nombre,
      org_name: lead.establecimiento,
      phone: lead.whatsapp,
    };

    const response = await fetch(`${this.baseUrl}?api_token=${this.apiToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Pipedrive API error: ${response.status} - ${errorBody}`);
    }

    console.log(`[Pipedrive] Lead guardado: ${lead.establecimiento}`);
  }
}