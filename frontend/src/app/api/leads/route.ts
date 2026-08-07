/**
 * ============================================================================
 * LEADS API ROUTE — Edge Function 202 Accepted (RFC-HPBN, Capítulo 13)
 * RFC-001: Capa Edge — Formulario de agendamiento
 * ============================================================================
 * 
 * FUNCIÓN: Recibir solicitudes de Demo Phygital, validar datos mínimos,
 * encolar en Upstash Redis, y responder 202 Accepted en <50ms.
 * 
 * PRINCIPIO APLICADO (RFC-HPBN Cap. 13):
 *   Killelea compara arquitecturas de servidor: forking servers (crean un
 *   proceso nuevo por conexión, simple pero costoso bajo carga) vs. threaded
 *   servers (más eficientes pero más complejos). En 2026, las Edge Functions
 *   de Vercel/Cloudflare son el sucesor directo de FastCGI: un proceso que
 *   se mantiene "caliente" y se reutiliza entre invocaciones.
 * 
 * DISEÑO CLAVE:
 *   • export const runtime = 'edge' (ejecuta en Edge Network, no en origen)
 *   • Sin estado entre solicitudes (cualquier estado vive en Upstash Redis)
 *   • Respuesta 202 Accepted (no bloquear esperando que el CRM responda)
 *   • Validación mínima y rápida (nunca un cómputo pesado en el camino crítico)
 * 
 * FLUJO:
 *   1. Recibir POST con formData (whatsapp + establecimiento)
 *   2. Validar campos requeridos (<5ms)
 *   3. Generar idempotency key
 *   4. Encolar en Upstash Redis (<20ms)
 *   5. Responder 202 Accepted (<50ms total)
 * 
 * INTEGRACIÓN CON RFC-DDIA:
 *   • Sección 7.3: Patrón Outbox (cola única como fuente de verdad)
 *   • Sección 8.2: Linealizabilidad para idempotency key
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • La respuesta 202 Accepted cierra el gap de la Springboard Story
 *     con acción inmediata, manteniendo el momentum emocional
 * ============================================================================
 */

// Runtime Node.js: el adaptador de Cloudflare Workers no soporta 'edge'.
// El Worker igual se ejecuta en el edge, cerca del usuario.

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function POST(request: Request) {
  const startTime = performance.now();
  
  try {
    // Parsear body (validación de formato)
    let formData: any;
    try {
      formData = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Body inválido, debe ser JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validación mínima y rápida (nunca un cómputo pesado en el camino crítico)
    if (!formData.whatsapp || !formData.establecimiento) {
      return new Response(
        JSON.stringify({ error: 'Datos incompletos: whatsapp y establecimiento son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validación de formato de WhatsApp (básica)
    if (typeof formData.whatsapp !== 'string' || formData.whatsapp.length < 10) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generar idempotency key (RFC-DDIA Sección 8.2: linealizabilidad)
    const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const idempotencyKey = `pilot:${formData.whatsapp}:${fecha}`;

    // Verificar duplicados (RFC-DDIA Sección 7.3: patrón outbox)
    const alreadyExists = await redis.get(idempotencyKey);
    if (alreadyExists) {
      return new Response(
        JSON.stringify({
          status: 'duplicate',
          message: 'Ya recibimos tu solicitud hoy. Te contactaremos pronto.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Marcar como procesado con TTL de 24 horas
    await redis.set(idempotencyKey, '1', { ex: 86400 });

    // Encolar de forma asíncrona (el CRM se actualiza después, fuera del camino crítico)
    await redis.lpush('pilot-requests-queue', JSON.stringify({
      ...formData,
      idempotencyKey,
      timestamp: Date.now(),
    }));

    const latency = performance.now() - startTime;

    // 202 Accepted = encolado correctamente, procesamiento asíncrono
    return new Response(
      JSON.stringify({
        status: 'queued',
        message: 'Solicitud recibida. Te contactaremos en menos de 24 horas.',
        idempotencyKey,
        latency_ms: Math.round(latency),
      }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const latency = performance.now() - startTime;
    
    // Error interno del servidor (Upstash Redis caído, etc.)
    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        latency_ms: Math.round(latency),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}