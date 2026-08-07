/**
 * ============================================================================
 * EDGE FUNCTION: PILOT REQUEST (RFC-HPBN, Capítulo 13)
 * ============================================================================
 * 
 * FUNCIÓN: Recibir solicitudes de Demo Phygital, validar datos mínimos,
 * encolar en Upstash Redis, y responder 202 Accepted en <50ms.
 * 
 * PRINCIPIO APLICADO (Cap. 13):
 * ──────────────────────────────────────────────────────────────────────────
 * Killelea compara arquitecturas de servidor: forking servers (crean un
 * proceso nuevo por conexión, simple pero costoso bajo carga) vs. threaded
 * servers (más eficientes pero más complejos). En 2026, las Edge Functions
 * de Vercel/Cloudflare son el sucesor directo de FastCGI: un proceso que
 * se mantiene "caliente" y se reutiliza entre invocaciones.
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
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 13: Server Software → Edge Functions
 *   • Capítulo 2.3: Escalabilidad aplicada a Serverless Functions
 *   • Principio 5.1.9: I/O Is Slow (nunca golpear el CRM síncronamente)
 *   • Author's Tip #6: Si se debe generar contenido dinámico, usar la API
 *     del servidor en vez de CGI lento
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • La respuesta 202 Accepted cierra el gap de la Springboard Story
 *     con acción inmediata, manteniendo el momentum emocional
 * ============================================================================
 */

// Runtime Node.js: el adaptador de Cloudflare Workers no soporta 'edge'.
// El Worker igual se ejecuta en el edge, cerca del usuario.

import { enqueuePilotRequest } from '@/lib/queue/pilotRequestQueue';

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

    // Encolar de forma asíncrona (el CRM se actualiza después, fuera del camino crítico)
    const result = await enqueuePilotRequest({
      whatsapp: formData.whatsapp,
      establecimiento: formData.establecimiento,
      ciudad: formData.ciudad,
      timestamp: Date.now(),
    });

    const latency = performance.now() - startTime;

    // Responder según el resultado
    if (result.status === 'duplicate') {
      return new Response(
        JSON.stringify({
          status: 'duplicate',
          message: 'Ya recibimos tu solicitud hoy. Te contactaremos pronto.',
          latency_ms: Math.round(latency),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 202 Accepted = encolado correctamente, procesamiento asíncrono
    return new Response(
      JSON.stringify({
        status: 'queued',
        message: 'Solicitud recibida. Te contactaremos en menos de 24 horas.',
        idempotencyKey: result.idempotencyKey,
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