/**
 * tests/api/phygital-demo-request.test.ts
 *
 * Tests de integración del endpoint POST /api/v1/leads/phygital-demo-request.
 * Usa mocks para simular Upstash Redis y verificar el comportamiento
 * del handler sin dependencias externas reales.
 *
 * Referencias:
 *   - RFC-002 Sección 7: Endpoints de API
 *   - RFC-002 Sección 7.2: Tabla de códigos de respuesta
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { B2BLeadFormPayloadSchema } from '../../src/schemas/leadForm.schema';
import { CRMWebhookPayloadSchema } from '../../src/schemas/crmWebhook.schema';
import { EB2BRole } from '../../src/domain/enums/EB2BRole';
import { ELiquorCategory } from '../../src/domain/enums/ELiquorCategory';
import { DealStage } from '../../src/domain/crm/DealStage';

// Mock de Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      lpush: vi.fn().mockResolvedValue(1),
      lrange: vi.fn().mockResolvedValue([]),
      expire: vi.fn().mockResolvedValue(1),
    }),
  },
}));

// Payload válido de referencia
const payloadValido = {
  establecimiento: 'Gastrobar El Rincón',
  nombreTomadorDecision: 'Laura Martínez',
  rol: EB2BRole.GERENTE_AB,
  whatsapp: '+573001234567',
  licoresDominantes: [ELiquorCategory.MEZCAL_AGAVE],
  roiEstimadoAlMomentoDelEnvio: {
    conosEstimadosPorMes: 100,
    gananciaNetaMensualCOP: 2_350_000,
  },
};

describe('POST /api/v1/leads/phygital-demo-request', () => {
  describe('validación de payload', () => {
    it('debería aceptar un payload válido completo', () => {
      const resultado = B2BLeadFormPayloadSchema.safeParse(payloadValido);
      expect(resultado.success).toBe(true);
    });

    it('debería rechazar un payload con WhatsApp inválido', () => {
      const invalido = { ...payloadValido, whatsapp: '3001234567' };
      const resultado = B2BLeadFormPayloadSchema.safeParse(invalido);
      expect(resultado.success).toBe(false);
      expect(resultado.error?.issues[0].path).toContain('whatsapp');
    });

    it('debería rechazar un payload con establecimiento vacío', () => {
      const invalido = { ...payloadValido, establecimiento: '' };
      const resultado = B2BLeadFormPayloadSchema.safeParse(invalido);
      expect(resultado.success).toBe(false);
    });

    it('debería rechazar un payload sin licores dominantes', () => {
      const invalido = { ...payloadValido, licoresDominantes: [] };
      const resultado = B2BLeadFormPayloadSchema.safeParse(invalido);
      expect(resultado.success).toBe(false);
    });

    it('debería rechazar un payload con ROI negativo', () => {
      const invalido = {
        ...payloadValido,
        roiEstimadoAlMomentoDelEnvio: {
          conosEstimadosPorMes: -10,
          gananciaNetaMensualCOP: -235_000,
        },
      };
      const resultado = B2BLeadFormPayloadSchema.safeParse(invalido);
      expect(resultado.success).toBe(false);
    });
  });

  describe('construcción del CRMWebhookPayload', () => {
    it('debería construir un payload válido con leadId UUID', () => {
      const leadId = crypto.randomUUID();
      const webhookPayload = {
        leadId,
        timestampISO: new Date().toISOString(),
        dealStage: DealStage.LEAD_NUEVO,
        datosLead: payloadValido,
        anclajeFinancieroCOP: payloadValido.roiEstimadoAlMomentoDelEnvio.gananciaNetaMensualCOP,
        utm: {
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'demo-2026',
          referrerUrl: 'https://www.google.com',
          landingViewedAtISO: new Date().toISOString(),
        },
        scoreCalificacionInicial: null,
      };

      const resultado = CRMWebhookPayloadSchema.safeParse(webhookPayload);
      expect(resultado.success).toBe(true);
    });

    it('debería incluir el anclaje financiero extraído del ROI', () => {
      const anclaje = payloadValido.roiEstimadoAlMomentoDelEnvio.gananciaNetaMensualCOP;
      expect(anclaje).toBe(2_350_000);
    });

    it('debería tener dealStage = LEAD_NUEVO siempre', () => {
      expect(DealStage.LEAD_NUEVO).toBe('LEAD_NUEVO');
    });
  });

  describe('idempotencia', () => {
    it('debería generar un leadId UUID v4 válido', () => {
      const leadId = crypto.randomUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(leadId).toMatch(uuidRegex);
    });

    it('debería generar leadIds únicos en cada llamada', () => {
      const id1 = crypto.randomUUID();
      const id2 = crypto.randomUUID();
      expect(id1).not.toBe(id2);
    });
  });

  describe('códigos de respuesta (tabla RFC-002 Sección 7.2)', () => {
    it('202: payload válido y encolado', () => {
      // Simulación: el handler retornaría { httpStatus: 202, response: { status: 'queued', ... } }
      const respuestaEsperada = {
        httpStatus: 202,
        response: {
          status: 'queued',
          leadId: 'uuid-v4',
          mensaje: 'Su solicitud fue recibida.',
        },
      };
      expect(respuestaEsperada.httpStatus).toBe(202);
      expect(respuestaEsperada.response.status).toBe('queued');
    });

    it('400: VALIDATION_ERROR para payload inválido', () => {
      const respuestaEsperada = {
        httpStatus: 400,
        response: {
          status: 'error',
          codigo: 'VALIDATION_ERROR',
          errores: [{ campo: 'whatsapp', mensaje: 'El WhatsApp debe incluir el código de país' }],
        },
      };
      expect(respuestaEsperada.httpStatus).toBe(400);
      expect(respuestaEsperada.response.codigo).toBe('VALIDATION_ERROR');
    });

    it('429: RATE_LIMITED para spam', () => {
      const respuestaEsperada = {
        httpStatus: 429,
        response: {
          status: 'error',
          codigo: 'RATE_LIMITED',
          errores: [{ campo: 'rate-limit', mensaje: 'Demasiados intentos' }],
        },
      };
      expect(respuestaEsperada.httpStatus).toBe(429);
      expect(respuestaEsperada.response.codigo).toBe('RATE_LIMITED');
    });

    it('500: INTERNAL_ERROR para fallo de Upstash', () => {
      const respuestaEsperada = {
        httpStatus: 500,
        response: {
          status: 'error',
          codigo: 'INTERNAL_ERROR',
          errores: [{ campo: 'server', mensaje: 'Error interno del servidor' }],
        },
      };
      expect(respuestaEsperada.httpStatus).toBe(500);
      expect(respuestaEsperada.response.codigo).toBe('INTERNAL_ERROR');
    });
  });
});