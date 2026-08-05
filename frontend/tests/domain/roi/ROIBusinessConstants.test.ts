/**
 * tests/domain/roi/ROIBusinessConstants.test.ts
 *
 * Tests de las constantes de negocio — verifican que los valores
 * no hayan sido alterados accidentalmente.
 */
import { describe, it, expect } from 'vitest';
import { ROIBusinessConstants } from '../../../src/domain/roi/ROICalculatorConstants';

describe('ROIBusinessConstants', () => {
  it('debería tener CONVERSION_RATE = 0.20', () => {
    expect(ROIBusinessConstants.CONVERSION_RATE).toBe(0.20);
  });

  it('debería tener NET_PROFIT_PER_CONE_COP = 23500', () => {
    expect(ROIBusinessConstants.NET_PROFIT_PER_CONE_COP).toBe(23_500);
  });

  it('debería tener WEEKS_PER_MONTH = 4.33', () => {
    expect(ROIBusinessConstants.WEEKS_PER_MONTH).toBe(4.33);
  });

  it('debería producir el caso de referencia del brief (115.5 tragos → 100 conos)', () => {
    const conosEstimados = Math.round(
      115.5 * ROIBusinessConstants.CONVERSION_RATE * ROIBusinessConstants.WEEKS_PER_MONTH
    );
    const ganancia = conosEstimados * ROIBusinessConstants.NET_PROFIT_PER_CONE_COP;

    expect(conosEstimados).toBe(100);
    expect(ganancia).toBe(2_350_000);
  });
});