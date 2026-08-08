/**
 * tests/resiliency/retryQueue.test.ts
 *
 * Tests de reintentos con backoff exponencial (Estrategia B).
 * RFC-003 Sección 3.2
 *
 * Casos de prueba:
 *   - Caso feliz: éxito en el primer intento
 *   - Caso borde: éxito en el tercer intento (backoff completo)
 *   - Caso borde: 3 intentos agotados → retorna 'exhausted'
 *   - Caso borde: error 4xx → abortar reintentos inmediatamente
 *   - Caso borde: timeout de red → continuar al siguiente intento
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reintentarConBackoff } from '../../src/lib/resiliency/retryQueue';
import type { PendingLeadRecord } from '../../src/lib/resiliency/localLeadStorage';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock de AbortSignal.timeout
if (!AbortSignal.timeout) {
  (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
    return controller.signal;
  };
}

// Record de prueba
const recordDePrueba: PendingLeadRecord = {
  leadId: 'test-lead-id-123',
  payload: {
    establecimiento: 'Gastrobar El Rincón',
    nombreTomadorDecision: 'Laura Martínez',
    rol: 'GERENTE_AB',
    whatsapp: '+573001234567',
    licoresDominantes: ['MEZCAL_AGAVE'],
    roiEstimadoAlMomentoDelEnvio: {
      conosEstimadosPorMes: 100,
      gananciaNetaMensualCOP: 2_350_000,
    },
  },
  intentosRealizados: 0,
  primerIntentoISO: new Date().toISOString(),
  ultimoIntentoISO: null,
};

describe('retryQueue - Reintentos con backoff exponencial', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Mock de setTimeout para acelerar los tests (no esperar 2s+4s+8s reales)
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Caso feliz: éxito en el primer intento', () => {
    it('debería retornar "success" cuando el primer intento tiene éxito', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued', leadId: 'test-lead-id-123' }),
      });

      const promise = reintentarConBackoff(recordDePrueba);

      // Avanzar el tiempo para el primer backoff (2s)
      await vi.advanceTimersByTimeAsync(2000);

      const resultado = await promise;
      expect(resultado).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('debería enviar el leadId como X-Idempotency-Key', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued', leadId: 'test-lead-id-123' }),
      });

      const promise = reintentarConBackoff(recordDePrueba);
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/leads/phygital-demo-request',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Idempotency-Key': 'test-lead-id-123',
          }),
        })
      );
    });
  });

  describe('Caso borde: éxito en el tercer intento', () => {
    it('debería reintentar hasta 3 veces antes de tener éxito', async () => {
      // Primer intento: error de red
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // Segundo intento: error de red
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // Tercer intento: éxito
      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued', leadId: 'test-lead-id-123' }),
      });

      const promise = reintentarConBackoff(recordDePrueba);

      // Avanzar el tiempo para los 3 backoffs (2s + 4s + 8s)
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(8000);

      const resultado = await promise;
      expect(resultado).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Caso borde: 3 intentos agotados', () => {
    it('debería retornar "exhausted" cuando los 3 intentos fallan', async () => {
      // Los 3 intentos fallan con error de red
      mockFetch.mockRejectedValue(new Error('Network error'));

      const promise = reintentarConBackoff(recordDePrueba);

      // Avanzar el tiempo para los 3 backoffs
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(8000);

      const resultado = await promise;
      expect(resultado).toBe('exhausted');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('debería respetar la secuencia de backoff [2000, 4000, 8000] ms', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const promise = reintentarConBackoff(recordDePrueba);

      // Verificar que fetch se llama en los momentos correctos
      await vi.advanceTimersByTimeAsync(1999);
      expect(mockFetch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1); // Total: 2000ms
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(3999); // Total: 5999ms
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1); // Total: 6000ms (2s + 4s)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(7999); // Total: 13999ms
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1); // Total: 14000ms (2s + 4s + 8s)
      expect(mockFetch).toHaveBeenCalledTimes(3);

      await promise;
    });
  });

  describe('Caso borde: error 4xx (validación del servidor)', () => {
    it('debería abortar reintentos inmediatamente con error 400', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 400,
        json: async () => ({
          status: 'error',
          codigo: 'VALIDATION_ERROR',
          errores: [{ campo: 'whatsapp', mensaje: 'Formato inválido' }],
        }),
      });

      const promise = reintentarConBackoff(recordDePrueba);
      await vi.advanceTimersByTimeAsync(2000);

      const resultado = await promise;
      expect(resultado).toBe('exhausted');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Solo 1 intento, no 3
    });
  });

  describe('Caso borde: error 5xx (error del servidor)', () => {
    it('debería continuar reintentando con error 500', async () => {
      mockFetch.mockResolvedValue({ status: 500 });

      const promise = reintentarConBackoff(recordDePrueba);

      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(8000);

      const resultado = await promise;
      expect(resultado).toBe('exhausted');
      expect(mockFetch).toHaveBeenCalledTimes(3); // 3 intentos completos
    });
  });

  describe('Timeout de red', () => {
    it('debería continuar al siguiente intento si hay timeout', async () => {
      // Simular timeout (AbortError)
      const timeoutError = new DOMException('Timeout', 'TimeoutError');
      mockFetch.mockRejectedValue(timeoutError);

      const promise = reintentarConBackoff(recordDePrueba);

      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(4000);
      await vi.advanceTimersByTimeAsync(8000);

      const resultado = await promise;
      expect(resultado).toBe('exhausted');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});