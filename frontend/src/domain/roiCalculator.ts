// src/domain/roiCalculator.ts

export const ROI_CONSTANTS = {
  COSTO_B2B: 8500,
  PRECIO_VENTA: 32000,
  UTILIDAD_NETA: 23500,
  TASA_CONVERSION: 0.20, // 20% de conversión de tragos a conos
  SEMANAS_POR_MES: 4,
  DIAS_FIN_DE_SEMANA: 2, // Viernes y Sábado
} as const;

export interface ROICalculatorInput {
  tragosPorFinDeSemana: number;
}

export interface ROICalculatorOutput {
  conosPorMes: number;
  gananciaSemanal: number;
  gananciaMensual: number;
  gananciaAnual: number;
}

/**
 * Función PURA: Calcula el ROI basado en los tragos vendidos por fin de semana.
 * No tiene dependencias de UI, ni de red, ni de frameworks.
 */
export function calculateROI(input: ROICalculatorInput): ROICalculatorOutput {
  if (input.tragosPorFinDeSemana < 0) {
    throw new Error("El número de tragos no puede ser negativo");
  }

  const { tragosPorFinDeSemana } = input;
  const { UTILIDAD_NETA, SEMANAS_POR_MES, TASA_CONVERSION, DIAS_FIN_DE_SEMANA } = ROI_CONSTANTS;

  const tragosPorSemana = tragosPorFinDeSemana * DIAS_FIN_DE_SEMANA;
  const conosPorMes = Math.floor(tragosPorSemana * SEMANAS_POR_MES * TASA_CONVERSION);

  return {
    conosPorMes,
    gananciaSemanal: tragosPorSemana * UTILIDAD_NETA * TASA_CONVERSION,
    gananciaMensual: conosPorMes * UTILIDAD_NETA,
    gananciaAnual: conosPorMes * UTILIDAD_NETA * 12,
  };
}

/**
 * Formatea números a Pesos Colombianos (COP)
 */
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}