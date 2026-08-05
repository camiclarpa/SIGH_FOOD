/**
 * domain/roi/ROICalculatorOutput.ts
 *
 * Resultado calculado en tiempo real — se recalcula en cada movimiento del
 * slider. Es el momento de "Revelación Financiera" (Etapa 3 del viaje de
 * conversión) — este objeto es lo que se renderiza como la cifra grande
 * y destacada frente al usuario.
 */
export interface ROICalculatorOutput {
  /** Conos estimados vendidos al mes, redondeado al entero más cercano */
  conosEstimadosPorMes: number;
  /** Ganancia neta mensual proyectada, en COP — el "Anclaje Financiero" central de la página */
  gananciaNetaMensualCOP: number;
}