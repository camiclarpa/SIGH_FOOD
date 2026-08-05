/**
 * ============================================================================
 * SLACK NOTIFIER — Notificaciones al Equipo Comercial
 * RFC-001: Capa de Integraciones Externas (Sección 3.4)
 * RFC-HPBN: Capítulo 9 "I/O Is Slow"
 * ============================================================================
 * 
 * FUNCIÓN: Enviar notificaciones al canal de Slack del equipo comercial
 * cuando se recibe un nuevo Lead.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.4: "Notificación WhatsApp/Slack al equipo comercial"
 * 
 * REFERENCIA RFC-HPBN:
 *   Capítulo 9: "I/O Is Slow" — las notificaciones se envían en PARALELO
 *   con la sincronización del CRM, nunca en el camino crítico del usuario.
 * 
 * DISEÑO:
 *   - Fire-and-forget: si Slack falla, no afecta al Lead
 *   - Timeout de 3 segundos (menos crítico que el CRM)
 *   - Formato rico con Slack Block Kit para mejor legibilidad
 * 
 * CONFIGURACIÓN:
 *   Variables de entorno requeridas:
 *   - SLACK_WEBHOOK_URL: URL del webhook de Slack
 *   - SLACK_CHANNEL: Canal destino (default: #leads-sighfood)
 * ============================================================================
 */

export interface SlackNotification {
  readonly leadEstablecimiento: string;
  readonly leadWhatsapp: string;
  readonly leadCiudad?: string;
  readonly idempotencyKey: string;
}

export class SlackNotifier {
  private readonly webhookUrl: string;
  private readonly channel: string;
  private readonly timeoutMs: number;

  constructor(webhookUrl: string, channel: string = '#leads-sighfood', timeoutMs: number = 3000) {
    this.webhookUrl = webhookUrl;
    this.channel = channel;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Envía notificación de nuevo Lead a Slack.
   * 
   * Fire-and-forget: el caller no debe await este método.
   * Si falla, se loguea pero no se reintenta (no es crítico).
   */
  async notifyNewLead(notification: SlackNotification): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const payload = {
        channel: this.channel,
        text: `🎯 Nuevo Lead: ${notification.leadEstablecimiento}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🎯 Nuevo Lead SIGH_FOOD',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Establecimiento:*\n${notification.leadEstablecimiento}`,
              },
              {
                type: 'mrkdwn',
                text: `*WhatsApp:*\n${notification.leadWhatsapp}`,
              },
              {
                type: 'mrkdwn',
                text: `*Ciudad:*\n${notification.leadCiudad || 'No especificada'}`,
              },
              {
                type: 'mrkdwn',
                text: `*ID:*\n\`${notification.idempotencyKey}\``,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: ` ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn('[SlackNotifier] Fallo al enviar notificación:', response.status);
      }
    } catch (error) {
      // Fire-and-forget: no propagar errores
      console.warn('[SlackNotifier] Error:', error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}