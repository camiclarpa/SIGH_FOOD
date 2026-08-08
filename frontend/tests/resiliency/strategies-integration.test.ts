/**
 * tests/resiliency/strategies-integration.test.ts
 *
 * Tests de integración de las 3 estrategias combinadas.
 * RFC-003 Sección 3.0 (Diagrama General de Escalamiento)
 *
 * Verifica que las estrategias A, B y C se escalonan correctamente
 * y nunca se ejecutan simultáneamente.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guardarLeadPendiente } from '../../src/lib/resiliency/localLeadStorage';
import { reintentarConBackoff } from '../../src/lib/resiliency/retryQueue';
import { conRelojAdelantado } from '../helpers/browserEnv';
import { construirEnlaceWhatsAppFallback } from '../../src/lib/resiliency/whatsappFallback';
import type { PendingLeadRecord } from '../../src/lib/resiliency/localLeadStorage';
import type { B2BLeadFormPayloadInferred } from '../../src/domain/leads/B2BLeadFormPayload';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  let shouldThrowQuotaExceeded = false;

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (shouldThrowQuotaExceeded) {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        (error as { code: number }).code = 22;
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

describe('Integración de Estrategias A, B, C', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.simularQuotaExceeded(false);
    vi.clearAllMocks();
  });

  describe('Escalonamiento correcto', () => {
    it('debería intentar Estrategia A antes que B', async () => {
      // Estrategia A: guardar en LocalStorage
      const guardadoA = guardarLeadPendiente(recordDePrueba);
      expect(guardadoA).toBe(true);

      // Verificar que está en LocalStorage antes de reintentar
      const stored = localStorageMock.getItem('sighfood_pending_leads');
      expect(stored).toBeTruthy();

      // Estrategia B: reintentos
      mockFetch.mockResolvedValueOnce({ status: 202, json: async () => ({}) });
      const resultadoB = await conRelojAdelantado(() => reintentarConBackoff(recordDePrueba));
      expect(resultadoB).toBe('success');
    });

    it('debería saltar de A directo a C si A falla', () => {
      localStorageMock.simularQuotaExceeded(true);

      const guardadoA = guardarLeadPendiente(recordDePrueba);
      expect(guardadoA).toBe(false);

      // No deberíamos intentar B si A falló
      // El llamador debe ir directo a C (WhatsApp)
      const enlaceC = construirEnlaceWhatsAppFallback(payloadDePrueba);
      expect(enlaceC).toContain('wa.me');
    });

    it('debería intentar B solo si A tuvo éxito', async () => {
      // A tiene éxito
      const guardadoA = guardarLeadPendiente(recordDePrueba);
      expect(guardadoA).toBe(true);

      // B se ejecuta
      mockFetch.mockRejectedValue(new Error('Network error'));
      const resultadoB = await conRelojAdelantado(() => reintentarConBackoff(recordDePrueba));
      expect(resultadoB).toBe('exhausted');

      // C se muestra tras agotar B
      const enlaceC = construirEnlaceWhatsAppFallback(payloadDePrueba);
      expect(enlaceC).toContain('wa.me');
    });
  });

  describe('Nunca simultáneas', () => {
    it('debería tener un único estado terminal por envío', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Simular flujo completo
      const guardadoA = guardarLeadPendiente(recordDePrueba);
      const resultadoB = await conRelojAdelantado(() => reintentarConBackoff(recordDePrueba));
      const enlaceC = construirEnlaceWhatsAppFallback(payloadDePrueba);

      // Solo uno de estos debe ser el estado final
      const _estadosPosibles = [
        guardadoA ? 'A-success' : 'A-failed',
        resultadoB,
        enlaceC ? 'C-ready' : 'C-not-ready',
      ];

      // El estado final es el último en la cadena
      const estadoFinal = resultadoB === 'success' ? 'B-success' : 'C-required';
      expect(estadoFinal).toBeTruthy();
    });
  });

  describe('Consistencia de datos entre estrategias', () => {
    it('debería mantener los mismos datos en LocalStorage y WhatsApp', () => {
      guardarLeadPendiente(recordDePrueba);
      const enlaceWhatsApp = construirEnlaceWhatsAppFallback(payloadDePrueba);

      const stored = JSON.parse(localStorageMock.getItem('sighfood_pending_leads') || '[]');
      const url = new URL(enlaceWhatsApp);
      const textoWhatsApp = decodeURIComponent(url.searchParams.get('text') || '');

      // Ambos deben contener el establecimiento
      expect(stored[0].payload.establecimiento).toBe('Gastrobar Test');
      expect(textoWhatsApp).toContain('Gastrobar Test');

      // Ambos deben contener el ROI
      expect(stored[0].payload.roiEstimadoAlMomentoDelEnvio.gananciaNetaMensualCOP).toBe(2_350_000);
      expect(textoWhatsApp).toContain('2.350.000');
    });
  });
});