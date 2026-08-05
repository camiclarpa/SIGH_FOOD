import { notificationClient, LeadNotificationData } from './notificationClient';
import { logger } from '../utils/logger';
import { metricsClient } from '../utils/metrics';

// Umbral para considerar un lead como "Alto Valor"
const HIGH_VALUE_VOLUME_THRESHOLD = 300;

export interface NotificationRoutingResult {
  channel: 'whatsapp' | 'email' | 'mock';
  priority: 'high' | 'normal';
  success: boolean;
  error?: string;
}

/**
 * Calcula la utilidad mensual estimada basada en el volumen semanal
 * Fórmula: volumen_semanal * 2 dias * 4 semanas * $23,500 COP * 20% conversión
 */
export function calculateEstimatedMonthlyProfit(weeklyVolume: number): number {
  const TRAGOS_POR_DIA_FIN_SEMANA = 2;
  const SEMANAS_POR_MES = 4;
  const TASA_CONVERSION = 0.20;
  const UTILIDAD_POR_CONO = 23500;

  const tragosPorSemana = weeklyVolume * TRAGOS_POR_DIA_FIN_SEMANA;
  const conosPorMes = tragosPorSemana * SEMANAS_POR_MES * TASA_CONVERSION;
  return Math.floor(conosPorMes * UTILIDAD_POR_CONO);
}

/**
 * Clasifica la prioridad del lead basado en reglas de negocio
 */
export function classifyLeadPriority(weeklyVolume: number): 'high' | 'normal' {
  return weeklyVolume >= HIGH_VALUE_VOLUME_THRESHOLD ? 'high' : 'normal';
}

/**
 * Enruta la notificación según la prioridad del lead
 * - High priority: WhatsApp inmediato (o email si no hay WhatsApp configurado)
 * - Normal priority: Se acumula para resumen diario por email
 */
export async function routeNotification(lead: LeadNotificationData): Promise<NotificationRoutingResult> {
  const priority = classifyLeadPriority(lead.estimatedWeeklyVolume);
  const profit = calculateEstimatedMonthlyProfit(lead.estimatedWeeklyVolume);
  
  // Enriquecer el lead con el profit calculado
  const enrichedLead = { ...lead, estimatedMonthlyProfit: profit };

  try {
    if (priority === 'high') {
      logger.info('Lead de ALTO VALOR detectado, enviando alerta inmediata', {
        establishment: enrichedLead.establishmentName,
        volume: enrichedLead.estimatedWeeklyVolume,
        profit
      });

      const result = await notificationClient.sendHighPriorityAlert(enrichedLead);
      metricsClient.increment('notifications.high_priority_sent');

      return {
        channel: result.channel,
        priority: 'high',
        success: result.success,
        error: result.error,
      };
    } else {
      logger.info('Lead de valor normal, acumulando para resumen diario', {
        establishment: enrichedLead.establishmentName,
        volume: enrichedLead.estimatedWeeklyVolume
      });

      // Para leads normales, enviamos un email individual inmediato
      // (En producción, podrías acumularlos en Redis y enviar un resumen diario)
      const result = await notificationClient.sendHighPriorityAlert(enrichedLead);
      metricsClient.increment('notifications.normal_lead_sent');

      return {
        channel: result.channel,
        priority: 'normal',
        success: result.success,
        error: result.error,
      };
    }
  } catch (error) {
    const err = error as Error;
    logger.error('Error al enrutar notificación', err, { idempotencyKey: lead.idempotencyKey });
    metricsClient.increment('notifications.routing_failed');

    return {
      channel: 'mock',
      priority,
      success: false,
      error: err.message,
    };
  }
}