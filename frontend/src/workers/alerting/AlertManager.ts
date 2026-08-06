/**
 * ============================================================================
 * ALERT MANAGER - Alertas Automáticas al Equipo de Ingeniería
 * RFC-001: Sección 6 (Estrategia de Fallos)
 * ============================================================================
 * 
 * FUNCIÓN: Enviar alertas automáticas cuando se detectan anomalías en el
 * pipeline de Leads, permitiendo respuesta rápida antes de que los fallos
 * escalen.
 * 
 * REFERENCIA RFC-001:
 *   Sección 6: "Dead Letter Queue con alerta activa al equipo de ingeniería"
 * 
 * ALERTAS CONFIGURADAS:
 *   - DLQ crece más de 10 eventos
 *   - Tasa de éxito del CRM cae bajo 95%
 *   - Latencia P95 de Edge Function supera 50ms
 *   - Worker failure rate supera 10%
 * ============================================================================
 */

import { MetricsCollector, metricsCollector } from '../metrics/MetricsCollector';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Alert {
  readonly id: string;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly timestamp: number;
  resolved: boolean;
}

export class AlertManager {
  private metricsCollector: MetricsCollector;
  private alerts: Alert[] = [];
  private alertIdCounter: number = 0;

  constructor(metricsCollector: MetricsCollector) {
    this.metricsCollector = metricsCollector;
  }

  /**
   * Verifica anomalías y genera alertas si es necesario.
   */
  checkAndAlert(): Alert[] {
    const anomalies = this.metricsCollector.checkAnomalies();
    const newAlerts: Alert[] = [];

    if (anomalies.dlqGrowing) {
      const alert = this.createAlert(
        'HIGH',
        'DLQ Creciendo',
        `${this.metricsCollector.getMetrics().dlqLength} eventos en Dead Letter Queue. Revisar fallos del CRM.`
      );
      newAlerts.push(alert);
    }

    if (anomalies.crmSuccessRateLow) {
      const alert = this.createAlert(
        'CRITICAL',
        'Tasa de Éxito del CRM Baja',
        `Tasa de éxito del CRM: ${this.metricsCollector.getCrmSuccessRate().toFixed(1)}%. Umbral: 95%.`
      );
      newAlerts.push(alert);
    }

    if (anomalies.edgeFunctionLatencyHigh) {
      const alert = this.createAlert(
        'MEDIUM',
        'Latencia Edge Function Alta',
        `Latencia P95: ${this.metricsCollector.getEdgeFunctionP95Latency()}ms. Umbral: 50ms.`
      );
      newAlerts.push(alert);
    }

    if (anomalies.workerFailureRateHigh) {
      const alert = this.createAlert(
        'HIGH',
        'Worker Failure Rate Alto',
        `Tasa de fallos del Worker: ${this.metricsCollector.getWorkerFailureRate().toFixed(1)}%. Umbral: 10%.`
      );
      newAlerts.push(alert);
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  /**
   * Envía alertas a Slack (simulado).
   */
  async sendAlertsToSlack(alerts: Alert[]): Promise<void> {
    for (const alert of alerts) {
      const message = `🚨 Alerta ${alert.severity}: ${alert.title}\n\n${alert.message}`;
      console.log(`[ALERTA] ${message}`);
      // En producción: await slackNotifier.send(message);
    }
  }

  /**
   * Obtiene todas las alertas activas.
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Resuelve una alerta manualmente.
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Limpia alertas resueltas antiguas.
   */
  cleanupResolvedAlerts(olderThanMs: number = 86400000): void {
    const cutoff = Date.now() - olderThanMs;
    this.alerts = this.alerts.filter(a => !a.resolved || a.timestamp > cutoff);
  }

  /**
   * Crea una nueva alerta.
   */
  private createAlert(severity: AlertSeverity, title: string, message: string): Alert {
    this.alertIdCounter++;
    return {
      id: `alert-${this.alertIdCounter}`,
      severity,
      title,
      message,
      timestamp: Date.now(),
      resolved: false,
    };
  }
}

// Exportar instancia singleton
export const alertManager = new AlertManager(metricsCollector);