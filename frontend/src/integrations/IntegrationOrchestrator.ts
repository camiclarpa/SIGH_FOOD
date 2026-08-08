/**
 * ============================================================================
 * INTEGRATION ORCHESTRATOR - Envío Paralelo de Integraciones
 * RFC-001: Capa de Integraciones Externas
 * RFC-HPBN: Capítulo 5 "Parallel Processing"
 * RFC-DDIA: Capítulo 7 "Dual Writes"
 * ============================================================================
 * 
 * FUNCIÓN: Coordinar el envío paralelo de notificaciones (Slack + WhatsApp)
 * SIN bloquear la sincronización del CRM.
 * 
 * REFERENCIA RFC-HPBN:
 *   Capítulo 5: "Parallel Processing" — cuando múltiples operaciones I/O
 *   son independientes, ejecutarlas en paralelo reduce la latencia total
 *   al máximo de las individuales, no a la suma.
 * 
 * REFERENCIA RFC-DDIA:
 *   Capítulo 7: "Dual Writes" — las notificaciones NO son writes críticos.
 *   Si Slack o WhatsApp fallan, el Lead ya está encolado en Upstash Redis
 *   (fuente de verdad). Las notificaciones son "nice to have".
 * 
 * DISEÑO:
 *   - Promise.allSettled: todas las notificaciones se intentan, ninguna
 *     falla bloquea a las demás
 *   - No await en el caller: fire-and-forget
 *   - Logging de resultados para debugging
 * ============================================================================
 */

import { SlackNotifier } from './notifications/SlackNotifier';
import { WhatsAppNotifier } from './notifications/WhatsAppNotifier';
import { LeadRepository, LeadData } from '../domain/ports/LeadRepository';

export interface IntegrationResult {
  readonly crm: { success: boolean; error?: string };
  readonly slack: { success: boolean; error?: string };
  readonly whatsapp: { success: boolean; error?: string };
}

export class IntegrationOrchestrator {
  private crmRepository: LeadRepository;
  private slackNotifier?: SlackNotifier;
  private whatsappNotifier?: WhatsAppNotifier;

  constructor(
    crmRepository: LeadRepository,
    slackNotifier?: SlackNotifier,
    whatsappNotifier?: WhatsAppNotifier
  ) {
    this.crmRepository = crmRepository;
    this.slackNotifier = slackNotifier;
    this.whatsappNotifier = whatsappNotifier;
  }

  /**
   * Procesa un Lead completo: CRM + notificaciones en paralelo.
   * 
   * Flujo:
   * 1. Sincronizar con CRM (crítico, con reintentos del Worker)
   * 2. Enviar notificaciones en paralelo (no crítico, fire-and-forget)
   * 
   * @returns Resultado de todas las integraciones
   */
  async processLead(lead: LeadData): Promise<IntegrationResult> {
    // 1. CRM (crítico)
    const crmResult = await this.crmRepository.guardar(lead);

    // 2. Notificaciones en paralelo (no crítico)
    const slackPromise = this.slackNotifier
      ? this.slackNotifier.notifyNewLead({
          leadEstablecimiento: lead.establecimiento,
          leadWhatsapp: lead.whatsapp,
          leadCiudad: lead.ciudad,
          idempotencyKey: lead.idempotencyKey,
        }).then(() => ({ success: true })).catch(e => ({ success: false, error: e.message }))
      : Promise.resolve({ success: false, error: 'Slack not configured' });

    const whatsappPromise = this.whatsappNotifier
      ? this.whatsappNotifier.notifyNewLead({
          leadEstablecimiento: lead.establecimiento,
          leadWhatsapp: lead.whatsapp,
          leadCiudad: lead.ciudad,
        }).then(() => ({ success: true })).catch(e => ({ success: false, error: e.message }))
      : Promise.resolve({ success: false, error: 'WhatsApp not configured' });

    const [slackResult, whatsappResult] = await Promise.allSettled([slackPromise, whatsappPromise]);

    return {
      crm: { success: crmResult.success, error: crmResult.error },
      slack: slackResult.status === 'fulfilled' ? slackResult.value : { success: false, error: 'Promise rejected' },
      whatsapp: whatsappResult.status === 'fulfilled' ? whatsappResult.value : { success: false, error: 'Promise rejected' },
    };
  }
}