/**
 * domain/roi/ROICalculatorConstants.ts
 *
 * Namespace de constantes de negocio — ÚNICA fuente de verdad de la fórmula
 * de ROI. Ningún componente de UI debe hardcodear estos valores (ver RFC
 * Clean Architecture, Capítulo 6: la fórmula vive en el dominio, no en el
 * componente de React que la muestra).
 */
export const ROIBusinessConstants = {
  /** Tasa de conversión de tragos servidos a conos vendidos — validada con datos de piloto */
  CONVERSION_RATE: 0.20,
  /** Utilidad neta para el bar por cada cono vendido, en pesos colombianos (COP) */
  NET_PROFIT_PER_CONE_COP: 23_500,
  /** Semanas promedio por mes, usado para proyectar de tragos/semana a ganancia mensual */
  WEEKS_PER_MONTH: 4.33,
} as const;