/**
 * schemas/leadForm.schema.ts
 *
 * Esquema completo del formulario — se ejecuta tanto en el cliente (para
 * feedback inmediato al usuario antes de enviar) como en la Edge Function
 * (nunca confiar exclusivamente en la validación del cliente).
 */
import { z } from 'zod';
import { EB2BRoleSchema, ELiquorCategorySchema } from './enums.schema';
import { WhatsAppE164Schema } from './whatsapp.schema';
import { ROICalculatorOutputSchema } from './roi.schema';

export const B2BLeadFormPayloadSchema = z.object({
  establecimiento: z.string().min(2, 'El nombre del establecimiento es obligatorio').max(150),
  nombreTomadorDecision: z.string().min(2).max(100),
  rol: EB2BRoleSchema,
  whatsapp: WhatsAppE164Schema,
  licoresDominantes: z.array(ELiquorCategorySchema).min(1, 'Seleccione al menos un licor dominante'),
  roiEstimadoAlMomentoDelEnvio: ROICalculatorOutputSchema,
});

// Tipo TypeScript inferido del esquema — nunca se declara por separado
export type B2BLeadFormPayloadInferred = z.infer<typeof B2BLeadFormPayloadSchema>;