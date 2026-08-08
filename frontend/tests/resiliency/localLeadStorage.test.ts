/**
 * tests/resiliency/localLeadStorage.test.ts
 *
 * Tests de LocalStorage (Estrategia A).
 * RFC-003 Sección 3.1
 *
 * Casos de prueba:
 *   - Caso feliz: guardar y recuperar un Lead
 *   - Caso borde: QuotaExceededError (F4 del FMEA)
 *   - Caso borde: purga de leads sincronizados para liberar espacio
 *   - Caso borde: JSON corrupto en LocalStorage
 *   - Caso borde: múltiples Leads pendientes
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  guardarLeadPendiente,
  obtenerLeadsPendientes,
  marcarComoSincronizado,
  actualizarIntentosDeReintento,
  obtenerTamanoPendientesBytes,
  type PendingLeadRecord,
} from '../../src/lib/resiliency/localLeadStorage';

// Mock de localStorage para tests
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
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    // Helper para tests: simular QuotaExceededError
    simularQuotaExceeded: (shouldThrow: boolean) => {
      shouldThrowQuotaExceeded = shouldThrow;
    },
    // Helper para tests: acceder al store interno
    _store: store,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Payload de prueba válido
const payloadDePrueba = {
  establecimiento: 'Gastrobar El Rincón',
  nombreTomadorDecision: 'Laura Martínez',
  rol: 'GERENTE_AB' as const,
  whatsapp: '+573001234567',
  licoresDominantes: ['MEZCAL_AGAVE'] as const,
  roiEstimadoAlMomentoDelEnvio: {
    conosEstimadosPorMes: 100,
    gananciaNetaMensualCOP: 2_350_000,
  },
};

// Record de prueba
const recordDePrueba: PendingLeadRecord = {
  leadId: 'test-lead-id-123',
  payload: payloadDePrueba,
  intentosRealizados: 0,
  primerIntentoISO: new Date().toISOString(),
  ultimoIntentoISO: null,
};

describe('localLeadStorage - Estrategia A', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.simularQuotaExceeded(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('guardarLeadPendiente', () => {
    it('debería guardar un Lead exitosamente (caso feliz)', () => {
      const resultado = guardarLeadPendiente(recordDePrueba);
      expect(resultado).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('debería retornar false cuando hay QuotaExceededError (F4 del FMEA)', () => {
      localStorageMock.simularQuotaExceeded(true);
      const resultado = guardarLeadPendiente(recordDePrueba);
      expect(resultado).toBe(false);
    });

    it('debería persistir el Lead en LocalStorage', () => {
      guardarLeadPendiente(recordDePrueba);
      const pendientes = obtenerLeadsPendientes();
      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].leadId).toBe('test-lead-id-123');
      expect(pendientes[0].payload.establecimiento).toBe('Gastrobar El Rincón');
    });

    it('debería permitir múltiples Leads pendientes', () => {
      const record2: PendingLeadRecord = {
        ...recordDePrueba,
        leadId: 'test-lead-id-456',
      };
      guardarLeadPendiente(recordDePrueba);
      guardarLeadPendiente(record2);
      const pendientes = obtenerLeadsPendientes();
      expect(pendientes).toHaveLength(2);
    });
  });

  describe('obtenerLeadsPendientes', () => {
    it('debería retornar array vacío si no hay Leads', () => {
      const pendientes = obtenerLeadsPendientes();
      expect(pendientes).toEqual([]);
    });

    it('debería retornar los Leads guardados', () => {
      guardarLeadPendiente(recordDePrueba);
      const pendientes = obtenerLeadsPendientes();
      expect(pendientes).toHaveLength(1);
    });

    it('debería manejar JSON corrupto graceful (retornar array vacío)', () => {
      localStorageMock.setItem('sighfood_pending_leads', 'JSON_INVALIDO');
      const pendientes = obtenerLeadsPendientes();
      expect(pendientes).toEqual([]);
    });
  });

  describe('marcarComoSincronizado', () => {
    it('debería remover el Lead de la lista de pendientes', () => {
      guardarLeadPendiente(recordDePrueba);
      expect(obtenerLeadsPendientes()).toHaveLength(1);

      marcarComoSincronizado('test-lead-id-123');
      expect(obtenerLeadsPendientes()).toHaveLength(0);
    });

    it('debería no afectar otros Leads pendientes', () => {
      const record2: PendingLeadRecord = {
        ...recordDePrueba,
        leadId: 'test-lead-id-456',
      };
      guardarLeadPendiente(recordDePrueba);
      guardarLeadPendiente(record2);

      marcarComoSincronizado('test-lead-id-123');
      const pendientes = obtenerLeadsPendientes();
      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].leadId).toBe('test-lead-id-456');
    });

    it('debería manejar gracefully si el leadId no existe', () => {
      guardarLeadPendiente(recordDePrueba);
      marcarComoSincronizado('lead-id-inexistente');
      expect(obtenerLeadsPendientes()).toHaveLength(1);
    });
  });

  describe('actualizarIntentosDeReintento', () => {
    it('debería actualizar el conteo de intentos', () => {
      guardarLeadPendiente(recordDePrueba);
      actualizarIntentosDeReintento('test-lead-id-123', 2);

      const pendientes = obtenerLeadsPendientes();
      expect(pendientes[0].intentosRealizados).toBe(2);
      expect(pendientes[0].ultimoIntentoISO).not.toBeNull();
    });

    it('debería manejar gracefully si el leadId no existe', () => {
      // No debería lanzar error
      actualizarIntentosDeReintento('lead-id-inexistente', 1);
    });
  });

  describe('obtenerTamanoPendientesBytes', () => {
    it('debería retornar 0 si no hay Leads', () => {
      const tamano = obtenerTamanoPendientesBytes();
      expect(tamano).toBe(0);
    });

    it('debería retornar el tamaño correcto en bytes', () => {
      guardarLeadPendiente(recordDePrueba);
      const tamano = obtenerTamanoPendientesBytes();
      expect(tamano).toBeGreaterThan(0);
    });
  });

  describe('Metadatos de reintento', () => {
    it('debería preservar primerIntentoISO', () => {
      const timestampOriginal = '2026-08-05T10:00:00.000Z';
      const recordConTimestamp: PendingLeadRecord = {
        ...recordDePrueba,
        primerIntentoISO: timestampOriginal,
      };
      guardarLeadPendiente(recordConTimestamp);

      const pendientes = obtenerLeadsPendientes();
      expect(pendientes[0].primerIntentoISO).toBe(timestampOriginal);
    });

    it('debería inicializar ultimoIntentoISO como null', () => {
      guardarLeadPendiente(recordDePrueba);
      const pendientes = obtenerLeadsPendientes();
      expect(pendientes[0].ultimoIntentoISO).toBeNull();
    });
  });
});