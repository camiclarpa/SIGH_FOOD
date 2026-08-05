import { describe, it, expect } from 'vitest';
import { calculateROI, formatCOP } from './roiCalculator';

describe('Calculadora de ROI SIGH_FOOD', () => {
  it('debe calcular correctamente la ganancia mensual para 100 tragos por fin de semana', () => {
    // 100 tragos * 2 días = 200/semana -> 800/mes -> 20% conversión = 160 conos
    // 160 conos * $23,500 = $3,760,000
    const result = calculateROI({ tragosPorFinDeSemana: 100 });
    
    expect(result.conosPorMes).toBe(160);
    expect(result.gananciaMensual).toBe(3760000);
  });

  it('debe retornar 0 si el volumen es 0', () => {
    const result = calculateROI({ tragosPorFinDeSemana: 0 });
    expect(result.gananciaMensual).toBe(0);
  });

  it('debe lanzar un error si el volumen es negativo', () => {
    expect(() => calculateROI({ tragosPorFinDeSemana: -1 })).toThrow();
  });

  it('debe formatear correctamente la moneda en pesos colombianos (COP)', () => {
    const formatted = formatCOP(2350000);
    expect(formatted).toContain("2.350.000");
  });
});
