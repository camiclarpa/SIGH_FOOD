/**
 * tests/resiliency/telemetry.test.ts
 *
 * Tests de eventos de observabilidad.
 * RFC-003 Sección 5.1
 *
 * Casos de prueba:
 *   - Cada tipo de evento se envía correctamente a Sentry/Analytics
 *   - Nivel de log correcto (error para quota exceeded, warning para demás)
 *   - Función nunca lanza excepciones (aunque Sentry/Analytics fallen)
 *   - Helper registrarEvento reduce boilerplate
 *   - calcularTasaFallback retorna porcentaje correcto
 *   - debeDispararAlertaAlta evalúa umbrales correctamente
 */
 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  enviarEventoAObservabilidad,
  registrarEvento,
  calcularTasaFallback,
  debeDispararAlertaAlta,
  type EventoResilienciaLead,
  type TipoEventoResiliencia,
} from '../../src/lib/resiliency/telemetry';
 
describe('telemetry - Eventos de observabilidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
 
  describe('enviarEventoAObservabilidad', () => {
    it('debería enviar evento a Sentry si está disponible', () => {
      const mockSentry = { captureMessage: vi.fn() };
      Object.defineProperty(globalThis, 'window', {
        value: { Sentry: mockSentry },
        writable: true,
      });
 
      const evento: EventoResilienciaLead = {
        evento: 'recovered_after_retry',
        leadId: 'test-lead-123',
        timestampISO: new Date().toISOString(),
        metadata: { intentosNecesarios: 3 },
      };
 
      enviarEventoAObservabilidad(evento);
 
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        '[Resiliency] recovered_after_retry',
        expect.objectContaining({
          level: 'warning',
          extra: evento,
        })
      );
    });
 
    it('debería enviar evento a Analytics si está disponible', () => {
      const mockAnalytics = { track: vi.fn() };
      Object.defineProperty(globalThis, 'window', {
        value: { analytics: mockAnalytics },
        writable: true,
      });
 
      const evento: EventoResilienciaLead = {
        evento: 'whatsapp_fallback_clicked',
        leadId: 'test-lead-456',
        timestampISO: new Date().toISOString(),
      };
 
      enviarEventoAObservabilidad(evento);
 
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        'lead_resiliency_event',
        expect.objectContaining({
          evento: 'whatsapp_fallback_clicked',
          nivel: 'warning',
        })
      );
    });
 
    it('debería usar nivel "error" para localstorage_quota_exceeded', () => {
      const mockSentry = { captureMessage: vi.fn() };
      Object.defineProperty(globalThis, 'window', {
        value: { Sentry: mockSentry },
        writable: true,
      });
 
      const evento: EventoResilienciaLead = {
        evento: 'localstorage_quota_exceeded',
        leadId: 'test-lead-789',
        timestampISO: new Date().toISOString(),
      };
 
      enviarEventoAObservabilidad(evento);
 
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ level: 'error' })
      );
    });
 
    it('debería usar nivel "warning" para recovered_after_retry', () => {
      const mockSentry = { captureMessage: vi.fn() };
      Object.defineProperty(globalThis, 'window', {
        value: { Sentry: mockSentry },
        writable: true,
      });
 
      const evento: EventoResilienciaLead = {
        evento: 'recovered_after_retry',
        leadId: 'test-lead-101',
        timestampISO: new Date().toISOString(),
      };
 
      enviarEventoAObservabilidad(evento);
 
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ level: 'warning' })
      );
    });
 
    it('NO debería lanzar excepción si Sentry falla', () => {
      const mockSentry = {
        captureMessage: vi.fn(() => {
          throw new Error('Sentry error');
        }),
      };
      Object.defineProperty(globalThis, 'window', {
        value: { Sentry: mockSentry },
        writable: true,
      });
 
      const evento: EventoResilienciaLead = {
        evento: 'whatsapp_fallback_shown',
        leadId: 'test-lead-102',
        timestampISO: new Date().toISOString(),
      };
 
      expect(() => enviarEventoAObservabilidad(evento)).not.toThrow();
    });
 
    it('NO debería lanzar excepción si Analytics falla', () => {
      const mockAnalytics = {
        track: vi.fn(() => {
          throw new Error('Analytics error');
        }),
      };
      Object.defineProperty(globalThis, 'window', {
        value: { analytics: mockAnalytics },
        writable: true,
      });
 
      const evento: EventoResilienciaLead = {
        evento: 'background_sync_registered',
        leadId: 'test-lead-103',
        timestampISO: new Date().toISOString(),
      };
 
      expect(() => enviarEventoAObservabilidad(evento)).not.toThrow();
    });
 
    it('debería manejar gracefully si ni Sentry ni Analytics están disponibles', () => {
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });
 
      const evento: EventoResilienciaLead = {
        evento: 'background_sync_unsupported',
        leadId: 'test-lead-104',
        timestampISO: new Date().toISOString(),
      };
 
      expect(() => enviarEventoAObservabilidad(evento)).not.toThrow();
    });
  });
 
  describe('registrarEvento (helper)', () => {
    it('debería enviar evento con timestamp automático', () => {
      const mockSentry = { captureMessage: vi.fn() };
      Object.defineProperty(globalThis, 'window', {
        value: { Sentry: mockSentry },
        writable: true,
      });
 
      registrarEvento('whatsapp_fallback_shown', 'test-lead-200', { canal: 'whatsapp' });
 
      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        '[Resiliency] whatsapp_fallback_shown',
        expect.objectContaining({
          extra: expect.objectContaining({
            evento: 'whatsapp_fallback_shown',
            leadId: 'test-lead-200',
            metadata: { canal: 'whatsapp' },
          }),
        })
      );
    });
  });
 
  describe('calcularTasaFallback', () => {
    it('debería retornar 0 si no hay eventos totales', () => {
      expect(calcularTasaFallback(0, 0)).toBe(0);
    });
 
    it('debería calcular porcentaje correcto', () => {
      expect(calcularTasaFallback(100, 5)).toBe(5);
    });
 
    it('debería manejar 100% de fallback', () => {
      expect(calcularTasaFallback(10, 10)).toBe(100);
    });
 
    it('debería manejar decimales', () => {
      expect(calcularTasaFallback(200, 7)).toBeCloseTo(3.5, 1);
    });
  });
 
  describe('debeDispararAlertaAlta', () => {
    it('debería disparar alerta si la tasa supera 5% en ventana de 1 hora', () => {
      expect(debeDispararAlertaAlta(6, 1)).toBe(true);
    });
 
    it('NO debería disparar alerta si la tasa es exactamente 5%', () => {
      expect(debeDispararAlertaAlta(5, 1)).toBe(false);
    });
 
    it('NO debería disparar alerta si la ventana supera 1 hora', () => {
      expect(debeDispararAlertaAlta(10, 2)).toBe(false);
    });
 
    it('debería usar ventana de 1 hora por defecto', () => {
      expect(debeDispararAlertaAlta(6)).toBe(true);
    });
  });
 
  describe('Cobertura de todos los tipos de evento', () => {
    const todosLosEventos: TipoEventoResiliencia[] = [
      'localstorage_quota_exceeded',
      'recovered_after_retry',
      'background_sync_registered',
      'background_sync_unsupported',
      'whatsapp_fallback_shown',
      'whatsapp_fallback_clicked',
    ];
 
    todosLosEventos.forEach((tipoEvento) => {
      it(`debería manejar el evento "${tipoEvento}" sin errores`, () => {
        const mockSentry = { captureMessage: vi.fn() };
        Object.defineProperty(globalThis, 'window', {
          value: { Sentry: mockSentry },
          writable: true,
        });
 
        const evento: EventoResilienciaLead = {
          evento: tipoEvento,
          leadId: `test-lead-${tipoEvento}`,
          timestampISO: new Date().toISOString(),
        };
 
        expect(() => enviarEventoAObservabilidad(evento)).not.toThrow();
        expect(mockSentry.captureMessage).toHaveBeenCalled();
      });
    });
  });
});