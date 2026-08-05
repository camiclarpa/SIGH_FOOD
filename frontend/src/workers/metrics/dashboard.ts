/**
 * ============================================================================
 * DASHBOARD MONITOR - Script de Consulta de Métricas
 * RFC-001: Sección 6 (Estrategia de Fallos)
 * ============================================================================
 * 
 * FUNCIÓN: Consultar métricas del pipeline de Leads para monitoreo en tiempo
 * real y detección temprana de degradaciones.
 * 
 * USO:
 *   npx tsx src/workers/metrics/dashboard.ts
 * ============================================================================
 */

import { MetricsCollector, metricsCollector } from './MetricsCollector';
import { AlertManager, alertManager } from '../alerting/AlertManager';

function printDashboard(): void {
  const metrics = metricsCollector.getMetrics();
  const anomalies = metricsCollector.checkAnomalies();
  const activeAlerts = alertManager.getActiveAlerts();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  SIGH_FOOD - Pipeline de Leads Dashboard                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('【Edge Function】');
  console.log(`  Latencia P95: ${metricsCollector.getEdgeFunctionP95Latency()}ms`);
  console.log(`  Éxitos: ${metrics.edgeFunctionSuccessCount}`);
  console.log(`  Errores: ${metrics.edgeFunctionErrorCount}`);
  console.log('');

  console.log('【Cola de Leads】');
  console.log(`  Longitud: ${metrics.queueLength}`);
  console.log(`  DLQ: ${metrics.dlqLength}`);
  console.log('');

  console.log('【Worker Consumer】');
  console.log(`  Éxitos: ${metrics.workerSuccessCount}`);
  console.log(`  Fallos: ${metrics.workerFailureCount}`);
  console.log(`  Reintentos: ${metrics.workerRetryCount}`);
  console.log(`  Tasa de fallo: ${metricsCollector.getWorkerFailureRate().toFixed(1)}%`);
  console.log('');

  console.log('【CRM Integration】');
  console.log(`  Éxitos: ${metrics.crmSuccessCount}`);
  console.log(`  Fallos: ${metrics.crmFailureCount}`);
  console.log(`  Timeouts: ${metrics.crmTimeoutCount}`);
  console.log(`  Tasa de éxito: ${metricsCollector.getCrmSuccessRate().toFixed(1)}%`);
  console.log('');

  console.log('【Anomalías Detectadas】');
  console.log(`  Latencia Edge alta: ${anomalies.edgeFunctionLatencyHigh ? '⚠ SÍ' : '✓ NO'}`);
  console.log(`  CRM success rate bajo: ${anomalies.crmSuccessRateLow ? '⚠ SÍ' : '✓ NO'}`);
  console.log(`  Worker failure rate alto: ${anomalies.workerFailureRateHigh ? '⚠ SÍ' : '✓ NO'}`);
  console.log(`  DLQ creciendo: ${anomalies.dlqGrowing ? '⚠ SÍ' : '✓ NO'}`);
  console.log('');

  if (activeAlerts.length > 0) {
    console.log(`【Alertas Activas: ${activeAlerts.length}】`);
    activeAlerts.forEach(alert => {
      console.log(`  [${alert.severity}] ${alert.title}: ${alert.message}`);
    });
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log(`Última actualización: ${new Date(metrics.lastUpdated).toLocaleString('es-CO')}`);
  console.log('════════════════════════════════════════════════════════════');
}

// Ejecutar dashboard
printDashboard();

// Actualizar cada 30 segundos
setInterval(printDashboard, 30000);