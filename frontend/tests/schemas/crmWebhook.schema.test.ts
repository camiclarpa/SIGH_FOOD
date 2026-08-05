/**
 * tests/schemas/crmWebhook.schema.test.ts
 *
 * Tests del esquema del payload hacia HubSpot/Pipedrive.
 * Este es el contrato más importante — cualquier cambio aquí
 * exige coordinación con el equipo del CRM.
 */
import { describe, it, expect } from 'vitest';
import { CRMWebhookPayloadSchema } from '../../src/schemas/crmWebhook.schema';
import { DealStage } from '../../src/domain/crm/DealStage';
import { EB2BRole } from '../../src/domain/enums/EB2BRole';
import { ELiquorCategory } from '../../src/domain/enums/ELiquorCategory';

// Payload válido de referencia
const payloadValido = {
  leadId: '123e4567-e89b-12d3-a456-426614174000',
  timestampISO: new Date().toISOString(),
  dealStage: DealStage.LEAD_NUEVO,
  datosLead: {
    establecimiento: 'Gastrobar El Rincón',
    nombreTomadorDecision: 'Laura Martínez',
    rol: EB2BRole.GERENTE_AB,
    whatsapp: '+573001234567',
    licoresDominantes: [ELiquorCategory.MEZCAL_AGAVE],
    roiEstimadoAlMomentoDelEnvio: {
      conosEstimadosPorMes: 100,
      gananciaNetaMensualCOP: 2_350_000,
    },
  },
  anclajeFinancieroCOP: 2_350_000,
  utm: {
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'demo-phygital-2026',
    referrerUrl: 'https://www.google.com',
    landingViewedAtISO: new Date().toISOString(),
  },
  scoreCalificacionInicial: null,
};

describe('CRMWebhookPayloadSchema', () => {
  it('debería aceptar un payload válido completo', () => {
    const resultado = CRMWebhookPayloadSchema.safeParse(payloadValido);
    expect(resultado.success).toBe(true);
  });

  it('debería rechazar leadId que no sea UUID', () => {
    const invalido = { ...payloadValido, leadId: 'no-es-uuid' };
    const resultado = CRMWebhookPayloadSchema.safeParse(invalidido);
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar dealStage distinto de LEAD_NUEVO', () => {
    const invalido = { ...payloadValido, dealStage: DealStage.MQL };
    const resultado = CRMWebhookPayloadSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar anclajeFinancieroCOP negativo', () => {
    const invalido = { ...payloadValido, anclajeFinancieroCOP: -1000 };
    const resultado = CRMWebhookPayloadSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar scoreCalificacionInicial fuera de rango [0, 100]', () => {
    const invalido = { ...payloadValido, scoreCalificacionInicial: 150 };
    const resultado = CRMWebhookPayloadSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar utm con referrerUrl no URL válida', () => {
    const invalido = {
      ...payloadValido,
      utm: { ...payloadValido.utm, referrerUrl: 'no-es-url' },
    };
    const resultado = CRMWebhookPayloadSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar timestampISO no datetime', () => {
    const invalido = { ...payloadValido, timestampISO: '2026-08-05' };
    const resultado = CRMWebhookPayloadSchema.safeParse(invalido);
    expect(resultado.success).toBe(false);
  });

  it('debería aceptar scoreCalificacionInicial = 0', () => {
    const valido = { ...payloadValido, scoreCalificacionInicial: 0 };
    const resultado = CRMWebhookPayloadSchema.safeParse(valido);
    expect(resultado.success).toBe(true);
  });

  it('debería aceptar scoreCalificacionInicial = 100', () => {
    const valido = { ...payloadValido, scoreCalificacionInicial: 100 };
    const resultado = CRMWebhookPayloadSchema.safeParse(valido);
    expect(resultado.success).toBe(true);
  });
});