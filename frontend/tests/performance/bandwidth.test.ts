/**
 * ============================================================================
 * BANDWIDTH TESTS — Tests de Fórmula de Killelea (RFC-HPBN, Capítulo 2/3)
 * ============================================================================
 * 
 * FUNCIÓN: Verificar que la fórmula de capacity planning de Killelea
 * produzca los resultados esperados para los 3 escenarios de volumen.
 * 
 * FÓRMULA VERIFICADA (Cap. 2):
 *   bandwidth (bits/s) = (visitas/día ÷ 86,400) × peso_bytes × 8 × 1.3
 * 
 * ESCENARIOS A TESTEAR:
 *   • Low Volume: 200 visitas/día → ~0.036 Mbit/s
 *   • Medium Volume: 3,000 visitas/día → ~0.54 Mbit/s
 *   • High Volume: 50,000 visitas/día → ~9.03 Mbit/s
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 2: Capacity Planning
 *   • Capítulo 3: Web Performance Measurement
 *   • Principio 5.1.2: To Measure Something Is to Change It
 * ============================================================================
 */

import { describe, it, expect } from 'vitest';
import { calculateBandwidth, SIGH_FOOD_SCENARIOS } from '@/lib/performance/bandwidthCalculator';

describe('Bandwidth Calculator - Fórmula de Killelea', () => {
  it('debería calcular correctamente el escenario Low Volume (200 visitas/día)', () => {
    const result = calculateBandwidth(200);
    
    expect(result.name).toBe('Low Volume (MVP)');
    expect(result.visitasPorDia).toBe(200);
    expect(result.bandwidthPromedioMbit).toBeCloseTo(0.036, 2);
    expect(result.bandwidthPicoMbit).toBeCloseTo(0.18, 2); // 5× sobre promedio
  });

  it('debería calcular correctamente el escenario Medium Volume (3,000 visitas/día)', () => {
    const result = calculateBandwidth(3000);
    
    expect(result.name).toBe('Medium Volume (Regional)');
    expect(result.visitasPorDia).toBe(3000);
    expect(result.bandwidthPromedioMbit).toBeCloseTo(0.54, 2);
    expect(result.bandwidthPicoMbit).toBeCloseTo(2.7, 1);
  });

  it('debería calcular correctamente el escenario High Volume (50,000 visitas/día)', () => {
    const result = calculateBandwidth(50000);
    
    expect(result.name).toBe('High Volume (Campaña)');
    expect(result.visitasPorDia).toBe(50000);
    expect(result.bandwidthPromedioMbit).toBeCloseTo(9.03, 2);
    expect(result.bandwidthPicoMbit).toBeCloseTo(45.1, 1);
  });

  it('debería usar el peso de página por defecto de 1.5MB', () => {
    const result = calculateBandwidth(1000);
    expect(result.pesoPaginaBytes).toBe(1_500_000);
  });

  it('debería permitir personalizar el peso de página', () => {
    const result = calculateBandwidth(1000, 2_000_000); // 2MB
    expect(result.pesoPaginaBytes).toBe(2_000_000);
    
    // Con 2MB, el bandwidth debería ser mayor que con 1.5MB
    const resultDefault = calculateBandwidth(1000, 1_500_000);
    expect(result.bandwidthPromedioMbit).toBeGreaterThan(resultDefault.bandwidthPromedioMbit);
  });

  it('debería tener los 3 escenarios predefinidos de SIGH_FOOD', () => {
    expect(SIGH_FOOD_SCENARIOS.low.bandwidthPromedioMbit).toBeCloseTo(0.036, 2);
    expect(SIGH_FOOD_SCENARIOS.medium.bandwidthPromedioMbit).toBeCloseTo(0.54, 2);
    expect(SIGH_FOOD_SCENARIOS.high.bandwidthPromedioMbit).toBeCloseTo(9.03, 2);
  });
});