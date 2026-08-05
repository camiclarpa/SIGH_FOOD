/**
 * ============================================================================
 * METRICS COLLECTOR - Métricas de Éxito/Fallo en Cada Etapa
 * RFC-001: Sección 6 (Estrategia de Fallos)
 * ============================================================================
 * 
 * FUNCIÓN: Recopilar métricas de rendimiento y fallos en cada etapa del
 * pipeline de Leads para detectar degradaciones tempranas.
 * 
 * REFERENCIA RFC-001:
 *   Sección 5: "Latencia de aceptación del formulario < 50ms (202 Accepted)"
 *   Sección 6: "Fallo persistente tras 3 reintentos — Pérdida silenciosa del Lead"
 * 
 * MÉTRICAS RECOLECTADAS:
 *   - Tiempo de respuesta de la Edge Function
 *   - Tasa de éxito/fallo del CRM
 *   - Longitud de la cola de Leads
 *   - Longitud de la Dead Letter Queue
 *   - Tiempo de procesamiento del Worker
 *   - Tasa de reintentos
 * ============================================================================
 */

export interface PipelineMetrics {
  // Edge Function
  edgeFunctionLatencyMs: number[];
  edgeFunctionSuccessCount: number;
  edgeFunctionErrorCount: number;
  
  // Cola
  queueLength: number;
  dlqLength: number;
  
  // Worker
  workerProcessingTimeMs: number[];
  workerSuccessCount: number;
  workerRetryCount: number;
  workerFailureCount: number;
  
  // CRM
  crmSuccessCount: number;
  crmFailureCount: number;
  crmTimeoutCount: number;
  
  // Timestamps
  lastUpdated: number;
  windowStart: number;
}

export class MetricsCollector {
  private metrics: PipelineMetrics;
  private readonly windowSizeMs: number;

  constructor(windowSizeMs: number = 3600000) { // 1 hora por defecto
    this.windowSizeMs = windowSizeMs;
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Registra el tiempo de respuesta de la Edge Function.
   */
  recordEdgeFunctionLatency(latencyMs: number, success: boolean): void {
    this.metrics.edgeFunctionLatencyMs.push(latencyMs);
    if (success) {
      this.metrics.edgeFunctionSuccessCount++;
    } else {
      this.metrics.edgeFunctionErrorCount++;
    }
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Registra el tiempo de procesamiento del Worker.
   */
  recordWorkerProcessingTime(timeMs: number, success: boolean, retried: boolean): void {
    this.metrics.workerProcessingTimeMs.push(timeMs);
    if (success) {
      this.metrics.workerSuccessCount++;
    } else {
      this.metrics.workerFailureCount++;
    }
    if (retried) {
      this.metrics.workerRetryCount++;
    }
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Registra el resultado de una llamada al CRM.
   */
  recordCrmResult(success: boolean, timeout: boolean): void {
    if (success) {
      this.metrics.crmSuccessCount++;
    } else if (timeout) {
      this.metrics.crmTimeoutCount++;
    } else {
      this.metrics.crmFailureCount++;
    }
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Actualiza las longitudes de cola.
   */
  updateQueueLengths(queueLength: number, dlqLength: number): void {
    this.metrics.queueLength = queueLength;
    this.metrics.dlqLength = dlqLength;
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * Obtiene las métricas actuales.
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Calcula el percentil 95 de latencia de la Edge Function.
   */
  getEdgeFunctionP95Latency(): number {
    if (this.metrics.edgeFunctionLatencyMs.length === 0) {
      return 0;
    }
    const sorted = [...this.metrics.edgeFunctionLatencyMs].sort((a, b) => a - b);
    const index = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Calcula la tasa de éxito del CRM.
   */
  getCrmSuccessRate(): number {
    const total = this.metrics.crmSuccessCount + this.metrics.crmFailureCount + this.metrics.crmTimeoutCount;
    if (total === 0) {
      return 100;
    }
    return (this.metrics.crmSuccessCount / total) * 100;
  }

  /**
   * Calcula la tasa de fallos del Worker.
   */
  getWorkerFailureRate(): number {
    const total = this.metrics.workerSuccessCount + this.metrics.workerFailureCount;
    if (total === 0) {
      return 0;
    }
    return (this.metrics.workerFailureCount / total) * 100;
  }

  /**
   * Verifica si hay anomalías en las métricas.
   */
  checkAnomalies(): {
    edgeFunctionLatencyHigh: boolean;
    crmSuccessRateLow: boolean;
    workerFailureRateHigh: boolean;
    dlqGrowing: boolean;
  } {
    return {
      edgeFunctionLatencyHigh: this.getEdgeFunctionP95Latency() > 50, // > 50ms
      crmSuccessRateLow: this.getCrmSuccessRate() < 95, // < 95%
      workerFailureRateHigh: this.getWorkerFailureRate() > 10, // > 10%
      dlqGrowing: this.metrics.dlqLength > 10, // > 10 eventos en DLQ
    };
  }

  /**
   * Resetea las métricas para una nueva ventana.
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * Crea métricas vacías.
   */
  private createEmptyMetrics(): PipelineMetrics {
    return {
      edgeFunctionLatencyMs: [],
      edgeFunctionSuccessCount: 0,
      edgeFunctionErrorCount: 0,
      queueLength: 0,
      dlqLength: 0,
      workerProcessingTimeMs: [],
      workerSuccessCount: 0,
      workerRetryCount: 0,
      workerFailureCount: 0,
      crmSuccessCount: 0,
      crmFailureCount: 0,
      crmTimeoutCount: 0,
      lastUpdated: Date.now(),
      windowStart: Date.now(),
    };
  }
}

// Exportar instancia singleton
export const metricsCollector = new MetricsCollector();