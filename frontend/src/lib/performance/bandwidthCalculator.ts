/**
 * ============================================================================
 * BANDWIDTH CALCULATOR — Fórmula de Killelea (RFC-HPBN, Capítulo 2)
 * ============================================================================
 * 
 * FUNCIÓN: Calcular el bandwidth requerido para el landing de SIGH_FOOD
 * basado en la fórmula de capacity planning de Killelea.
 * 
 * FÓRMULA ORIGINAL (Cap. 2, verificada textualmente):
 * ──────────────────────────────────────────────────────────────────────────
 * Para un sitio con N hits/día y tamaño promedio de página P bytes:
 *   bandwidth (bits/s) = (N ÷ 86,400) × P × 8 × 1.3
 * 
 * Donde 1.3 es el factor de overhead de red (TCP/IP, headers HTTP, etc.)
 * 
 * ESCENARIOS DE VOLUMEN (RFC-HPBN, Sección 2.2):
 *   • Low Volume (MVP): 200 visitas/día → ~0.036 Mbit/s
 *   • Medium Volume (regional): 3,000 visitas/día → ~0.54 Mbit/s
 *   • High Volume (campaña): 50,000 visitas/día → ~9.03 Mbit/s
 * 
 * NOTA SOBRE PICOS (Cap. 2, Sección 2.3):
 *   Killelea advierte que la carga real nunca se distribuye uniformemente.
 *   Los picos de tráfico durante eventos específicos pueden ser de 3 a 5
 *   veces el promedio. Para el escenario High Volume:
 *   • Promedio: 9.03 Mbit/s
 *   • Pico (5×): 45.1 Mbit/s
 * 
 * TRADUCCIÓN A 2026 (RFC-HPBN, Sección 2.2):
 *   En 1998, dimensionar para el pico significaba comprar hardware dedicado.
 *   En 2026, con arquitectura Serverless/Edge, este cálculo se convierte en
 *   un ejercicio de presupuesto de facturación — el proveedor Edge escala
 *   automáticamente, pero el equipo debe conocer estas cifras para no
 *   recibir una factura sorpresiva.
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 2: Capacity Planning
 *   • Principio 5.1.15: Internet Performance Degrades Nonlinearly
 *   • Principio 5.1.14: Bits Are Cost
 * ============================================================================
 */

export interface BandwidthScenario {
  name: string;
  visitasPorDia: number;
  pesoPaginaBytes: number;
  bandwidthPromedioMbit: number;
  bandwidthPicoMbit: number; // Pico 5× sobre promedio
}

export function calculateBandwidth(
  visitasPorDia: number,
  pesoPaginaBytes: number = 1_500_000 // 1.5 MB objetivo de SIGH_FOOD
): BandwidthScenario {
  // Fórmula de Killelea con factor de overhead 1.3
  const hitsPorSegundo = visitasPorDia / 86_400;
  const bitsPorSegundo = hitsPorSegundo * pesoPaginaBytes * 8 * 1.3;
  const mbitPorSegundo = bitsPorSegundo / 1_000_000;
  
  // Pico de 5× sobre promedio (Killelea, Sección 2.3)
  const picoMbitPorSegundo = mbitPorSegundo * 5;

  return {
    name: getScenarioName(visitasPorDia),
    visitasPorDia,
    pesoPaginaBytes,
    bandwidthPromedioMbit: Math.round(mbitPorSegundo * 1000) / 1000,
    bandwidthPicoMbit: Math.round(picoMbitPorSegundo * 1000) / 1000,
  };
}

function getScenarioName(visitas: number): string {
  if (visitas <= 500) return 'Low Volume (MVP)';
  if (visitas <= 5000) return 'Medium Volume (Regional)';
  return 'High Volume (Campaña)';
}

// Escenarios predefinidos para SIGH_FOOD
export const SIGH_FOOD_SCENARIOS = {
  low: calculateBandwidth(200),      // ~0.036 Mbit/s
  medium: calculateBandwidth(3000),  // ~0.54 Mbit/s
  high: calculateBandwidth(50000),   // ~9.03 Mbit/s (pico: ~45.1 Mbit/s)
};

// Verificación aritmética:
// Low: (200 ÷ 86,400) × 1,500,000 × 8 × 1.3 ≈ 36,111 bits/s ≈ 0.036 Mbit/s
// Medium: (3,000  86,400) × 1,500,000 × 8 × 1.3 ≈ 541,667 bits/s ≈ 0.54 Mbit/s
// High: (50,000  86,400) × 1,500,000 × 8 × 1.3 ≈ 9,027,778 bits/s ≈ 9.03 Mbit/s