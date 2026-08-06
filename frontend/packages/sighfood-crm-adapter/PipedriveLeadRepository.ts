/**
 * PIPEDRIVE LEAD REPOSITORY
 * Parte VI: BD/CRM son detalles (CapÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­tulo 30)
 * Implementa la interfaz LeadRepository del dominio
 */

import { type Lead } from '../sighfood-domain/ports/LeadRepository';

export class PipedriveLeadRepository {
  async guardar(lead: Lead): Promise<void> {
    // ImplementaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n concreta para Pipedrive CRM
    console.log('Guardando lead en Pipedrive:', lead);
  }
}