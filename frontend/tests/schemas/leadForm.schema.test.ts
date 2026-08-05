/**
 * tests/schemas/leadForm.schema.test.ts
 *
 * Tests de validación Zod (casos borde).
 */
import { describe, it, expect } from 'vitest';
import { B2BLeadFormPayloadSchema } from '../../src/schemas/leadForm.schema';
import { EB2BRole } from '../../src/domain/enums/EB2BRole';
import { ELiquorCategory } from '../../src/domain/enums/ELiquorCategory';

describe('B2BLeadFormPayloadSchema', () => {
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

  it('debería aceptar un payload válido', () => {
    const resultado = B2BLeadFormPayloadSchema.safeParse(payloadValido);
    expect(resultado.success).toBe(true);
  });

  it('debería rechazar WhatsApp sin código de país', () => {
    const payloadInvalido = { ...payloadValido, whatsapp: '3001234567' };
    const resultado = B2BLeadFormPayloadSchema.safeParse(payloadInvalido);
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar licoresDominantes vacío', () => {
    const payloadInvalido = { ...payloadValido, licoresDominantes: [] };
    const resultado = B2BLeadFormPayloadSchema.safeParse(payloadInvalido);
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar roiEstimadoAlMomentoDelEnvio negativo', () => {
    const payloadInvalido = {
      ...payloadValido,
      roiEstimadoAlMomentoDelEnvio: {
        conosEstimadosPorMes: -10,
        gananciaNetaMensualCOP: -235_000,
      },
    };
    const resultado = B2BLeadFormPayloadSchema.safeParse(payloadInvalido);
    expect(resultado.success).toBe(false);
  });
});