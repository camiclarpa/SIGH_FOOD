/**
 * api/v1/leads/phygital-demo-request/contract.ts
 *
 * Contrato REST completo del endpoint de captura de Leads. Ejecuta en Edge
 * Runtime (ver RFC-001, Sección 3.2) — responde 202 Accepted antes de que
 * el Webhook al CRM se procese, nunca bloquea al usuario esperando al CRM.
 */
import { z } from 'zod';
import { B2BLeadFormPayloadSchema } from '@/schemas/leadForm.schema';

// ── REQUEST ─────────────────────────────────────────────
export interface PhygitalDemoRequestHeaders {
  'Content-Type': 'application/json';
  'X-Idempotency-Key'?: string;
}

export type PhygitalDemoRequestBody = z.infer<typeof B2BLeadFormPayloadSchema>;

// ── RESPONSE (ÉXITO) ────────────────────────────────────
export interface PhygitalDemoRequestSuccessResponse {
  status: 'queued';
  leadId: string;
  mensaje: string;
}

// ── RESPONSE (ERROR) ─────────────────────────────────────
export interface PhygitalDemoRequestErrorResponse {
  status: 'error';
  codigo: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
  errores: Array<{ campo: string; mensaje: string }>;
}

// ── FIRMA COMPLETA DEL HANDLER ──────────────────────────
export type PhygitalDemoRequestHandler = (
  headers: PhygitalDemoRequestHeaders,
  body: PhygitalDemoRequestBody
) => Promise<
  | { httpStatus: 202; response: PhygitalDemoRequestSuccessResponse }
  | { httpStatus: 400; response: PhygitalDemoRequestErrorResponse }
  | { httpStatus: 429; response: PhygitalDemoRequestErrorResponse }
  | { httpStatus: 500; response: PhygitalDemoRequestErrorResponse }
>;