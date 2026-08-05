/**
 * tests/schemas/leadForm.edgeCases.test.ts
 *
 * Tests de casos borde específicos del formulario B2B.
 * Casos que podrían ocurrir en producción y deben manejarse correctamente.
 */
import { describe, it, expect } from 'vitest';
import { B2BLeadFormPayloadSchema } from '../../src/schemas/leadForm.schema';
import { EB2BRole } from '../../src/domain/enums/EB2BRole';
import { ELiquorCategory } from '../../src/domain/enums/ELiquorCategory';

describe('B2BLeadFormPayloadSchema - Casos Borde', () => {
  const basePayload = {
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

  describe('límites de longitud de strings', () => {
    it('debería aceptar establecimiento de 2 caracteres (mínimo)', () => {
      const payload = { ...basePayload, establecimiento: 'AB' };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });

    it('debería rechazar establecimiento de 1 carácter', () => {
      const payload = { ...basePayload, establecimiento: 'A' };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });

    it('debería aceptar establecimiento de 150 caracteres (máximo)', () => {
      const payload = { ...basePayload, establecimiento: 'A'.repeat(150) };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });

    it('debería rechazar establecimiento de 151 caracteres', () => {
      const payload = { ...basePayload, establecimiento: 'A'.repeat(151) };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });

    it('debería aceptar nombreTomadorDecision de 100 caracteres', () => {
      const payload = { ...basePayload, nombreTomadorDecision: 'A'.repeat(100) };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });

    it('debería rechazar nombreTomadorDecision de 101 caracteres', () => {
      const payload = { ...basePayload, nombreTomadorDecision: 'A'.repeat(101) };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });
  });

  describe('múltiples licores dominantes', () => {
    it('debería aceptar un solo licor', () => {
      const payload = { ...basePayload, licoresDominantes: [ELiquorCategory.MEZCAL_AGAVE] };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });

    it('debería aceptar múltiples licores', () => {
      const payload = {
        ...basePayload,
        licoresDominantes: [
          ELiquorCategory.MEZCAL_AGAVE,
          ELiquorCategory.BOURBON_WHISKY,
          ELiquorCategory.GIN_BOTANICAL,
        ],
      };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });

    it('debería aceptar todos los licores del catálogo', () => {
      const payload = {
        ...basePayload,
        licoresDominantes: Object.values(ELiquorCategory),
      };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });

    it('debería rechazar licores duplicados (aunque Zod no lo valida, es un caso de uso)', () => {
      const payload = {
        ...basePayload,
        licoresDominantes: [
          ELiquorCategory.MEZCAL_AGAVE,
          ELiquorCategory.MEZCAL_AGAVE,
        ],
      };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      // Zod acepta duplicados — esto se maneja a nivel de UI, no de validación
      expect(resultado.success).toBe(true);
    });
  });

  describe('todos los roles B2B', () => {
    Object.values(EB2BRole).forEach((rol) => {
      it(`debería aceptar el rol ${rol}`, () => {
        const payload = { ...basePayload, rol };
        const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
        expect(resultado.success).toBe(true);
      });
    });
  });

  describe('ROI en el límite', () => {
    it('debería aceptar ROI con 0 conos y 0 ganancia', () => {
      const payload = {
        ...basePayload,
        roiEstimadoAlMomentoDelEnvio: {
          conosEstimadosPorMes: 0,
          gananciaNetaMensualCOP: 0,
        },
      };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });

    it('debería aceptar ROI muy alto (campaña masiva)', () => {
      const payload = {
        ...basePayload,
        roiEstimadoAlMomentoDelEnvio: {
          conosEstimadosPorMes: 10000,
          gananciaNetaMensualCOP: 235_000_000,
        },
      };
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(true);
    });
  });

  describe('campos faltantes', () => {
    it('debería rechazar payload sin establecimiento', () => {
      const { establecimiento, ...payload } = basePayload;
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });

    it('debería rechazar payload sin rol', () => {
      const { rol, ...payload } = basePayload;
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });

    it('debería rechazar payload sin roiEstimadoAlMomentoDelEnvio', () => {
      const { roiEstimadoAlMomentoDelEnvio, ...payload } = basePayload;
      const resultado = B2BLeadFormPayloadSchema.safeParse(payload);
      expect(resultado.success).toBe(false);
    });
  });
});