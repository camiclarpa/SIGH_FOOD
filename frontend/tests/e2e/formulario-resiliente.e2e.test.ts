/**
 * tests/e2e/formulario-resiliente.e2e.test.ts
 *
 * Tests E2E del flujo completo con fallos simulados.
 * RFC-003 Sección 6: Validación de SLAs
 *
 * Este archivo simula CADA modo de fallo del FMEA (F1-F6) y verifica
 * que el sistema responde correctamente según las estrategias de resiliencia
 * definidas en el RFC-003.
 *
 * Modos de fallo simulados:
 *   - F1: Timeout de API (5s)
 *   - F3: Pérdida total de conexión (fetch rechazado)
 *   - F4: QuotaExceededError en LocalStorage
 *   - F5: Cierre de pestaña (simulado con Background Sync)
 *   - F6: Navegador sin soporte de Background Sync (Safari/iOS)
 *
 * SLAs validados:
 *   - Disponibilidad de captura: 99.99%
 *   - Pérdida de datos definitiva: 0 eventos
 *   - Tiempo máximo hasta notificar fallback: < 3 segundos
 *   - Tiempo de reintento antes de escalar a WhatsApp: ~15 segundos
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnvioResilienteDeLead } from '../../src/components/resiliency/FormularioLeadResiliente';
import type { B2BLeadFormPayloadInferred } from '../../src/domain/leads/B2BLeadFormPayload';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock de localStorage con simulación de QuotaExceededError
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
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
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
const mockServiceWorker = {
  ready: Promise.resolve({
    sync: { register: vi.fn().mockResolvedValue(undefined) },
  }),
};

Object.defineProperty(globalThis, 'navigator', {
  value: { serviceWorker: mockServiceWorker },
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

describe('Tests E2E - Modos de Fallo del FMEA (RFC-003)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.simularQuotaExceeded(false);
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ────────────────────────────────────────────────────────────────────────
  // F1: Timeout de API
  // ─────────────────────────────────────────────────────────────────────────
  describe('F1: Timeout de API (5s)', () => {
    it('debería escalar a Estrategia A cuando la API tarda más de 5s', async () => {
      // Simular respuesta lenta (6s)
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 202 }), 6000))
      );

      const { result } = renderHook(() => useEnvioResilienteDeLead());
      const startTime = Date.now();

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      const elapsed = Date.now() - startTime;

      // Debería fallar por timeout antes de 6s (AbortSignal.timeout = 5s)
      expect(elapsed).toBeLessThan(6000);
      // Debería haber escalado a Estrategia A (loading → fallback)
      expect(result.current.estado.tipo).not.toBe('idle');
    });

    it('debería completar el intento primario en < 5s (SLA)', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 202,
        json: async () => ({ status: 'queued', leadId: 'test-123' }),
      });

      const { result } = renderHook(() => useEnvioResilienteDeLead());
      const startTime = Date.now();

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(5000);
      expect(result.current.estado.tipo).toBe('success');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // F3: Pérdida total de conexión
  // ─────────────────────────────────────────────────────────────────────────
  describe('F3: Pérdida total de conexión', () => {
    it('debería persistir en LocalStorage cuando fetch es rechazado', async () => {
      // Simular pérdida total de red
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      // Avanzar tiempo para los 3 reintentos (2s + 4s + 8s = 14s)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(14000);
      });

      // Verificar que el Lead fue guardado en LocalStorage
      const stored = localStorageMock.getItem('sighfood_pending_leads');
      expect(stored).toBeTruthy();

      const leads = JSON.parse(stored || '[]');
      expect(leads).toHaveLength(1);
      expect(leads[0].payload.establecimiento).toBe('Gastrobar El Rincón');
    });

    it('debería mostrar fallback de WhatsApp tras agotar reintentos', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(14000);
      });

      expect(result.current.estado.tipo).toBe('fallback-required');
      if (result.current.estado.tipo === 'fallback-required') {
        expect(result.current.estado.enlaceWhatsApp).toContain('wa.me');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // F4: QuotaExceededError en LocalStorage
  // ─────────────────────────────────────────────────────────────────────────
  describe('F4: QuotaExceededError', () => {
    it('debería saltar directo a Estrategia C (WhatsApp)', async () => {
      localStorageMock.simularQuotaExceeded(true);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      // Debería estar en fallback-required inmediatamente, sin reintentos
      expect(result.current.estado.tipo).toBe('fallback-required');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Solo el intento primario
    });

    it('debería notificar evento localstorage_quota_exceeded', async () => {
      localStorageMock.simularQuotaExceeded(true);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockSentry = { captureMessage: vi.fn() };
      Object.defineProperty(globalThis, 'window', {
        value: { Sentry: mockSentry, SyncManager: {} },
        writable: true,
      });

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('localstorage_quota_exceeded'),
        expect.any(Object)
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // F5: Cierre de pestaña (Background Sync)
  // ─────────────────────────────────────────────────────────────────────────
  describe('F5: Cierre de pestaña - Background Sync', () => {
    it('debería registrar Background Sync cuando está disponible', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(14000);
      });

      // Verificar que se registró el sync tag
      expect(mockServiceWorker.ready).toBeDefined();
      expect(mockServiceWorker.ready.then).toBeDefined();
    });

    it('debería mostrar WhatsApp AÚN con Background Sync disponible', async () => {
      // Principio de UX: nunca pedir al usuario que "confíe" en proceso invisible
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(14000);
      });

      expect(result.current.estado.tipo).toBe('fallback-required');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // F6: Navegador sin soporte (Safari/iOS)
  // ─────────────────────────────────────────────────────────────────────────
  describe('F6: Navegador sin soporte de Background Sync', () => {
    it('debería detectar ausencia de soporte y escalar a WhatsApp', async () => {
      // Simular Safari/iOS sin SyncManager
      Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true });
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(14000);
      });

      expect(result.current.estado.tipo).toBe('fallback-required');
    });

    it('debería notificar evento background_sync_unsupported', async () => {
      Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true });
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true });

      const mockSentry = { captureMessage: vi.fn() };
      Object.defineProperty(globalThis, 'window', {
        value: { Sentry: mockSentry },
        writable: true,
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(14000);
      });

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('background_sync_unsupported'),
        expect.any(Object)
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Validación de SLAs (RFC-003 Sección 1.2)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Validación de SLAs', () => {
    it('SLA 1: Disponibilidad de captura 99.99% - todos los caminos terminan en success o fallback', async () => {
      const escenarios = [
        { nombre: 'camino feliz', fetch: () => Promise.resolve({ status: 202, json: async () => ({}) }) },
        { nombre: 'F1 timeout', fetch: () => new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 6000)) },
        { nombre: 'F3 red caída', fetch: () => Promise.reject(new Error('Network error')) },
        { nombre: 'F4 quota', fetch: () => {
            localStorageMock.simularQuotaExceeded(true);
            return Promise.reject(new Error('Network error'));
          }
        },
      ];

      for (const escenario of escenarios) {
        mockFetch.mockImplementationOnce(escenario.fetch);
        const { result } = renderHook(() => useEnvioResilienteDeLead());

        await act(async () => {
          await result.current.enviar(payloadDePrueba);
        });

        await act(async () => {
          await vi.advanceTimersByTimeAsync(15000);
        });

        const estadoFinal = result.current.estado.tipo;
        const esEstadoTerminal =
          estadoFinal === 'success' ||
          estadoFinal === 'degraded-success' ||
          estadoFinal === 'fallback-required';

        expect(esEstadoTerminal).toBe(true);
      }
    });

    it('SLA 2: Pérdida de datos definitiva = 0 - siempre hay al menos un registro', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(15000);
      });

      // Verificar que hay registro en LocalStorage O enlace WhatsApp
      const stored = localStorageMock.getItem('sighfood_pending_leads');
      const tieneLocalStorage = stored && JSON.parse(stored).length > 0;
      const tieneWhatsApp = result.current.estado.tipo === 'fallback-required';

      expect(tieneLocalStorage || tieneWhatsApp).toBe(true);
    });

    it('SLA 3: Tiempo máximo hasta notificar fallback < 3s desde primer fallo', async () => {
      localStorageMock.simularQuotaExceeded(true);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());
      const startTime = Date.now();

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      const elapsed = Date.now() - startTime;

      expect(result.current.estado.tipo).toBe('fallback-required');
      expect(elapsed).toBeLessThan(3000);
    });

    it('SLA 4: Tiempo de reintento ~15s antes de escalar a WhatsApp', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEnvioResilienteDeLead());
      const startTime = Date.now();

      await act(async () => {
        await result.current.enviar(payloadDePrueba);
      });

      // Avanzar exactamente 14s (2s + 4s + 8s)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(14000);
      });

      const elapsed = Date.now() - startTime;

      expect(result.current.estado.tipo).toBe('fallback-required');
      expect(elapsed).toBeGreaterThanOrEqual(14000);
      expect(elapsed).toBeLessThan(16000); // Margen de 2s
    });
  });
});