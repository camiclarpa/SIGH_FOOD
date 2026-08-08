/**
 * ============================================================================
 * LEAD CONSUMER - Worker con Circuit Breaker y Métricas
 * RFC-001: Sección 6 (Estrategia de Fallos)
 * ============================================================================
 * 
 * FUNCIÓN: Consumir eventos de la cola con protección de Circuit Breaker
 * para el CRM y recolección de métricas.
 * 
 * REFERENCIA RFC-001:
 *   Sección 6: "El CRM está caído o degradado — La cola retiene el evento
 *   indefinidamente hasta que el CRM se recupere"
 * ============================================================================
 */

import { QueueClient } from '../../queue/upstash/QueueClient';
import { RetryStrategy } from '../retry/RetryStrategy';
import { CircuitBreaker, crmCircuitBreaker } from '../circuit-breaker/CircuitBreaker';
import { MetricsCollector, metricsCollector } from '../metrics/MetricsCollector';
import { AlertManager, alertManager } from '../alerting/AlertManager';
import { crearLead, Lead } from '../../domain/lead/Lead';
import { LeadStateMachine } from '../../domain/lead/LeadStateMachine';

export interface LeadEvent {
  readonly establecimiento: string;
  readonly whatsapp: string;
  readonly ciudad?: string;
  readonly licoresDominantes?: string[];
  readonly idempotencyKey: string;
  readonly timestamp: number;
}

export interface ConsumerConfig {
  readonly pollIntervalMs: number;
  readonly maxRetries: number;
  readonly enableAlerts: boolean;
}

export const DEFAULT_CONSUMER_CONFIG: ConsumerConfig = {
  pollIntervalMs: 1000,
  maxRetries: 4,
  enableAlerts: true,
};

export class LeadConsumer {
  private queueClient: QueueClient;
  private retryStrategy: RetryStrategy;
  private circuitBreaker: CircuitBreaker;
  private metrics: MetricsCollector;
  private alerts: AlertManager;
  private config: ConsumerConfig;
  private isRunning: boolean = false;

  constructor(
    queueClient: QueueClient,
    config: ConsumerConfig = DEFAULT_CONSUMER_CONFIG
  ) {
    this.queueClient = queueClient;
    this.retryStrategy = new RetryStrategy({
      maxRetries: config.maxRetries,
      initialDelayMs: 0,
      maxDelayMs: 30000,
      backoffMultiplier: 4,
    });
    this.circuitBreaker = crmCircuitBreaker;
    this.metrics = metricsCollector;
    this.alerts = alertManager;
    this.config = config;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    console.log('[LeadConsumer] Iniciando consumo de cola con Circuit Breaker...');

    while (this.isRunning) {
      try {
        const eventJson = await this.queueClient.dequeueLead(5);
        
        if (eventJson) {
          const startTime = Date.now();
          await this.processEvent(eventJson);
          const processingTime = Date.now() - startTime;
          this.metrics.recordWorkerProcessingTime(processingTime, true, false);
        }

        // Verificar alertas cada 100 eventos
        if (this.config.enableAlerts && Math.random() < 0.01) {
          const newAlerts = this.alerts.checkAndAlert();
          if (newAlerts.length > 0) {
            await this.alerts.sendAlertsToSlack(newAlerts);
          }
        }
      } catch (error) {
        console.error('[LeadConsumer] Error en el loop principal:', error);
        this.metrics.recordWorkerProcessingTime(0, false, false);
        await this.sleep(5000);
      }
    }

    console.log('[LeadConsumer] Consumo detenido.');
  }

  stop(): void {
    this.isRunning = false;
  }

  private async processEvent(eventJson: string): Promise<void> {
    let event: LeadEvent;
    
    try {
      event = JSON.parse(eventJson);
    } catch (error) {
      console.error('[LeadConsumer] Error al parsear evento:', error);
      await this.queueClient.moveToDLQ(eventJson, 'JSON parse error');
      return;
    }

    console.log(`[LeadConsumer] Procesando evento: ${event.idempotencyKey}`);

    let lead = crearLead({
      establecimiento: event.establecimiento,
      tomadorDecision: { nombre: event.establecimiento, rol: 'Gerente A&B' },
      whatsapp: event.whatsapp,
      licoresDominantes: event.licoresDominantes || [],
      ciudad: event.ciudad,
      idempotencyKey: event.idempotencyKey,
    });

    lead = LeadStateMachine.encolar(lead);
    lead = LeadStateMachine.procesar(lead);

    try {
      // Ejecutar con Circuit Breaker
      await this.circuitBreaker.execute(() =>
        this.retryStrategy.executeWithRetry(
          () => this.syncToCRM(lead),
          (error, attempt) => {
            console.warn(`[LeadConsumer] Intento ${attempt + 1} fallido:`, error.message);
          }
        )
      );

      lead = LeadStateMachine.sincronizar(lead, 'crm-record-id');
      this.metrics.recordCrmResult(true, false);
      console.log(`[LeadConsumer] Lead sincronizado: ${lead.idempotencyKey}`);

    } catch (error) {
      this.metrics.recordCrmResult(false, (error as Error).message.includes('timeout'));
      
      lead = LeadStateMachine.fallar(
        lead,
        error instanceof Error ? error.message : 'Unknown error',
        this.config.maxRetries
      );

      lead = LeadStateMachine.moverADLQ(lead);
      
      console.error(`[LeadConsumer] Lead movido a DLQ: ${lead.idempotencyKey}`);
      await this.queueClient.moveToDLQ(eventJson, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async syncToCRM(lead: Lead): Promise<void> {
    console.log(`[CRM] Sincronizando lead: ${lead.establecimiento} (${lead.whatsapp})`);
    await this.sleep(100);
    
    if (Math.random() < 0.1) {
      throw new Error('CRM temporalmente no disponible');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}