// =============================================================================
// SIGH_FOOD - Webhook de WhatsApp Business (Meta Cloud API)
// Endpoint: GET/POST /api/webhooks/whatsapp
// =============================================================================
//
// Es el único endpoint del CRM que llama Meta, no un usuario. Dos reglas suyas
// mandan sobre el diseño:
//
//   · Hay que responder 200 en pocos segundos. Si se tarda, Meta reintenta el
//     mismo evento y, si persiste, DESACTIVA la suscripción del webhook. Por eso
//     la respuesta sale antes de tocar la base y el procesado va después.
//
//   · Meta reintenta ante cualquier respuesta que no sea 200. Incluso un evento
//     que no sabemos procesar debe contestar 200, o entra en un bucle de
//     reintentos que acaba en desactivación.

import { NextRequest, NextResponse } from 'next/server';
import { log } from '@sighfood/domain/lib/observabilidad';
import { tokenDeVerificacion } from '@/lib/whatsapp/config';
import { procesarEvento, type EventoMeta } from '@/lib/whatsapp/entrantes';
import { contextoCloudflare } from '@/lib/cloudflare';
import { variableDeEntorno } from '@/lib/cloudflare';

// -----------------------------------------------------------------------------
// GET: verificación de la suscripción
// -----------------------------------------------------------------------------
//
// Meta llama una sola vez al configurar el webhook. Si no se devuelve el
// challenge tal cual, en texto plano, la suscripción no se activa.

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const modo = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  // Solo hace falta el token de verificación. En Meta el webhook se da de alta
  // ANTES de tener el token de acceso permanente, así que exigir aquí la
  // configuración completa bloquearía justo el primer paso de la puesta en
  // marcha.
  const esperado = await tokenDeVerificacion();

  if (!esperado) {
    log.error(
      'Verificación de webhook sin WHATSAPP_VERIFY_TOKEN',
      new Error('falta la variable'),
      { ruta: '/api/webhooks/whatsapp' }
    );
    return new NextResponse('Webhook sin configurar', { status: 500 });
  }

  if (modo === 'subscribe' && token === esperado && challenge) {
    log.info('Webhook de WhatsApp verificado', { ruta: '/api/webhooks/whatsapp' });
    // Texto plano y el challenge sin comillas: Meta compara la cadena exacta y
    // un JSON aquí hace fallar la verificación.
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // No se dice qué falló: este endpoint es público y describir el motivo
  // ayudaría a adivinar el token.
  log.warn('Verificación de webhook rechazada', { ruta: '/api/webhooks/whatsapp' });
  return new NextResponse('Forbidden', { status: 403 });
}

// -----------------------------------------------------------------------------
// Firma de Meta
// -----------------------------------------------------------------------------

/**
 * Comprueba que el evento viene de Meta.
 *
 * Meta firma el cuerpo con el secreto de la app (X-Hub-Signature-256). Sin esta
 * comprobación, este endpoint es público y cualquiera puede inyectar mensajes
 * falsos en la bandeja de entrada: basta con conocer la URL.
 *
 * Si WHATSAPP_APP_SECRET no está configurado se acepta el evento y se avisa en
 * el log, para no bloquear una integración a medio montar — pero conviene
 * ponerlo antes de recibir tráfico real.
 */
async function firmaValida(request: Request, cuerpo: string): Promise<{ ok: boolean; motivo?: string }> {
  const secreto = await variableDeEntorno('WHATSAPP_APP_SECRET');

  if (!secreto?.trim()) {
    log.warn('WHATSAPP_APP_SECRET sin configurar: el webhook acepta eventos sin verificar la firma', {
      ruta: '/api/webhooks/whatsapp',
    });
    return { ok: true };
  }

  const cabecera = request.headers.get('x-hub-signature-256');
  if (!cabecera?.startsWith('sha256=')) return { ok: false, motivo: 'sin firma' };

  const clave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto.trim()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(cuerpo));
  const esperada = [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, '0')).join('');

  const recibida = cabecera.slice('sha256='.length);

  // Comparación en tiempo constante: un `===` filtra por cuánto tarda en
  // fallar y permite reconstruir la firma byte a byte.
  if (recibida.length !== esperada.length) return { ok: false, motivo: 'firma no coincide' };
  let diferencia = 0;
  for (let i = 0; i < esperada.length; i++) {
    diferencia |= esperada.charCodeAt(i) ^ recibida.charCodeAt(i);
  }

  return diferencia === 0 ? { ok: true } : { ok: false, motivo: 'firma no coincide' };
}

// -----------------------------------------------------------------------------
// POST: eventos
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // El cuerpo se lee como texto porque la firma se calcula sobre los bytes
  // exactos: volver a serializar el JSON cambiaría el orden o los espacios y la
  // firma dejaría de cuadrar.
  let crudo: string;
  try {
    crudo = await request.text();
  } catch {
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  }

  const firma = await firmaValida(request, crudo);
  if (!firma.ok) {
    log.warn('Evento de webhook con firma inválida', {
      ruta: '/api/webhooks/whatsapp',
      detalle: firma.motivo,
    });
    // 403 y no 200: aquí sí interesa que Meta note el rechazo, y un emisor
    // falso no merece que finjamos haberlo aceptado.
    return new NextResponse('Forbidden', { status: 403 });
  }

  let evento: EventoMeta;
  try {
    evento = JSON.parse(crudo) as EventoMeta;
  } catch {
    // Un cuerpo ilegible no se arregla reintentando: se acepta y se descarta.
    log.warn('Evento de webhook que no es JSON', { ruta: '/api/webhooks/whatsapp' });
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  }

  if (evento.object !== 'whatsapp_business_account') {
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  }

  const trabajo = procesarEvento(evento)
    .then((r) => {
      if (r.mensajes || r.estados) {
        log.info('Evento de WhatsApp procesado', {
          ruta: '/api/webhooks/whatsapp',
          detalle: [`${r.mensajes} mensajes`, `${r.estados} estados`, `${r.omitidos} omitidos`],
        });
      }
    })
    .catch((e) => {
      // El fallo se registra pero NO se propaga: ya se contestó 200, y dejar
      // que la promesa reviente sin capturar tumbaría el isolate.
      log.error('Error procesando evento de WhatsApp', e, { ruta: '/api/webhooks/whatsapp' });
    });

  // En Workers, la respuesta corta la ejecución: sin waitUntil, el procesado se
  // cancela a mitad y el mensaje se pierde aunque Meta reciba su 200.
  const { ctx } = await contextoCloudflare();
  if (ctx?.waitUntil) {
    ctx.waitUntil(trabajo);
  } else {
    // Fuera de Workers (next dev, tests) no hay nada que cancele la promesa,
    // pero se espera para que los tests vean el resultado.
    await trabajo;
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
