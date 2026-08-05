/**
 * tests/domain/roi/calcularRoi.test.ts
 *
 * Tests de la función pura calcularRoi.
 */
import { describe, it, expect } from 'vitest';
import { calcularRoi } from '../../../src/domain/roi/calcularRoi';

describe('calcularRoi', () => {
  it('debería calcular correctamente el caso de referencia del brief', () => {
    const resultado = calcularRoi({ tragosPerFinDeSemana: 115.5 });
    expect(resultado.conosEstimadosPorMes).toBe(100);
    expect(resultado.gananciaNetaMensualCOP).toBe(2_350_000);
  });

  it('debería retornar 0 para 0 tragos', () => {
    const resultado = calcularRoi({ tragosPerFinDeSemana: 0 });
    expect(resultado.conosEstimadosPorMes).toBe(0);
    expect(resultado.gananciaNetaMensualCOP).toBe(0);
  });

  it('debería ser determinística (mismo input = mismo output)', () => {
    const resultado1 = calcularRoi({ tragosPerFinDeSemana: 50 });
    const resultado2 = calcularRoi({ tragosPerFinDeSemana: 50 });
    expect(resultado1).toEqual(resultado2);
  });
});