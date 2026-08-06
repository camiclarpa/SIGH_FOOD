import { z } from 'zod';

// Schema para webhook/events
export const WebhookEventSchema = z.object({
  type: z.enum(['user.created', 'user.updated', 'user.deleted']),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string().datetime(),
  signature: z.string(),
});

// Schema para SQS message
export const SQSMessageSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string(),
  receiptHandle: z.string(),
  attributes: z.object({
    ApproximateReceiveCount: z.string(),
    SentTimestamp: z.string(),
  }),
  messageAttributes: z.record(z.string(), z.unknown()).optional(),
});

// Schema para Redis operation
export const RedisOperationSchema = z.object({
  key: z.string().max(256),
  value: z.string(),
  ttl: z.number().int().positive().optional(),
  operation: z.enum(['set', 'get', 'delete', 'expire']),
});

// Schema para métricas
export const MetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  timestamp: z.string().datetime(),
  tags: z.record(z.string(), z.string()).optional(),
  unit: z.enum(['count', 'milliseconds', 'bytes']).optional(),
});

// ============================================================================
// NUEVO: Schema para Lead B2B de SIGH_FOOD
// ============================================================================
export const LeadSchema = z.object({
  establishmentName: z.string().min(2).max(100),
  decisionMaker: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Teléfono inválido'),
  topLiquors: z.string().min(3).max(200),
  estimatedWeeklyVolume: z.number().int().positive().max(10000),
});

export type Lead = z.infer<typeof LeadSchema>;

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type SQSMessage = z.infer<typeof SQSMessageSchema>;
export type RedisOperation = z.infer<typeof RedisOperationSchema>;
export type Metric = z.infer<typeof MetricSchema>;