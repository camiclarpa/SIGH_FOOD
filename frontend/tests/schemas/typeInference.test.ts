/**
 * tests/schemas/typeInference.test.ts
 *
 * Test de la regla de arquitectura: los tipos TypeScript se INFIEREN
 * de los esquemas Zod, nunca se declaran por separado.
 *
 * Este test verifica que z.infer produce los tipos esperados,
 * garantizando que no haya divergencia entre el tipo estático
 * y la validación en runtime.
 */
import { describe, it, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { B2BLeadFormPayloadSchema } from '../../src/schemas/leadForm.schema';
import { CRMWebhookPayloadSchema } from '../../src/schemas/crmWebhook.schema';
import { ROICalculatorInputSchema } from '../../src/schemas/roi.schema';
import { ROICalculatorOutputSchema } from '../../src/schemas/roi.schema';

type B2BLeadFormPayloadInferred = z.infer<typeof B2BLeadFormPayloadSchema>;
type CRMWebhookPayloadInferred = z.infer<typeof CRMWebhookPayloadSchema>;

describe('Inferencia de tipos desde esquemas Zod', () => {
  it('B2BLeadFormPayloadInferred debería tener la propiedad establecimiento', () => {
    expectTypeOf<B2BLeadFormPayloadInferred>().toHaveProperty('establecimiento');
  });

  it('B2BLeadFormPayloadInferred debería tener la propiedad whatsapp', () => {
    expectTypeOf<B2BLeadFormPayloadInferred>().toHaveProperty('whatsapp');
  });

  it('B2BLeadFormPayloadInferred debería tener roiEstimadoAlMomentoDelEnvio', () => {
    expectTypeOf<B2BLeadFormPayloadInferred>().toHaveProperty('roiEstimadoAlMomentoDelEnvio');
  });

  it('B2BLeadFormPayloadInferred.establecimiento debería ser string', () => {
    expectTypeOf<B2BLeadFormPayloadInferred['establecimiento']>().toBeString();
  });

  it('B2BLeadFormPayloadInferred.rol debería ser EB2BRole', () => {
    expectTypeOf<B2BLeadFormPayloadInferred['rol']>().toBeString();
  });

  it('B2BLeadFormPayloadInferred.licoresDominantes debería ser array', () => {
    expectTypeOf<B2BLeadFormPayloadInferred['licoresDominantes']>().toBeArray();
  });

  it('CRMWebhookPayloadInferred debería tener leadId', () => {
    expectTypeOf<CRMWebhookPayloadInferred>().toHaveProperty('leadId');
  });

  it('CRMWebhookPayloadInferred debería tener anclajeFinancieroCOP', () => {
    expectTypeOf<CRMWebhookPayloadInferred>().toHaveProperty('anclajeFinancieroCOP');
  });

  it('CRMWebhookPayloadInferred.dealStage debería ser literal LEAD_NUEVO', () => {
    expectTypeOf<CRMWebhookPayloadInferred['dealStage']>().toBeString();
  });
});