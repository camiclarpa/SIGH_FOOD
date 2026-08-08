/**
 * ============================================================================
 * HUBSPOT LEAD REPOSITORY — Adaptador Concreto (RFC-Clean-Architecture Cap. 30)
 * RFC-001: Capa de Integraciones Externas
 * RFC-DDIA: Capítulo 30 "La Base de Datos Es un Detalle"
 * ============================================================================
 * 
 * FUNCIÓN: Implementar LeadRepository usando HubSpot CRM como destino.
 * 
 * REFERENCIA RFC-CLEAN-ARCHITECTURE:
 *   Capítulo 30: "La Base de Datos Es un Detalle" — este archivo es un
 *   detalle intercambiable. Si mañana migramos a Pipedrive, solo cambiamos
 *   este archivo, no el dominio.
 * 
 * REFERENCIA RFC-DDIA:
 *   Capítulo 7: "Dual Writes" — este adaptador NUNCA se invoca directamente
 *   desde la Edge Function. Solo se invoca desde el Worker Consumer que
 *   procesa la cola de Upstash Redis (patrón outbox).
 * 
 * REFERENCIA RFC-HPBN:
 *   Capítulo 9: "I/O Is Slow" — timeout de 5 segundos para no bloquear
 *   el Worker Consumer indefinidamente.
 * 
 * CONFIGURACIÓN:
 *   Variables de entorno requeridas:
 *   - HUBSPOT_ACCESS_TOKEN: Token de acceso privado de HubSpot
 *   - HUBSPOT_API_BASE: https://api.hubapi.com (default)
 * ============================================================================
 */

import { LeadRepository, LeadData, LeadRepositoryResult } from '../../domain/ports/LeadRepository';

export class HubSpotLeadRepository implements LeadRepository {
  private readonly accessToken: string;
  private readonly apiBase: string;
  private readonly timeoutMs: number;

  constructor(accessToken: string, apiBase: string = 'https://api.hubapi.com', timeoutMs: number = 5000) {
    this.accessToken = accessToken;
    this.apiBase = apiBase;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Persiste un Lead en HubSpot CRM.
   * 
   * Flujo:
   * 1. Construir payload con propiedades de HubSpot
   * 2. POST a /crm/v3/objects/contacts
   * 3. Manejar errores (409 = duplicado, 429 = rate limit, 5xx = retry)
   * 
   * Idempotencia:
   *   HubSpot permite definir propiedades únicas. El idempotencyKey se guarda
   *   en una propiedad personalizada 'idempotency_key__c' para detectar
   *   duplicados a nivel de CRM.
   */
  async guardar(lead: LeadData): Promise<LeadRepositoryResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payload = {
        properties: {
          email: `${lead.whatsapp.replace(/[^0-9]/g, '')}@sighfood.local`,
          firstname: lead.tomadorDecision?.nombre || lead.establecimiento,
          company: lead.establecimiento,
          phone: lead.whatsapp,
          city: lead.ciudad || 'No especificada',
          lifecyclestage: 'lead',
          // Propiedad personalizada para idempotencia
          idempotency_key__c: lead.idempotencyKey,
          // Propiedad personalizada para licores
          licores_dominantes__c: (lead.licoresDominantes || []).join(', '),
        },
      };

      const response = await fetch(`${this.apiBase}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.status === 201) {
        const data = await response.json();
        return {
          success: true,
          crmRecordId: data.id,
        };
      }

      if (response.status === 409) {
        // Duplicado — idempotencia a nivel de CRM
        return {
          success: true,
          crmRecordId: 'duplicate',
        };
      }

      if (response.status === 429) {
        // Rate limit — el Worker Consumer debe reintentar con backoff
        const errorBody = await response.text();
        return {
          success: false,
          error: `HubSpot rate limit: ${errorBody}`,
        };
      }

      const errorBody = await response.text();
      return {
        success: false,
        error: `HubSpot API error ${response.status}: ${errorBody}`,
      };
    } catch (error) {
      // El abort de fetch llega como DOMException, que no siempre es
      // instanceof Error; basta comprobar el name.
      if ((error as { name?: string } | null)?.name === 'AbortError') {
        return {
          success: false,
          error: `HubSpot timeout after ${this.timeoutMs}ms`,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}