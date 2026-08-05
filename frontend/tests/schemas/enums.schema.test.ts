/**
 * tests/schemas/enums.schema.test.ts
 *
 * Tests de los esquemas de enums nativos de Zod.
 */
import { describe, it, expect } from 'vitest';
import {
  EB2BRoleSchema,
  EConeReferenceSchema,
  ELiquorCategorySchema,
} from '../../src/schemas/enums.schema';
import { EB2BRole } from '../../src/domain/enums/EB2BRole';
import { EConeReference } from '../../src/domain/enums/EConeReference';
import { ELiquorCategory } from '../../src/domain/enums/ELiquorCategory';

describe('EB2BRoleSchema', () => {
  it('debería aceptar todos los valores del enum', () => {
    Object.values(EB2BRole).forEach((rol) => {
      const resultado = EB2BRoleSchema.safeParse(rol);
      expect(resultado.success).toBe(true);
    });
  });

  it('debería rechazar un string no válido', () => {
    const resultado = EB2BRoleSchema.safeParse('CHEF');
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar undefined', () => {
    const resultado = EB2BRoleSchema.safeParse(undefined);
    expect(resultado.success).toBe(false);
  });
});

describe('EConeReferenceSchema', () => {
  it('debería aceptar todos los conos del portafolio', () => {
    Object.values(EConeReference).forEach((cono) => {
      const resultado = EConeReferenceSchema.safeParse(cono);
      expect(resultado.success).toBe(true);
    });
  });

  it('debería rechazar un cono inexistente', () => {
    const resultado = EConeReferenceSchema.safeParse('PIZZA_CONE');
    expect(resultado.success).toBe(false);
  });
});

describe('ELiquorCategorySchema', () => {
  it('debería aceptar todas las categorías de licor', () => {
    Object.values(ELiquorCategory).forEach((licor) => {
      const resultado = ELiquorCategorySchema.safeParse(licor);
      expect(resultado.success).toBe(true);
    });
  });

  it('debería rechazar una categoría inexistente', () => {
    const resultado = ELiquorCategorySchema.safeParse('VODKA');
    expect(resultado.success).toBe(false);
  });
});