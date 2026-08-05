/**
 * schemas/roi.schema.ts
 */
import { z } from 'zod';

export const ROICalculatorInputSchema = z.object({
  tragosPerFinDeSemana: z.number().min(0).max(2000), // límite superior razonable, previene inputs absurdos
});

export const ROICalculatorOutputSchema = z.object({
  conosEstimadosPorMes: z.number().int().nonnegative(),
  gananciaNetaMensualCOP: z.number().nonnegative(),
});