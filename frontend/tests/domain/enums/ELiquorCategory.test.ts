/**
 * tests/domain/enums/ELiquorCategory.test.ts
 *
 * Tests del mapa CONE_LIQUOR_PAIRING — fuente única de verdad
 * para la recomendación de producto en el formulario.
 */
import { describe, it, expect } from 'vitest';
import {
  EConeReference,
  ELiquorCategory,
  CONE_LIQUOR_PAIRING,
} from '../../../src/domain/enums/ELiquorCategory';

describe('CONE_LIQUOR_PAIRING', () => {
  it('debería tener exactamente 5 entradas (los 5 conos)', () => {
    expect(Object.keys(CONE_LIQUOR_PAIRING)).toHaveLength(5);
  });

  it('debería mapear SPICY_VOLCANO a MEZCAL_AGAVE', () => {
    expect(CONE_LIQUOR_PAIRING[EConeReference.SPICY_VOLCANO]).toBe(
      ELiquorCategory.MEZCAL_AGAVE
    );
  });

  it('debería mapear SWEET_SALTY_CARAMEL a BOURBON_WHISKY', () => {
    expect(CONE_LIQUOR_PAIRING[EConeReference.SWEET_SALTY_CARAMEL]).toBe(
      ELiquorCategory.BOURBON_WHISKY
    );
  });

  it('debería mapear HERBAL_CITRUS_BOTANICAL a GIN_BOTANICAL', () => {
    expect(CONE_LIQUOR_PAIRING[EConeReference.HERBAL_CITRUS_BOTANICAL]).toBe(
      ELiquorCategory.GIN_BOTANICAL
    );
  });

  it('debería mapear SMOKED_CHEESE_TRUFFLE a VINOS_ESPUMOSOS', () => {
    expect(CONE_LIQUOR_PAIRING[EConeReference.SMOKED_CHEESE_TRUFFLE]).toBe(
      ELiquorCategory.VINOS_ESPUMOSOS
    );
  });

  it('debería mapear TROPICAL_ANISE_FUSION a RON_TIKI', () => {
    expect(CONE_LIQUOR_PAIRING[EConeReference.TROPICAL_ANISE_FUSION]).toBe(
      ELiquorCategory.RON_TIKI
    );
  });

  it('debería cubrir todas las categorías de licor sin duplicados', () => {
    const valores = Object.values(CONE_LIQUOR_PAIRING);
    const unicos = new Set(valores);
    expect(unicos.size).toBe(valores.length);
  });
});