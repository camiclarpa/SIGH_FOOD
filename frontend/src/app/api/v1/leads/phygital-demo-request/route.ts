/**
 * api/v1/leads/phygital-demo-request/route.ts
 *
 * Implementación Edge Runtime del handler de captura de Leads.
 * Alineado con RFC-001 (cola Upstash Redis), RFC-DDIA (patrón outbox, idempotencia),
 * RFC-HPBN (Edge Runtime), y Clean Architecture (función pura calcularRoi).
 */
// Runtime Node.js: el adaptador de Cloudflare Workers no soporta 'edge'.
// El Worker igual se ejecuta en el edge, cerca del usuario.

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { B2BLeadFormPayloadSchema } from '@/schemas/leadForm.schema';
import { CRMWebhookPayloadSchema } from '@/schemas/crmWebhook.schema';
import { DealStage } from '@/domain/crm/DealStage';

const redis = Redis.fromEnv();
const IDEMPOTENCY_TTL_SECONDS = 86400;
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

export async function POST(request: Request): Promise<NextResponse> {
  const startTime = performance.now();

  try {
    // 1. Leer body JSON
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          status: 'error',
          codigo: 'VALIDATION_ERROR',
          errores: [{ campo: 'body', mensaje: 'El body debe ser JSON válido' }],
        },
        { status: 400 }
      );
    }

    // 2. Validar con Zod
    const validacion = B2BLeadFormPayloadSchema.safeParse(body);

    if (!validacion.success) {
      const errores = validacion.error.issues.map((issue) => ({
        campo: issue.path.join('.') || 'root',
        mensaje: issue.message,
      }));

      return NextResponse.json(
        {
          status: 'error',
          codigo: 'VALIDATION_ERROR',
          errores,
        },
        { status: 400 }
      );
    }

    // 3. Protección CEP contra spam (rate limiting)
    const fingerprint = request.headers.get('x-client-fingerprint') ?? 'unknown';
    const rateLimitKey = `rate-limit:${fingerprint}`;
    const recentRequests = await redis.lrange(rateLimitKey, 0, RATE_LIMIT_MAX_REQUESTS);

    if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        {
          status: 'error',
          codigo: 'RATE_LIMITED',
          errores: [
            {
              campo: 'rate-limit',
              mensaje: 'Demasiados intentos. Por favor, inténtalo en unos minutos.',
            },
          ],
        },
        { status: 429 }
      );
    }

    await redis.lpush(rateLimitKey, Date.now().toString());
    await redis.expire(rateLimitKey, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));

    // 4. Generar leadId (UUID v4) y construir payload del Webhook
    const leadId = crypto.randomUUID();
    const timestampISO = new Date().toISOString();

    const webhookPayload = {
      leadId,
      timestampISO,
      dealStage: DealStage.LEAD_NUEVO as const,
      datosLead: validacion.data,
      anclajeFinancieroCOP: validacion.data.roiEstimadoAlMomentoDelEnvio.gananciaNetaMensualCOP,
      utm: {
        utmSource: request.headers.get('x-utm-source') ?? null,
        utmMedium: request.headers.get('x-utm-medium') ?? null,
        utmCampaign: request.headers.get('x-utm-campaign') ?? null,
        referrerUrl: request.headers.get('x-referrer-url') ?? null,
        landingViewedAtISO: request.headers.get('x-landing-viewed-at') ?? timestampISO,
      },
      scoreCalificacionInicial: null,
    };

    // Validar el payload del Webhook contra su esquema Zod
    const webhookValidation = CRMWebhookPayloadSchema.safeParse(webhookPayload);
    if (!webhookValidation.success) {
      console.error('[route.ts] Webhook payload validation failed:', webhookValidation.error);
      return NextResponse.json(
        {
          status: 'error',
          codigo: 'INTERNAL_ERROR',
          errores: [{ campo: 'webhook-payload', mensaje: 'Error interno al construir el payload' }],
        },
        { status: 500 }
      );
    }

    // 5. LPUSH a Upstash Redis (patrón outbox - RFC-DDIA)
    const queueKey = 'lead-events-log';
    const idempotencyKey = `lead:${leadId}`;

    const alreadyExists = await redis.get(idempotencyKey);
    if (alreadyExists) {
      return NextResponse.json(
        {
          status: 'queued',
          leadId,
          mensaje: 'Su solicitud fue recibida. Un asesor de SIGH_FOOD se pondrá en contacto por WhatsApp para agendar la Demo Phygital.',
        },
        { status: 202 }
      );
    }

    await redis.set(idempotencyKey, '1', { ex: IDEMPOTENCY_TTL_SECONDS });
    await redis.lpush(queueKey, JSON.stringify(webhookPayload));

    // 6. Retornar 202 Accepted
    const latency = Math.round(performance.now() - startTime);

    return NextResponse.json(
      {
        status: 'queued',
        leadId,
        mensaje: 'Su solicitud fue recibida. Un asesor de SIGH_FOOD se pondrá en contacto por WhatsApp para agendar la Demo Phygital.',
        _meta: { latency_ms: latency },
      },
      {
        status: 202,
        headers: {
          'X-Request-Id': leadId,
          'X-Processing-Time-Ms': latency.toString(),
        },
      }
    );
  } catch (error) {
    const latency = Math.round(performance.now() - startTime);
    console.error('[route.ts] Internal error:', error, { latency_ms: latency });

    return NextResponse.json(
      {
        status: 'error',
        codigo: 'INTERNAL_ERROR',
        errores: [
          {
            campo: 'server',
            mensaje: 'Error interno del servidor. Por favor, inténtalo de nuevo.',
          },
        ],
      },
      { status: 500 }
    );
  }
}