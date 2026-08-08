/**
 * ============================================================================
 * PIPEDRIVE LEAD REPOSITORY — Adaptador Concreto Alternativo
 * RFC-001: Capa de Integraciones Externas
 * RFC-Clean-Architecture: Capítulo 30 "La Base de Datos Es un Detalle"
 * ============================================================================
 * 
 * FUNCIÓN: Implementar LeadRepository usando Pipedrive CRM como destino.
 * 
 * JUSTIFICACIÓN:
 *   Este archivo demuestra que migrar de HubSpot a Pipedrive (o añadir un
 *   tercer CRM) no requiere tocar NINGÚN archivo del dominio ni de la UI —
 *   solo se escribe un nuevo adapter que implementa la misma interfaz
 *   LeadRepository.
 * 
 * REFERENCIA RFC-CLEAN-ARCHITECTURE:
 *   Capítulo 26: "El Componente Main" — donde se decide qué adapter usar.
 *   
 *   En apps/web/app/api/leads/route.ts:
 *     const repositorio = new PipedriveLeadRepository(process.env.PIPEDRIVE_API_TOKEN!);
 *   
 *   El resto del código (AgendarDemoUseCase, FormularioLeadController)
 *   NO CAMBIA NI UNA LÍNEA.
 * 
 * DIFERENCIAS CON HUBSPOT:
 *   - Pipedrive usa "persons" en vez de "contacts"
 *   - Pipedrive usa api_token en query string en vez de Bearer token
 *   - Pipedrive no tiene propiedad de idempotencia nativa (se maneja en app)
 * ============================================================================
 */

import { LeadRepository, LeadData, LeadRepositoryResult } from '../../domain/ports/LeadRepository';

export class PipedriveLeadRepository implements LeadRepository {
  private readonly apiToken: string;
  private readonly apiBase: string;
  private readonly timeoutMs: number;

  constructor(apiToken: string, apiBase: string = 'https://api.pipedrive.com/v1', timeoutMs: number = 5000) {
    this.apiToken = apiToken;
    this.apiBase = apiBase;
    this.timeoutMs = timeoutMs;
  }

  async guardar(lead: LeadData): Promise<LeadRepositoryResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payload = {
        name: lead.tomadorDecision?.nombre || lead.establecimiento,
        org_name: lead.establecimiento,
        phone: lead.whatsapp,
        // Campos personalizados de SIGH_FOOD (requieren configuración en Pipedrive)
        // field_key_licores: (lead.licoresDominantes || []).join(', '),
        // field_key_ciudad: lead.ciudad,
        // field_key_idempotency: lead.idempotencyKey,
      };

      const response = await fetch(`${this.apiBase}/persons?api_token=${this.apiToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          crmRecordId: data.data?.id?.toString(),
        };
      }

      const errorBody = await response.text();
      return {
        success: false,
        error: `Pipedrive API error ${response.status}: ${errorBody}`,
      };
    } catch (error) {
      // El abort de fetch llega como DOMException, que no siempre es
      // instanceof Error; basta comprobar el name.
      if ((error as { name?: string } | null)?.name === 'AbortError') {
        return {
          success: false,
          error: `Pipedrive timeout after ${this.timeoutMs}ms`,
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