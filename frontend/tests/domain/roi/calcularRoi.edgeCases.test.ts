/**
 * tests/domain/roi/calcularRoi.edgeCases.test.ts
 *
 * Tests de casos borde adicionales para la función pura calcularRoi.
 * Complementa los tests básicos de la Fase 1.
 */
import { describe, it, expect } from 'vitest';
import { calcularRoi } from '../../../src/domain/roi/calcularRoi';

describe('calcularRoi - Casos Borde', () => {
  describe('valores límite del slider', () => {
    it('debería manejar 0 tragos (mínimo del slider)', () => {
      const resultado = calcularRoi({ tragosPerFinDeSemana: 0 });
      expect(resultado.conosEstimadosPorMes).toBe(0);
      expect(resultado.gananciaNetaMensualCOP).toBe(0);
    });

    it('debería manejar 10 tragos (mínimo práctico)', () => {
      const resultado = calcularRoi({ tragosPerFinDeSemana: 10 });
      // 10 * 0.20 * 4.33 = 8.66 → 9 conos
      // 9 * 23,500 = 211,500
      expect(resultado.conosEstimadosPorMes).toBe(9);
      expect(resultado.gananciaNetaMensualCOP).toBe(211_500);
    });

    it('debería manejar 1000 tragos (máximo del slider)', () => {
      const resultado = calcularRoi({ tragosPerFinDeSemana: 1000 });
      // 1000 * 0.20 * 4.33 = 866 conos
      // 866 * 23,500 = 20,351,000
      expect(resultado.conosEstimadosPorMes).toBe(866);
      expect(resultado.gananciaNetaMensualCOP).toBe(20_351_000);
    });
  });

  describe('valores decimales', () => {
    it('debería manejar 115.5 tragos (caso de referencia del brief)', () => {
      const resultado = calcularRoi({ tragosPerFinDeSemana: 115.5 });
      expect(resultado.conosEstimadosPorMes).toBe(100);
      expect(resultado.gananciaNetaMensualCOP).toBe(2_350_000);
    });

    it('debería manejar 50.5 tragos', () => {
      const resultado = calcularRoi({ tragosPerFinDeSemana: 50.5 });
      // 50.5 * 0.20 * 4.33 = 43.733 → 44 conos
      // 44 * 23,500 = 1,034,000
      expect(resultado.conosEstimadosPorMes).toBe(44);
      expect(resultado.gananciaNetaMensualCOP).toBe(1_034_000);
    });
  });

  describe('propiedades de función pura', () => {
    it('debería ser determinística: misma entrada = misma salida', () => {
      const r1 = calcularRoi({ tragosPerFinDeSemana: 100 });
      const r2 = calcularRoi({ tragosPerFinDeSemana: 100 });
      expect(r1).toEqual(r2);
    });

    it('debería retornar un objeto congelado (inmutable)', () => {
      const resultado = calcularRoi({ tragosPerFinDeSemana: 100 });
      expect(Object.isFrozen(resultado)).toBe(true);
    });

    it('debería ser idempotente: llamarla N veces produce el mismo resultado', () => {
      const resultados = Array.from({ length: 100 }, () =>
        calcularRoi({ tragosPerFinDeSemana: 75 })
      );
      const primero = resultados[0];
      resultados.forEach((r) => {
        expect(r).toEqual(primero);
      });
    });
  });

  describe('valores negativos (deberían lanzar error)', () => {
    it('debería lanzar error para -1', () => {
      expect(() => calcularRoi({ tragosPerFinDeSemana: -1 })).toThrow();
    });

    it('debería lanzar error para -100', () => {
      expect(() => calcularRoi({ tragosPerFinDeSemana: -100 })).toThrow();
    });
  });

  describe('monotonicidad', () => {
    it('debería producir más conos para más tragos', () => {
      const r1 = calcularRoi({ tragosPerFinDeSemana: 50 });
      const r2 = calcularRoi({ tragosPerFinDeSemana: 100 });
      const r3 = calcularRoi({ tragosPerFinDeSemana: 200 });

      expect(r1.conosEstimadosPorMes).toBeLessThan(r2.conosEstimadosPorMes);
      expect(r2.conosEstimadosPorMes).toBeLessThan(r3.conosEstimadosPorMes);
    });

    it('debería producir más ganancia para más conos', () => {
      const r1 = calcularRoi({ tragosPerFinDeSemana: 50 });
      const r2 = calcularRoi({ tragosPerFinDeSemana: 100 });

      expect(r1.gananciaNetaMensualCOP).toBeLessThan(r2.gananciaNetaMensualCOP);
    });
  });
});