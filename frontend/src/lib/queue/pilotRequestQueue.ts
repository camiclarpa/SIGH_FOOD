/**
 * ============================================================================
 * PILOT REQUEST QUEUE — Cola con Idempotency (RFC-HPBN, Capítulo 17)
 * ============================================================================
 * 
 * FUNCIÓN: Encolar solicitudes de Demo Phygital en Upstash Redis con
 * idempotency key para evitar duplicados.
 * 
 * PRINCIPIO APLICADO (Cap. 17):
 * ───────────────────────────────────────────────────────────────────────────
 * Killelea cubre indexación, estrategias de caché de consultas, y connection
 * pooling. En 2026, SIGH_FOOD no consulta ninguna base de datos en el flujo
 * crítico — el landing es SSG completo. La única escritura es un LPUSH a
 * una cola de Upstash Redis.
 * 
 * Esto elimina la necesidad de connection pooling del Capítulo 17: no hay
 * conexiones de base de datos que gestionar en el camino crítico del usuario.
 * 
 * DISEÑO DE IDEMPOTENCIA:
 *   • Key: `pilot:${whatsapp}:${fecha}` (ej: pilot:+573001234567:2026-08-05)
 *   • TTL: 24 horas (evita duplicados si el usuario reenvía el formulario)
 *   • Verificación: GET antes de LPUSH para detectar duplicados
 * 
 * FLUJO:
 *   1. Usuario envía formulario (WhatsApp + Establecimiento)
 *   2. Edge Function valida datos mínimos (<10ms)
 *   3. Edge Function genera idempotency key
 *   4. Edge Function verifica si ya existe (GET)
 *   5. Si existe: retornar { status: 'duplicate' }
 *   6. Si no existe: SET con TTL 24h + LPUSH a cola
 *   7. Responder 202 Accepted en <50ms
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 17: Databases → Colas de Upstash Redis
 *   • Capítulo 13: Server Software → Edge Functions
 *   • Capítulo 2.3: Escalabilidad aplicada a Serverless Functions
 *   • Principio 5.1.9: I/O Is Slow (nunca golpear el CRM síncronamente)
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • La respuesta 202 Accepted permite cerrar el gap abierto por la
 *     Springboard Story ("¿Quieres tu propio Fin de Semana Piloto?")
 *     con acción inmediata, sin hacer esperar al usuario
 * ============================================================================
 */

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export interface PilotRequestData {
  whatsapp: string;
  establecimiento: string;
  ciudad?: string;
  timestamp: number;
}

export interface QueueResult {
  status: 'queued' | 'duplicate';
  skipped: boolean;
  idempotencyKey?: string;
}

export async function enqueuePilotRequest(data: PilotRequestData): Promise<QueueResult> {
  // Generar idempotency key basada en WhatsApp + fecha (evita duplicados del mismo día)
  const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const idempotencyKey = `pilot:${data.whatsapp}:${fecha}`;

  // Verificar si ya existe (evita duplicados si el usuario reenvía el formulario)
  const alreadyExists = await redis.get(idempotencyKey);
  if (alreadyExists) {
    return { status: 'duplicate', skipped: true, idempotencyKey };
  }

  // Marcar como procesado con TTL de 24 horas
  await redis.set(idempotencyKey, '1', { ex: 86400 });

  // Encolar en la cola de solicitudes piloto
  await redis.lpush('pilot-requests-queue', JSON.stringify({
    ...data,
    idempotencyKey,
    timestamp: Date.now(),
  }));

  return { status: 'queued', skipped: false, idempotencyKey };
}

// Ejemplo de uso en Edge Function:
// const result = await enqueuePilotRequest({
//   whatsapp: formData.whatsapp,
//   establecimiento: formData.establecimiento,
//   timestamp: Date.now(),
// });
// if (result.status === 'duplicate') {
//   return new Response(JSON.stringify({ message: 'Ya recibimos tu solicitud hoy' }), { status: 200 });
// }
// return new Response(JSON.stringify({ status: 'queued' }), { status: 202 });