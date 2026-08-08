/**
 * domain/roi/calcularRoi.ts
 *
 * Función pura — mismo input siempre produce el mismo output, sin efectos
 * secundarios. Ejecutable tanto en el cliente (slider en tiempo real) como
 * en el backend (para incluir el ROI calculado dentro del payload del
 * Webhook al CRM, Sección 5) — una sola implementación, cero duplicación
 * de la fórmula de negocio entre frontend y backend.
 */
import { ROICalculatorInput } from './ROICalculatorInput';
import { ROICalculatorOutput } from './ROICalculatorOutput';
import { ROIBusinessConstants } from './ROICalculatorConstants';

export function calcularRoi(input: ROICalculatorInput): ROICalculatorOutput {
  // Sin esta guarda un valor negativo produce conos y ganancias negativas, que
  // acabarían viajando en el payload del webhook al CRM como si fueran datos
  // válidos. Misma regla que aplica lib/performance/calculateBarRoi.
  if (input.tragosPerFinDeSemana < 0) {
    throw new Error('Los tragos por fin de semana no pueden ser negativos');
  }

  const conosEstimadosPorMes = Math.round(
    input.tragosPerFinDeSemana * ROIBusinessConstants.CONVERSION_RATE * ROIBusinessConstants.WEEKS_PER_MONTH
  );
  const gananciaNetaMensualCOP = conosEstimadosPorMes * ROIBusinessConstants.NET_PROFIT_PER_CONE_COP;
  return Object.freeze({ conosEstimadosPorMes, gananciaNetaMensualCOP });
}

// Verificación de referencia (documentada, no ejecutable en producción):
// calcularRoi({ tragosPerFinDeSemana: 115.5 }) → { conosEstimadosPorMes: 100, gananciaNetaMensualCOP: 2_350_000 }
// Coincide exactamente con el ejemplo de negocio del brief ("100 conos/mes = $2,350,000 COP")