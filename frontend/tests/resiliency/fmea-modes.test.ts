/**
 * tests/resiliency/fmea-modes.test.ts
 *
 * Tests individuales de cada modo de fallo del FMEA (RFC-003 Sección 2).
 *
 * Cada modo de fallo se prueba de forma aislada para verificar que la
 * mitigación correspondiente funciona correctamente.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guardarLeadPendiente } from '../../src/lib/resiliency/localLeadStorage';
import { reintentarConBackoff } from '../../src/lib/resiliency/retryQueue';
import { soportaBackgroundSync } from '../../src/lib/resiliency/backgroundSync';
import { construirEnlaceWhatsAppFallback } from '../../src/lib/resiliency/whatsappFallback';
import type { PendingLeadRecord } from '../../src/lib/resiliency/localLeadStorage';
import type { B2BLeadFormPayloadInferred } from '../../src/domain/leads/B2BLeadFormPayload';

// Mock de fetch
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

// Payload de prueba
const payloadDePrueba: B2BLeadFormPayloadInferred = {
  establecimiento: 'Gastrobar Test',
  nombreTomadorDecision: 'Test User',
  rol: 'GERENTE_AB',
  whatsapp: '+573001234567',
  licoresDominantes: ['MEZCAL_AGAVE'],
  roiEstimadoAlMomentoDelEnvio: {
    conosEstimadosPorMes: 100,
    gananciaNetaMensualCOP: 2_350_000,
  },
};

const recordDePrueba: PendingLeadRecord = {
  leadId: 'test-lead-123',
  payload: payloadDePrueba,
  intentosRealizados: 0,
  primerIntentoISO: new Date().toISOString(),
  ultimoIntentoISO: null,
};

describe('FMEA - Modos de Fallo Individuales', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.simularQuotaExceeded(false);
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // F1: Timeout de API
  // ─────────────────────────────────────────────────────────────────────────
  describe('F1: Timeout de API', () => {
    it('debería manejar timeout de 5s graceful', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new DOMException('Timeout', 'TimeoutError')), 6000)
        )
      );

      const resultado = await reintentarConBackoff(recordDePrueba);
      expect(resultado).toBe('exhausted');
    });

    it('debería reintentar tras timeout', async () => {
      mockFetch
        .mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'))
        .mockResolvedValueOnce({ status: 202, json: async () => ({}) });

      const resultado = await reintentarConBackoff(recordDePrueba);
      expect(resultado).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // F3: Pérdida total de conexión
  // ─────────────────────────────────────────────────────────────────────────
  describe('F3: Pérdida total de conexión', () => {
    it('debería persistir en LocalStorage cuando fetch falla', () => {
      const resultado = guardarLeadPendiente(recordDePrueba);
      expect(resultado).toBe(true);

      const stored = localStorageMock.getItem('sighfood_pending_leads');
      expect(stored).toBeTruthy();

      const leads = JSON.parse(stored || '[]');
      expect(leads).toHaveLength(1);
    });

    it('debería manejar múltiples Leads pendientes', () => {
      guardarLeadPendiente(recordDePrueba);
      guardarLeadPendiente({ ...recordDePrueba, leadId: 'test-lead-456' });

      const stored = localStorageMock.getItem('sighfood_pending_leads');
      const leads = JSON.parse(stored || '[]');
      expect(leads).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // F4: QuotaExceededError
  // ─────────────────────────────────────────────────────────────────────────
  describe('F4: QuotaExceededError', () => {
    it('debería retornar false cuando la cuota está excedida', () => {
      localStorageMock.simularQuotaExceeded(true);

      const resultado = guardarLeadPendiente(recordDePrueba);
      expect(resultado).toBe(false);
    });

    it('debería NO lanzar excepción (siempre retorna boolean)', () => {
      localStorageMock.simularQuotaExceeded(true);

      expect(() => guardarLeadPendiente(recordDePrueba)).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // F5: Cierre de pestaña (Background Sync)
  // ─────────────────────────────────────────────────────────────────────────
  describe('F5: Cierre de pestaña', () => {
    it('debería detectar soporte de Background Sync', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { serviceWorker: {} },
        writable: true,
      });
      Object.defineProperty(globalThis, 'window', {
        value: { SyncManager: {} },
        writable: true,
      });

      expect(soportaBackgroundSync()).toBe(true);
    });

    it('debería detectar ausencia de soporte (Safari/iOS)', () => {
      Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true });
      Object.defineProperty(globalThis, 'window', { value: {}, writable: true });

      expect(soportaBackgroundSync()).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // F6: Navegador sin soporte
  // ─────────────────────────────────────────────────────────────────────────
  describe('F6: Navegador sin soporte', () => {
    it('debería construir enlace WhatsApp válido como fallback', () => {
      const enlace = construirEnlaceWhatsAppFallback(payloadDePrueba);
      expect(enlace).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    });

    it('debería incluir todos los campos del payload en el mensaje', () => {
      const enlace = construirEnlaceWhatsAppFallback(payloadDePrueba);
      const url = new URL(enlace);
      const texto = url.searchParams.get('text') || '';
      const textoDecodificado = decodeURIComponent(texto);

      expect(textoDecodificado).toContain('Gastrobar Test');
      expect(textoDecodificado).toContain('Test User');
      expect(textoDecodificado).toContain('GERENTE_AB');
      expect(textoDecodificado).toContain('MEZCAL_AGAVE');
      expect(textoDecodificado).toContain('2.350.000');
    });
  });
});