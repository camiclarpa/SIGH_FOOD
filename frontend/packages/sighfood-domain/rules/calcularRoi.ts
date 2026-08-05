/**
 * ============================================================================
 * CALCULAR ROI — SRP: Responsabilidad Única de Cálculo Financiero
 * ============================================================================
 * 
 * PRINCIPIO SRP (Capítulo 7):
 * ───────────────────────────────────────────────────────────────────────────
 * Uncle Bob es explícito: el SRP no significa "una función hace una cosa" —
 * significa que un módulo debe tener una sola razón para cambiar, atada a un
 * único actor o stakeholder.
 * 
 * Este archivo tiene UNA sola razón para cambiar: si el equipo de Finanzas/
 * Producto de SIGH_FOOD modifica la fórmula de ROI (tasa de conversión,
 * utilidad neta, semanas por mes).
 * 
 * NO cambia por:
 *   • Cambios de diseño visual (responsabilidad de UI)
 *   • Cambios en validación de formularios (responsabilidad comercial)
 *   • Cambios en cómo se envían los datos al CRM (responsabilidad técnica)
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 7: SRP — Principio de Responsabilidad Única
 *   • Capítulo 15: CGI Programs → Serverless Functions
 * 
 * VERIFICACIÓN ARITMÉTICA:
 *   • 100 tragos/fin de semana → 87 conos/mes → $2,044,500 COP
 *   • 0 tragos → 0 conos → $0 COP
 *   • 500 tragos → 433 conos/mes → $10,175,500 COP
 * ============================================================================
 */

export interface ResultadoRoi {
  readonly conosEstimados: number;
  readonly gananciaNetaMensualCOP: number;
}

export function calcularRoiMensual(tragosPorFinDeSemana: number): ResultadoRoi {
  // Constantes de negocio (verificadas contra Playbook de Discovery)
  // Si cambian, SOLO se modifica este archivo — métrica de calidad = 1
  const TASA_CONVERSION = 0.20; // 20% de tragos se convierten en conos
  const UTILIDAD_NETA_COP = 23_500; // Margen neto por cono (73.4% de $32,000)
  const SEMANAS_POR_MES = 4.33; // Promedio anual (52 semanas / 12 meses)

  // Validación de entrada — programación defensiva
  if (tragosPorFinDeSemana < 0) {
    throw new Error('Los tragos por fin de semana no pueden ser negativos');
  }

  // Cálculo — función pura, sin efectos secundarios
  const conosPorFinDeSemana = tragosPorFinDeSemana * TASA_CONVERSION;
  const conosEstimados = Math.round(conosPorFinDeSemana * SEMANAS_POR_MES);
  const gananciaNetaMensualCOP = conosEstimados * UTILIDAD_NETA_COP;

  // Retorno inmutable (Object.freeze) — principio de inmutabilidad
  return Object.freeze({ conosEstimados, gananciaNetaMensualCOP });
}