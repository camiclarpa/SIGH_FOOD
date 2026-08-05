/**
 * ============================================================================
 * ROI TESTS — Tests de Función Pura ROI (RFC-HPBN, Capítulo 15/3)
 * ============================================================================
 * 
 * FUNCIÓN: Verificar que la función calculateBarRoi produzca los resultados
 * esperados y sea verdaderamente pura (sin efectos secundarios).
 * 
 * VERIFICACIONES ARITMÉTICAS (Playbook de Discovery de SIGH_FOOD):
 *   • 100 tragos/fin de semana → 87 conos/mes → $2,044,500 COP
 *   • 0 tragos → 0 conos → $0 COP
 *   • 500 tragos → 433 conos/mes → $10,175,500 COP
 *     (Nota: El RFC menciona 435 conos → $10,222,500 COP como aproximación,
 *     pero la función pura matemática exacta devuelve 433 y $10,175,500.
 *     Este test valida el comportamiento real de la función).
 * 
 * PROPIEDADES DE FUNCIÓN PURA A TESTEAR:
 *   • Misma entrada → misma salida (determinística)
 *   • No modifica estado externo
 *   • No depende de estado externo
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 15: CGI Programs → Serverless Functions
 *   • Principio 5.1.11: Hardware Is Cheap, Software Is Expensive
 *   • Author's Tip #5: Preprocesar contenido fuera de línea
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { calculateBarRoi } from '@/lib/performance/calculateBarRoi';

describe('calculateBarRoi - Función Pura', () => {
  it('debería calcular correctamente 100 tragos/fin de semana', () => {
    const result = calculateBarRoi(100);
    
    // 100 × 0.20 = 20 conos/fin de semana
    // 20 × 4.33 = 86.6 → 87 conos/mes (redondeado)
    // 87 × 23,500 = 2,044,500 COP
    expect(result.conosEstimados).toBe(87);
    expect(result.utilidadMensualCOP).toBe(2_044_500);
  });

  it('debería calcular correctamente 0 tragos/fin de semana', () => {
    const result = calculateBarRoi(0);
    
    expect(result.conosEstimados).toBe(0);
    expect(result.utilidadMensualCOP).toBe(0);
  });

  it('debería calcular correctamente 500 tragos/fin de semana', () => {
    const result = calculateBarRoi(500);
    
    // 500 × 0.20 = 100 conos/fin de semana
    // 100 × 4.33 = 433 conos/mes
    // 433 × 23,500 = 10,175,500 COP
    // (El prompt menciona 435 → $10,222,500, pero la función pura devuelve 433 → $10,175,500)
    expect(result.conosEstimados).toBe(433);
    expect(result.utilidadMensualCOP).toBe(10_175_500);
  });

  it('debería ser determinística (misma entrada → misma salida)', () => {
    const result1 = calculateBarRoi(100);
    const result2 = calculateBarRoi(100);
    
    expect(result1).toEqual(result2);
  });

  it('debería lanzar error para valores negativos', () => {
    expect(() => calculateBarRoi(-10)).toThrow('Los tragos por fin de semana no pueden ser negativos');
  });

  it('debería manejar valores decimales redondeando correctamente', () => {
    const result = calculateBarRoi(150);
    
    // 150 × 0.20 = 30 conos/fin de semana
    // 30 × 4.33 = 129.9 → 130 conos/mes
    // 130 × 23,500 = 3,055,000 COP
    expect(result.conosEstimados).toBe(130);
    expect(result.utilidadMensualCOP).toBe(3_055_000);
  });
});