/**
 * schemas/crmWebhook.schema.ts
 */
import { z } from 'zod';
import { DealStage } from '../domain/crm/DealStage';
import { B2BLeadFormPayloadSchema } from './leadForm.schema';

export const UTMMetadataSchema = z.object({
  utmSource: z.string().nullable(),
  utmMedium: z.string().nullable(),
  utmCampaign: z.string().nullable(),
  referrerUrl: z.string().url().nullable(),
  landingViewedAtISO: z.string().datetime(),
});

export const CRMWebhookPayloadSchema = z.object({
  leadId: z.string().uuid(),
  timestampISO: z.string().datetime(),
  dealStage: z.literal(DealStage.LEAD_NUEVO),
  datosLead: B2BLeadFormPayloadSchema,
  anclajeFinancieroCOP: z.number().nonnegative(),
  utm: UTMMetadataSchema,
  scoreCalificacionInicial: z.number().min(0).max(100).nullable(),
});

// Tipo TypeScript inferido del esquema — nunca se declara por separado
export type CRMWebhookPayloadInferred = z.infer<typeof CRMWebhookPayloadSchema>;