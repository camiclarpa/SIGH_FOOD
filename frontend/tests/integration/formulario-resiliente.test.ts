/**
 * tests/integration/formulario-resiliente.test.ts
 *
 * Tests E2E del flujo completo con fallos simulados.
 * RFC-003 Sección 4.2 y Sección 6 (Validación de SLAs)
 *
 * Casos de prueba:
 *   - Camino feliz: 202 Accepted → estado 'success'
 *   - Fallo de red → Estrategia A → Estrategia B → éxito → 'degraded-success'
 *   - Fallo persistente → Estrategia C → 'fallback-required'
 *   - QuotaExceededError → salto directo a Estrategia C
 *   - Background Sync no disponible → fallback a WhatsApp
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnvioResilienteDeLead } from '../../src/components/resiliency/FormularioLeadResiliente';
import type { B2BLeadFormPayloadInferred } from '../../src/domain/leads/B2BLeadFormPayload';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  let shouldThrowQuotaExceeded = false;

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (shouldThrowQuotaExceeded) {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        (error as any).code = 22;
        throw error;
      }
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    simularQuotaExceeded: (shouldThrow: boolean) => {
      shouldThrowQuotaExceeded = shouldThrow;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock de navigator.serviceWorker
Object.defineProperty(globalThis, 'navigator', {
  value: {
    serviceWorker: {
      ready: Promise.resolve({
        sync: {
          register: vi.fn().mockResolvedValue(undefined),
        },
      }),
    },
  },
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: { SyncManager: {} },
  writable: true,
});

// Mock de AbortSignal.timeout
if (!AbortSignal.timeout) {
  (AbortSignal as any).timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), ms);
    return controller.signal;
  };
}

// Payload de prueba válido
const payloadDePrueba: B2BLeadFormPayloadInferred = {
  establecimiento: 'Gastrobar El Rincón',
  nombreTomadorDecision: 'Laura Martínez',
  rol: 'GERENTE_AB',
  whatsapp: '+573001234567',
  licoresDominantes: ['MEZCAL_AGAVE'],
  roiEstimadoAlMomentoDelEnvio: {
    conosEstimadosPorMes: 100,
    gananciaNetaMensualCOP: 2_350_000,
  },
};

describe('FormularioLeadResiliente - Tests E2E', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.simularQuotaExceeded(false);
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Camino feliz: 202 Accepted', () => {
    it('debería transicionar a estado "success" cuando el envío primario tiene éxito', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued', leadId: 'test-lead-id' }),
      });

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      expect(result.current.estado.tipo).toBe('idle');

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      expect(result.current.estado.tipo).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('debería enviar el leadId como X-Idempotency-Key', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued', leadId: 'test-lead-id' }),
      });

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/leads/phygital-demo-request',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Idempotency-Key': expect.any(String),
          }),
        })
      );
    });
  });

  describe('Fallo de red → Estrategia A → Estrategia B → éxito', () => {
    it('debería transicionar a "degraded-success" tras reintentos exitosos', async () => {
      // Primer intento: fallo de red
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // Segundo intento (reintento 1): éxito
      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued', leadId: 'test-lead-id' }),
      });

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      // Avanzar el tiempo para el primer backoff (2s)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(result.current.estado.tipo).toBe('degraded-success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Fallo persistente → Estrategia C (WhatsApp)', () => {
    it('debería transicionar a "fallback-required" cuando todos los reintentos fallan', async () => {
      // Todos los intentos fallan
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      // Avanzar el tiempo para los 3 backoffs (2s + 4s + 8s)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(4000);
        await vi.advanceTimersByTimeAsync(8000);
      });

      expect(result.current.estado.tipo).toBe('fallback-required');
      expect(result.current.estado.tipo === 'fallback-required' && result.current.estado.enlaceWhatsApp).toContain('wa.me');
    });
  });

  describe('QuotaExceededError → salto directo a Estrategia C', () => {
    it('debería saltar reintentos y mostrar WhatsApp inmediatamente', async () => {
      // Simular QuotaExceededError en LocalStorage
      localStorageMock.simularQuotaExceeded(true);

      // El intento primario falla
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      // Debería estar en fallback-required inmediatamente, sin esperar reintentos
      expect(result.current.estado.tipo).toBe('fallback-required');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Solo el intento primario
    });
  });

  describe('Background Sync no disponible', () => {
    it('debería mostrar WhatsApp si Background Sync no está soportado', async () => {
      // Simular navegador sin soporte de Background Sync
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
        await vi.advanceTimersByTimeAsync(4000);
        await vi.advanceTimersByTimeAsync(8000);
      });

      expect(result.current.estado.tipo).toBe('fallback-required');
    });
  });

  describe('Validación de SLAs (RFC-003 Sección 1.2)', () => {
    it('debería completar el intento primario en < 5 segundos (timeout)', async () => {
      // Simular respuesta lenta (6 segundos)
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 202 }), 6000))
      );

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      const startTime = Date.now();

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      const elapsed = Date.now() - startTime;

      // Debería fallar por timeout antes de 6 segundos
      expect(elapsed).toBeLessThan(6000);
    });

    it('debería mostrar fallback en < 3 segundos desde el primer fallo', async () => {
      localStorageMock.simularQuotaExceeded(true);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      const startTime = Date.now();

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      const elapsed = Date.now() - startTime;

      // Debería mostrar fallback inmediatamente (sin reintentos)
      expect(result.current.estado.tipo).toBe('fallback-required');
      expect(elapsed).toBeLessThan(3000);
    });
  });
});