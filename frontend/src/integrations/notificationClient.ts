import { logger } from '../utils/logger';
import { metricsClient } from '../utils/metrics';

export interface LeadNotificationData {
  idempotencyKey: string;
  establishmentName: string;
  decisionMaker: string;
  phone: string;
  topLiquors: string;
  estimatedWeeklyVolume: number;
  estimatedMonthlyProfit: number;
  crmContactId?: string;
  crmDealId?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: 'email' | 'whatsapp' | 'mock';
  messageId?: string;
  error?: string;
}

export interface NotificationClient {
  sendHighPriorityAlert(lead: LeadNotificationData): Promise<NotificationResult>;
  sendDailySummary(leads: LeadNotificationData[]): Promise<NotificationResult>;
}

/**
 * Cliente de Email usando Resend (https://resend.com)
 * Plan gratuito: 3,000 emails/mes, 100/día
 */
export class ResendEmailClient implements NotificationClient {
  private apiKey: string;
  private fromEmail: string;
  private toEmail: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@sighfood.com';
    this.toEmail = process.env.SALES_TEAM_EMAIL || 'ventas@sighfood.com';
  }

  private async sendEmail(subject: string, html: string): Promise<NotificationResult> {
    if (!this.apiKey || this.apiKey === 'your_resend_api_key_here') {
      throw new Error('CONFIG_ERROR: Configura RESEND_API_KEY en tu .env');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [this.toEmail],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      channel: 'email',
      messageId: data.id,
    };
  }

  async sendHighPriorityAlert(lead: LeadNotificationData): Promise<NotificationResult> {
    const subject = `🔥 LEAD PRIORITARIO: ${lead.establishmentName}`;
    const html = `
      <h2>Nuevo Lead de Alto Valor</h2>
      <p><strong>Establecimiento:</strong> ${lead.establishmentName}</p>
      <p><strong>Decisor:</strong> ${lead.decisionMaker}</p>
      <p><strong>Teléfono:</strong> ${lead.phone}</p>
      <p><strong>Volumen semanal estimado:</strong> ${lead.estimatedWeeklyVolume} tragos</p>
      <p><strong>Utilidad mensual estimada:</strong> $${lead.estimatedMonthlyProfit.toLocaleString('es-CO')} COP</p>
      <p><strong>Licores top:</strong> ${lead.topLiquors}</p>
      <hr>
      <p><em>Este lead fue clasificado como PRIORITARIO porque su volumen semanal es >= 300 tragos.</em></p>
      <p><a href="https://app.pipedrive.com">Ver en CRM</a></p>
    `;

    logger.info('Enviando alerta prioritaria por email', { establishment: lead.establishmentName });
    const result = await this.sendEmail(subject, html);
    metricsClient.increment('notifications.email_sent');
    return result;
  }

  async sendDailySummary(leads: LeadNotificationData[]): Promise<NotificationResult> {
    const subject = `📊 Resumen Diario de Leads SIGH_FOOD - ${new Date().toLocaleDateString('es-CO')}`;
    const leadsHtml = leads.map(l => `
      <tr>
        <td>${l.establishmentName}</td>
        <td>${l.decisionMaker}</td>
        <td>${l.phone}</td>
        <td>${l.estimatedWeeklyVolume}</td>
        <td>$${l.estimatedMonthlyProfit.toLocaleString('es-CO')}</td>
      </tr>
    `).join('');

    const html = `
      <h2>Resumen Diario de Leads</h2>
      <p>Total de leads procesados hoy: <strong>${leads.length}</strong></p>
      <table border="1" cellpadding="8" cellspacing="0">
        <thead>
          <tr>
            <th>Establecimiento</th>
            <th>Decisor</th>
            <th>Teléfono</th>
            <th>Volumen Semanal</th>
            <th>Utilidad Mensual Est.</th>
          </tr>
        </thead>
        <tbody>${leadsHtml}</tbody>
      </table>
    `;

    logger.info('Enviando resumen diario por email', { leadCount: leads.length });
    const result = await this.sendEmail(subject, html);
    metricsClient.increment('notifications.daily_summary_sent');
    return result;
  }
}

/**
 * Cliente de WhatsApp usando Twilio
 * Requiere cuenta de Twilio con WhatsApp Sandbox activado
 */
export class TwilioWhatsAppClient implements NotificationClient {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private toNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    this.toNumber = process.env.SALES_TEAM_WHATSAPP || '';
  }

  private async sendWhatsAppMessage(body: string): Promise<NotificationResult> {
    if (!this.accountSid || !this.authToken || this.accountSid === 'your_twilio_account_sid_here') {
      throw new Error('CONFIG_ERROR: Configura TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en tu .env');
    }

    if (!this.toNumber) {
      throw new Error('CONFIG_ERROR: Configura SALES_TEAM_WHATSAPP en tu .env');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const formData = new URLSearchParams();
    formData.append('From', this.fromNumber);
    formData.append('To', `whatsapp:${this.toNumber}`);
    formData.append('Body', body);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      channel: 'whatsapp',
      messageId: data.sid,
    };
  }

  async sendHighPriorityAlert(lead: LeadNotificationData): Promise<NotificationResult> {
    const message = `🔥 LEAD PRIORITARIO SIGH_FOOD\n\n` +
      `📍 ${lead.establishmentName}\n` +
      `👤 ${lead.decisionMaker}\n` +
      `📞 ${lead.phone}\n` +
      `🍹 Licores: ${lead.topLiquors}\n` +
      `📊 Volumen semanal: ${lead.estimatedWeeklyVolume} tragos\n` +
      `💰 Utilidad mensual est.: $${lead.estimatedMonthlyProfit.toLocaleString('es-CO')} COP\n\n` +
      `⚡ Acción requerida: Contactar en menos de 2 horas`;

    logger.info('Enviando alerta prioritaria por WhatsApp', { establishment: lead.establishmentName });
    const result = await this.sendWhatsAppMessage(message);
    metricsClient.increment('notifications.whatsapp_sent');
    return result;
  }

  async sendDailySummary(leads: LeadNotificationData[]): Promise<NotificationResult> {
    const totalProfit = leads.reduce((sum, l) => sum + l.estimatedMonthlyProfit, 0);
    const message = `📊 RESUMEN DIARIO SIGH_FOOD\n\n` +
      `Leads procesados: ${leads.length}\n` +
      `Utilidad total estimada: $${totalProfit.toLocaleString('es-CO')} COP\n\n` +
      `Top 3 leads:\n` +
      leads.slice(0, 3).map((l, i) => 
        `${i + 1}. ${l.establishmentName} - $${l.estimatedMonthlyProfit.toLocaleString('es-CO')} COP`
      ).join('\n');

    logger.info('Enviando resumen diario por WhatsApp', { leadCount: leads.length });
    const result = await this.sendWhatsAppMessage(message);
    metricsClient.increment('notifications.whatsapp_summary_sent');
    return result;
  }
}

/**
 * Cliente Mock para desarrollo
 */
export class MockNotificationClient implements NotificationClient {
  async sendHighPriorityAlert(lead: LeadNotificationData): Promise<NotificationResult> {
    const latency = Math.floor(Math.random() * 300) + 100;
    await new Promise((resolve) => setTimeout(resolve, latency));
    
    logger.info('[MOCK NOTIF] Alerta prioritaria enviada', { 
      establishment: lead.establishmentName,
      volume: lead.estimatedWeeklyVolume 
    });
    metricsClient.increment('notifications.mock_alert_sent');
    
    return {
      success: true,
      channel: 'mock',
      messageId: `mock-alert-${Date.now()}`,
    };
  }

  async sendDailySummary(leads: LeadNotificationData[]): Promise<NotificationResult> {
    const latency = Math.floor(Math.random() * 300) + 100;
    await new Promise((resolve) => setTimeout(resolve, latency));
    
    logger.info('[MOCK NOTIF] Resumen diario enviado', { leadCount: leads.length });
    metricsClient.increment('notifications.mock_summary_sent');
    
    return {
      success: true,
      channel: 'mock',
      messageId: `mock-summary-${Date.now()}`,
    };
  }
}

/**
 * Factory: Retorna el cliente apropiado según configuración
 * Prioridad: WhatsApp > Email > Mock
 */
export function createNotificationClient(): NotificationClient {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const resendKey = process.env.RESEND_API_KEY;

  if (twilioSid && twilioSid !== 'your_twilio_account_sid_here' && process.env.SALES_TEAM_WHATSAPP) {
    logger.info('Usando cliente real de WhatsApp (Twilio)');
    return new TwilioWhatsAppClient();
  } else if (resendKey && resendKey !== 'your_resend_api_key_here' && process.env.SALES_TEAM_EMAIL) {
    logger.info('Usando cliente real de Email (Resend)');
    return new ResendEmailClient();
  } else {
    logger.warn('Usando cliente MOCK de notificaciones (configura TWILIO o RESEND para usar el real)');
    return new MockNotificationClient();
  }
}

export const notificationClient = createNotificationClient();