/**
 * ============================================================================
 * WHATSAPP NOTIFIER — Notificaciones WhatsApp al Equipo Comercial
 * RFC-001: Capa de Integraciones Externas (Sección 3.4)
 * ============================================================================
 * 
 * FUNCIÓN: Enviar notificaciones WhatsApp al equipo comercial cuando se
 * recibe un nuevo Lead.
 * 
 * REFERENCIA RFC-001:
 *   Sección 3.4: "Notificación WhatsApp/Slack al equipo comercial"
 * 
 * INTEGRACIÓN:
 *   Usa la API de WhatsApp Business (Twilio o Meta Cloud API).
 *   En producción, requiere:
 *   - WHATSAPP_BUSINESS_ACCOUNT_ID
 *   - WHATSAPP_ACCESS_TOKEN
 *   - WHATSAPP_PHONE_NUMBER_ID
 * 
 * DISEÑO:
 *   - Fire-and-forget (igual que SlackNotifier)
 *   - Timeout de 3 segundos
 *   - Formato conciso para WhatsApp (sin Block Kit)
 * ============================================================================
 */

export interface WhatsAppNotification {
  readonly leadEstablecimiento: string;
  readonly leadWhatsapp: string;
  readonly leadCiudad?: string;
}

export class WhatsAppNotifier {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly recipientNumber: string;
  private readonly timeoutMs: number;

  constructor(
    accessToken: string,
    phoneNumberId: string,
    recipientNumber: string,
    timeoutMs: number = 3000
  ) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.recipientNumber = recipientNumber;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Envía notificación de nuevo Lead por WhatsApp.
   * 
   * Fire-and-forget: el caller no debe await este método.
   */
  async notifyNewLead(notification: WhatsAppNotification): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const message = ` Nuevo Lead SIGH_FOOD\n\n` +
        `📍 Establecimiento: ${notification.leadEstablecimiento}\n` +
        `📱 WhatsApp: ${notification.leadWhatsapp}\n` +
        `️ Ciudad: ${notification.leadCiudad || 'No especificada'}\n\n` +
        `⏰ ${new Date().toLocaleString('es-CO')}`;

      const payload = {
        messaging_product: 'whatsapp',
        to: this.recipientNumber,
        type: 'text',
        text: { body: message },
      };

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        console.warn('[WhatsAppNotifier] Fallo al enviar notificación:', response.status);
      }
    } catch (error) {
      console.warn('[WhatsAppNotifier] Error:', error instanceof Error ? error.message : error);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}