/**
 * ============================================================================
 * BATCH PROCESSING - Job Nocturno para Reportes (DDIA, CapÃƒÂ­tulo 10)
 * ============================================================================
 * 
 * CONCEPTO VERIFICADO (CapÃƒÂ­tulo 10):
 * Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * Kleppmann distingue el procesamiento batch por su naturaleza de entrada
 * acotada (un conjunto de datos de tamaÃƒÂ±o conocido, como "todos los leads
 * de ayer") frente al streaming (entrada ilimitada y continua).
 * 
 * Propiedad central: un job batch es determinista y reproducible Ã¢â‚¬â€ correr
 * el mismo job dos veces sobre la misma entrada produce exactamente la misma
 * salida.
 * 
 * APLICACIÃƒâ€œN A SIGH_FOOD:
 *   Job nocturno programado a las 2:00 AM COT que:
 *   1. Lee todos los eventos de lead-events-log del dÃƒÂ­a anterior
 *   2. Agrupa por campaign_id
 *   3. Calcula tasa de conversiÃƒÂ³n (Leads SQL / Leads totales)
 *   4. Calcula CAC efectivo (gasto de campaÃƒÂ±a / Leads calificados)
 *   5. Genera reporte para el equipo de ventas
 *   6. Publica en el dashboard + notificaciÃƒÂ³n Slack
 * 
 * REFERENCIAS DEL LIBRO:
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 10: Procesamiento por Lotes (Batch Processing)
 *   Ã¢â‚¬Â¢ SecciÃƒÂ³n 10.1: Batch vs. Stream Processing
 *   Ã¢â‚¬Â¢ SecciÃƒÂ³n 10.2: Reproducibilidad de jobs batch
 * ============================================================================
 */

import { type Lead } from '../sighfood-domain/entities/Lead';

export interface BatchJobConfig {
  readonly scheduledTime: string; // "02:00" en formato HH:MM
  readonly timezone: string; // "America/Bogota"
  readonly lookbackDays: number; // 1 dÃƒÂ­a para job nocturno
}

export interface CampaignMetrics {
  readonly campaignId: string;
  readonly leadsTotales: number;
  readonly leadsSQL: number; // Leads con score >= 70
  readonly tasaConversionPct: number;
  readonly cacEfectivoCOP: number;
}

export interface BatchJobResult {
  readonly executedAt: number;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly totalLeadsProcessed: number;
  readonly campaignMetrics: CampaignMetrics[];
  readonly reportUrl?: string;
}

const DEFAULT_CONFIG: BatchJobConfig = {
  scheduledTime: '02:00',
  timezone: 'America/Bogota',
  lookbackDays: 1,
};

/**
 * Simula el job batch nocturno de SIGH_FOOD.
 * 
 * En producciÃƒÂ³n, esto se implementarÃƒÂ­a con:
 *   - AWS Lambda programado (cron) para el volumen actual
 *   - Migrar a Spark solo si el volumen de leads diario excede el lÃƒÂ­mite
 *     de tiempo de ejecuciÃƒÂ³n de Lambda (15 minutos)
 * 
 * La entrada es acotada: "leads del dÃƒÂ­a calendario anterior" Ã¢â‚¬â€ un conjunto
 * finito y conocido de antemano, cumpliendo la definiciÃƒÂ³n de batch.
 */
export function executeBatchJob(
  leads: Lead[],
  config: BatchJobConfig = DEFAULT_CONFIG
): BatchJobResult {
  const now = Date.now();
  const periodEnd = now;
  const periodStart = now - (config.lookbackDays * 24 * 60 * 60 * 1000);
  
  // Filtrar leads del perÃƒÂ­odo
  const leadsInPeriod = leads.filter(
    (lead) => lead.fechaCreacion && lead.fechaCreacion.getTime() >= periodStart
  );
  
  // Agrupar por campaign_id (simulado Ã¢â‚¬â€ en producciÃƒÂ³n vendrÃƒÂ­a del CRM)
  const campaignGroups = new Map<string, Lead[]>();
  for (const lead of leadsInPeriod) {
    const campaignId = 'default-campaign'; // Simulado
    if (!campaignGroups.has(campaignId)) {
      campaignGroups.set(campaignId, []);
    }
    campaignGroups.get(campaignId)!.push(lead);
  }
  
  // Calcular mÃƒÂ©tricas por campaÃƒÂ±a
  const campaignMetrics: CampaignMetrics[] = [];
  for (const [campaignId, campaignLeads] of campaignGroups) {
    const leadsTotales = campaignLeads.length;
    const leadsSQL = campaignLeads.length; // Simulado: todos son SQL por ahora
    const tasaConversionPct = leadsTotales > 0 ? (leadsSQL / leadsTotales) * 100 : 0;
    const cacEfectivoCOP = 0; // Simulado: requerirÃƒÂ­a datos de gasto de campaÃƒÂ±a
    
    campaignMetrics.push({
      campaignId,
      leadsTotales,
      leadsSQL,
      tasaConversionPct: Math.round(tasaConversionPct * 10) / 10,
      cacEfectivoCOP,
    });
  }
  
  return {
    executedAt: now,
    periodStart,
    periodEnd,
    totalLeadsProcessed: leadsInPeriod.length,
    campaignMetrics,
  };
}

/**
 * Verifica la reproducibilidad del job batch.
 * 
 * Kleppmann enfatiza que correr el mismo job dos veces sobre la misma entrada
 * debe producir exactamente la misma salida Ã¢â‚¬â€ crÃƒÂ­tico para que el equipo de
 * ventas confÃƒÂ­e en las cifras.
 */
export function verifyBatchReproducibility(
  leads: Lead[],
  config: BatchJobConfig = DEFAULT_CONFIG
): boolean {
  const result1 = executeBatchJob(leads, config);
  const result2 = executeBatchJob(leads, config);
  
  // Comparar mÃƒÂ©tricas (ignorando executedAt que siempre es distinto)
  return (
    result1.totalLeadsProcessed === result2.totalLeadsProcessed &&
    result1.campaignMetrics.length === result2.campaignMetrics.length &&
    result1.campaignMetrics.every((m1, i) => {
      const m2 = result2.campaignMetrics[i];
      return (
        m1.campaignId === m2.campaignId &&
        m1.leadsTotales === m2.leadsTotales &&
        m1.leadsSQL === m2.leadsSQL &&
        m1.tasaConversionPct === m2.tasaConversionPct
      );
    })
  );
}