/**
 * Tests de Resiliencia - Circuit Breaker y Manejo de Fallos
 * RFC-001: Sección 6 (Estrategia de Fallos)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '../../src/workers/circuit-breaker/CircuitBreaker';
import { MetricsCollector } from '../../src/workers/metrics/MetricsCollector';
import { AlertManager } from '../../src/workers/alerting/AlertManager';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeoutMs: 1000,
      successThreshold: 2,
    });
  });

  describe('Estado CLOSED (normal)', () => {
    it('debería permitir operaciones exitosas', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('debería abrir el circuito tras N fallos consecutivos', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('CRM error'));

      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(operation);
        } catch {
          // Esperado
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('Estado OPEN (degradado)', () => {
    it('debería rechazar operaciones inmediatamente', async () => {
      circuitBreaker.forceOpen();

      const operation = vi.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(operation).not.toHaveBeenCalled();
    });

    it('debería transicionar a HALF-OPEN tras timeout', async () => {
      circuitBreaker.forceOpen();

      // Esperar timeout de recuperación
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(circuitBreaker.getState()).toBe('HALF-OPEN');
    });
  });

  describe('Estado HALF-OPEN (prueba)', () => {
    it('debería cerrar el circuito tras éxitos consecutivos', async () => {
      circuitBreaker.forceOpen();
      await new Promise(resolve => setTimeout(resolve, 1100));

      const operation = vi.fn().mockResolvedValue('success');

      await circuitBreaker.execute(operation);
      await circuitBreaker.execute(operation);

      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('debería abrir el circuito si la prueba falla', async () => {
      circuitBreaker.forceOpen();
      await new Promise(resolve => setTimeout(resolve, 1100));

      const operation = vi.fn().mockRejectedValue(new Error('Still failing'));

      try {
        await circuitBreaker.execute(operation);
      } catch {
        // Esperado
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });
});

describe('MetricsCollector', () => {
  let metrics: MetricsCollector;

  beforeEach(() => {
    metrics = new MetricsCollector();
  });

  it('debería registrar latencia de Edge Function', () => {
    metrics.recordEdgeFunctionLatency(45, true);
    metrics.recordEdgeFunctionLatency(52, false);

    const m = metrics.getMetrics();
    expect(m.edgeFunctionLatencyMs).toHaveLength(2);
    expect(m.edgeFunctionSuccessCount).toBe(1);
    expect(m.edgeFunctionErrorCount).toBe(1);
  });

  it('debería calcular P95 de latencia', () => {
    for (let i = 1; i <= 100; i++) {
      metrics.recordEdgeFunctionLatency(i, true);
    }

    const p95 = metrics.getEdgeFunctionP95Latency();
    expect(p95).toBe(95);
  });

  it('debería calcular tasa de éxito del CRM', () => {
    metrics.recordCrmResult(true, false);
    metrics.recordCrmResult(true, false);
    metrics.recordCrmResult(false, true);

    const rate = metrics.getCrmSuccessRate();
    expect(rate).toBeCloseTo(66.67, 1);
  });

  it('debería detectar anomalías', () => {
    // Simular DLQ creciendo
    metrics.updateQueueLengths(5, 15);

    const anomalies = metrics.checkAnomalies();
    expect(anomalies.dlqGrowing).toBe(true);
  });
});

describe('AlertManager', () => {
  let metrics: MetricsCollector;
  let alertManager: AlertManager;

  beforeEach(() => {
    metrics = new MetricsCollector();
    alertManager = new AlertManager(metrics);
  });

  it('debería generar alerta cuando DLQ crece', () => {
    metrics.updateQueueLengths(5, 15);

    const alerts = alertManager.checkAndAlert();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].title).toBe('DLQ Creciendo');
  });

  it('debería generar alerta crítica cuando CRM falla', () => {
    for (let i = 0; i < 100; i++) {
      metrics.recordCrmResult(false, false);
    }

    const alerts = alertManager.checkAndAlert();
    const criticalAlert = alerts.find(a => a.severity === 'CRITICAL');
    expect(criticalAlert).toBeDefined();
  });

  it('debería resolver alertas manualmente', () => {
    metrics.updateQueueLengths(5, 15);
    const alerts = alertManager.checkAndAlert();

    alertManager.resolveAlert(alerts[0].id);

    const activeAlerts = alertManager.getActiveAlerts();
    expect(activeAlerts.length).toBe(0);
  });
});
