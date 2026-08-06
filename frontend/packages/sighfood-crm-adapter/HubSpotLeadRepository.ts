/**
 * HUBSPOT LEAD REPOSITORY
 * Parte VI: BD/CRM son detalles (Capítulo 30)
 * Implementa la interfaz LeadRepository del dominio
 */

import { type Lead } from '@sighfood/domain/ports/LeadRepository';

export class HubSpotLeadRepository {
  async guardar(lead: Lead): Promise<void> {
    // Implementación concreta para HubSpot CRM
    console.log('Guardando lead en HubSpot:', lead);
  }
}