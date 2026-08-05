/**
 * tests/schemas/roi.schema.test.ts
 *
 * Tests de los esquemas de entrada/salida de ROI.
 */
import { describe, it, expect } from 'vitest';
import {
  ROICalculatorInputSchema,
  ROICalculatorOutputSchema,
} from '../../src/schemas/roi.schema';

describe('ROICalculatorInputSchema', () => {
  it('debería aceptar un valor válido', () => {
    const resultado = ROICalculatorInputSchema.safeParse({ tragosPerFinDeSemana: 100 });
    expect(resultado.success).toBe(true);
  });

  it('debería aceptar 0 tragos', () => {
    const resultado = ROICalculatorInputSchema.safeParse({ tragosPerFinDeSemana: 0 });
    expect(resultado.success).toBe(true);
  });

  it('debería aceptar el máximo (2000)', () => {
    const resultado = ROICalculatorInputSchema.safeParse({ tragosPerFinDeSemana: 2000 });
    expect(resultado.success).toBe(true);
  });

  it('debería rechazar valores negativos', () => {
    const resultado = ROICalculatorInputSchema.safeParse({ tragosPerFinDeSemana: -10 });
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar valores mayores a 2000', () => {
    const resultado = ROICalculatorInputSchema.safeParse({ tragosPerFinDeSemana: 2001 });
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar valores no numéricos', () => {
    const resultado = ROICalculatorInputSchema.safeParse({ tragosPerFinDeSemana: 'cien' });
    expect(resultado.success).toBe(false);
  });
});

describe('ROICalculatorOutputSchema', () => {
  it('debería aceptar un output válido', () => {
    const resultado = ROICalculatorOutputSchema.safeParse({
      conosEstimadosPorMes: 100,
      gananciaNetaMensualCOP: 2_350_000,
    });
    expect(resultado.success).toBe(true);
  });

  it('debería aceptar ceros', () => {
    const resultado = ROICalculatorOutputSchema.safeParse({
      conosEstimadosPorMes: 0,
      gananciaNetaMensualCOP: 0,
    });
    expect(resultado.success).toBe(true);
  });

  it('debería rechazar conosEstimadosPorMes no entero', () => {
    const resultado = ROICalculatorOutputSchema.safeParse({
      conosEstimadosPorMes: 100.5,
      gananciaNetaMensualCOP: 2_350_000,
    });
    expect(resultado.success).toBe(false);
  });

  it('debería rechazar gananciaNetaMensualCOP negativa', () => {
    const resultado = ROICalculatorOutputSchema.safeParse({
      conosEstimadosPorMes: 100,
      gananciaNetaMensualCOP: -100,
    });
    expect(resultado.success).toBe(false);
  });
});