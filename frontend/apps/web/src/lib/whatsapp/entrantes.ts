// =============================================================================
// Procesamiento de eventos entrantes de Meta
// =============================================================================
//
// Separado de la ruta del webhook a propósito: la ruta debe responder 200 en
// milisegundos —si tarda, Meta reintenta y acaba desactivando el webhook— y
// todo esto ocurre después, en segundo plano.

import { and, eq, sql } from 'drizzle-orm';
import {
  automationLogs,
  b2cConsumers,
  chatConversations,
  chatMessages,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { normalizarTelefono } from './config';

/** Duración de la ventana de servicio de Meta. */
const VENTANA_HORAS = 24;

// -----------------------------------------------------------------------------
// Forma de los eventos de Meta
// -----------------------------------------------------------------------------

interface MensajeMeta {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string; caption?: string };
  audio?: { id: string; mime_type?: string };
  video?: { id: string; mime_type?: string; caption?: string };
  document?: { id: string; mime_type?: string; filename?: string };
  location?: { latitude: number; longitude: number; name?: string };
  button?: { text: string };
  interactive?: { button_reply?: { title: string }; list_reply?: { title: string } };
}

interface EstadoMeta {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title?: string; message?: string; error_data?: { details?: string } }>;
}

interface ValorMeta {
  messaging_product?: string;
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: MensajeMeta[];
  statuses?: EstadoMeta[];
}

export interface EventoMeta {
  object?: string;
  entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: ValorMeta }> }>;
}

// -----------------------------------------------------------------------------
// Traducción
// -----------------------------------------------------------------------------

type TipoChat = 'texto' | 'imagen' | 'audio' | 'video' | 'documento' | 'ubicacion' | 'plantilla' | 'otro';

/** Extrae tipo, texto y medio de un mensaje, sea del tipo que sea. */
function interpretarMensaje(m: MensajeMeta): {
  tipo: TipoChat;
  texto: string | null;
  mediaId: string | null;
  mediaMime: string | null;
} {
  switch (m.type) {
    case 'text':
      return { tipo: 'texto', texto: m.text?.body ?? null, mediaId: null, mediaMime: null };

    case 'image':
      // El caption se guarda como texto: es lo que el comensal escribió y sin
      // él la conversación se lee como una imagen sin contexto.
      return { tipo: 'imagen', texto: m.image?.caption ?? null, mediaId: m.image?.id ?? null, mediaMime: m.image?.mime_type ?? null };

    case 'audio':
      return { tipo: 'audio', texto: null, mediaId: m.audio?.id ?? null, mediaMime: m.audio?.mime_type ?? null };

    case 'video':
      return { tipo: 'video', texto: m.video?.caption ?? null, mediaId: m.video?.id ?? null, mediaMime: m.video?.mime_type ?? null };

    case 'document':
      return {
        tipo: 'documento',
        texto: m.document?.filename ?? null,
        mediaId: m.document?.id ?? null,
        mediaMime: m.document?.mime_type ?? null,
      };

    case 'location': {
      const l = m.location;
      const texto = l ? `${l.name ? l.name + ' · ' : ''}${l.latitude}, ${l.longitude}` : null;
      return { tipo: 'ubicacion', texto, mediaId: null, mediaMime: null };
    }

    case 'button':
      // Respuesta a un botón de plantilla: cuenta como texto porque es lo que
      // el comensal eligió decir.
      return { tipo: 'texto', texto: m.button?.text ?? null, mediaId: null, mediaMime: null };

    case 'interactive':
      return {
        tipo: 'texto',
        texto: m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null,
        mediaId: null,
        mediaMime: null,
      };

    default:
      // Stickers, contactos, reacciones… se guardan para que el hilo no tenga
      // huecos, aunque el CRM no sepa pintarlos.
      return { tipo: 'otro', texto: null, mediaId: null, mediaMime: null };
  }
}

/** Meta manda el timestamp en segundos, no en milisegundos. */
function aFecha(timestamp: string): Date {
  const s = Number(timestamp);
  return Number.isFinite(s) ? new Date(s * 1000) : new Date();
}

// -----------------------------------------------------------------------------
// Procesamiento
// -----------------------------------------------------------------------------

export interface ResumenProceso {
  mensajes: number;
  estados: number;
  omitidos: number;
}

export async function procesarEvento(evento: EventoMeta): Promise<ResumenProceso> {
  const resumen: ResumenProceso = { mensajes: 0, estados: 0, omitidos: 0 };

  for (const entrada of evento.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const valor = cambio.value;
      if (!valor) continue;

      for (const m of valor.messages ?? []) {
        const guardado = await guardarEntrante(m, valor);
        if (guardado) resumen.mensajes++;
        else resumen.omitidos++;
      }

      for (const e of valor.statuses ?? []) {
        if (await actualizarEstado(e)) resumen.estados++;
        else resumen.omitidos++;
      }
    }
  }

  return resumen;
}

/**
 * Guarda un mensaje entrante y actualiza su hilo.
 *
 * Devuelve false si ya estaba: Meta reintenta los webhooks, y sin esa
 * comprobación el mismo mensaje aparecería varias veces en la bandeja.
 */
async function guardarEntrante(m: MensajeMeta, valor: ValorMeta): Promise<boolean> {
  const telefono = normalizarTelefono(m.from);
  if (!telefono) {
    log.warn('Mensaje entrante con teléfono no interpretable', { ruta: '/webhooks/whatsapp' });
    return false;
  }

  const { tipo, texto, mediaId, mediaMime } = interpretarMensaje(m);
  const cuando = aFecha(m.timestamp);
  const nombrePerfil = valor.contacts?.[0]?.profile?.name ?? null;

  // Cada mensaje del usuario reabre la ventana de 24 h.
  const ventana = new Date(cuando.getTime() + VENTANA_HORAS * 3_600_000);

  return conBaseDeDatos(async (db) =>
    db.transaction(async (tx) => {
      // Si el número corresponde a un comensal conocido, se enlaza. Si no, el
      // hilo existe igual: perder al que acaba de escribir por no tenerlo
      // registrado sería perder justo el lead.
      const [comensal] = await tx
        .select({ id: b2cConsumers.id })
        .from(b2cConsumers)
        .where(sql`regexp_replace(${b2cConsumers.whatsappPhone}, '\\D', '', 'g') = ${telefono}`)
        .limit(1);

      const [conversacion] = await tx
        .insert(chatConversations)
        .values({
          telefono,
          consumerId: comensal?.id ?? null,
          nombrePerfil,
          ultimoMensajeEn: cuando,
          ventanaExpiraEn: ventana,
          sinLeer: 1,
        })
        .onConflictDoUpdate({
          target: chatConversations.telefono,
          set: {
            nombrePerfil: nombrePerfil ?? sql`${chatConversations.nombrePerfil}`,
            ultimoMensajeEn: cuando,
            ventanaExpiraEn: ventana,
            sinLeer: sql`${chatConversations.sinLeer} + 1`,
            // Se enlaza el comensal si aparece después de crear el hilo.
            consumerId: comensal?.id ?? sql`${chatConversations.consumerId}`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: chatConversations.id });

      const [insertado] = await tx
        .insert(chatMessages)
        .values({
          conversationId: conversacion.id,
          wamid: m.id,
          direccion: 'entrante',
          tipo,
          texto,
          mediaId,
          mediaMime,
          // Un entrante ya está entregado por definición: lo tenemos.
          estado: 'entregado',
          timestampMeta: cuando,
        })
        // El índice único de wamid es la garantía; esto evita el error.
        .onConflictDoNothing()
        .returning({ id: chatMessages.id });

      if (!insertado) {
        // Reintento de Meta: el mensaje ya estaba. Se deshace el incremento de
        // sin leer, o cada reintento inflaría el contador de la bandeja.
        await tx
          .update(chatConversations)
          .set({ sinLeer: sql`GREATEST(0, ${chatConversations.sinLeer} - 1)` })
          .where(eq(chatConversations.id, conversacion.id));
        return false;
      }

      return true;
    })
  );
}

/** Traduce el estado de Meta al nuestro. */
const ESTADOS: Record<string, 'enviado' | 'entregado' | 'leido' | 'fallido'> = {
  sent: 'enviado',
  delivered: 'entregado',
  read: 'leido',
  failed: 'fallido',
};

/**
 * Actualiza el estado de un mensaje que enviamos.
 *
 * Los estados llegan desordenados y con reintentos, así que solo se avanza:
 * un 'sent' que llega después de un 'read' no debe retroceder el mensaje.
 */
const ORDEN: Record<string, number> = { pendiente: 0, enviado: 1, entregado: 2, leido: 3, fallido: 4 };

async function actualizarEstado(e: EstadoMeta): Promise<boolean> {
  const nuevo = ESTADOS[e.status];
  if (!nuevo) return false;

  const cuando = aFecha(e.timestamp);
  const error = e.errors?.[0];

  return conBaseDeDatos(async (db) => {
    const [actualizado] = await db
      .update(chatMessages)
      .set({
        estado: nuevo,
        ...(nuevo === 'entregado' ? { entregadoEn: cuando } : {}),
        ...(nuevo === 'leido' ? { leidoEn: cuando } : {}),
        ...(error
          ? {
              errorCodigo: String(error.code),
              errorMensaje: error.error_data?.details ?? error.message ?? error.title ?? null,
            }
          : {}),
      })
      .where(and(
        eq(chatMessages.wamid, e.id),
        // Solo avanza. `fallido` puede pisar cualquier estado: es definitivo.
        nuevo === 'fallido'
          ? sql`true`
          : sql`CASE ${chatMessages.estado}
                  WHEN 'pendiente' THEN 0 WHEN 'enviado' THEN 1
                  WHEN 'entregado' THEN 2 WHEN 'leido' THEN 3 ELSE 4
                END < ${ORDEN[nuevo]}`
      ))
      .returning({ id: chatMessages.id });

    if (error) {
      log.warn('Mensaje de WhatsApp fallido', {
        ruta: '/webhooks/whatsapp',
        detalle: [e.id, String(error.code), error.error_data?.details ?? error.title ?? ''],
      });
    }

    /*
      Si el mensaje salió de una campaña, hay que corregir también su registro.

      Meta ACEPTA el envío y devuelve un wamid, y solo después decide que falló:
      sin saldo, número inválido, plantilla pausada. Como automation_logs se
      escribe con la respuesta inmediata, se quedaba diciendo 'sent' para un
      mensaje que nadie recibió. Pasó de verdad con el error 131042 —cuenta sin
      método de pago—: el hilo mostraba "fallido" y la campaña "enviado".

      No es solo una cifra descuadrada. Tiene tres efectos:

        · El tope de frecuencia gasta cupo por un mensaje que no llegó.
        · La deduplicación da a esa persona por atendida, así que la secuencia
          NO reintenta cuando el problema se resuelve — se queda sin bienvenida
          para siempre.
        · El embudo de Mensajería cuenta como enviados mensajes que no salieron,
          y las tasas de apertura salen infladas hacia abajo.

      Solo se corrige el que sigue en 'sent': un registro ya marcado como
      fallido no necesita volver a marcarse.
    */
    if (nuevo === 'fallido' && actualizado) {
      const [mensaje] = await db
        .select({
          sequenceId: chatMessages.sequenceId,
          consumerId: chatConversations.consumerId,
        })
        .from(chatMessages)
        .innerJoin(chatConversations, eq(chatConversations.id, chatMessages.conversationId))
        .where(eq(chatMessages.id, actualizado.id))
        .limit(1);

      if (mensaje?.sequenceId && mensaje.consumerId) {
        const corregidos = await db
          .update(automationLogs)
          .set({
            status: 'failed',
            errorMessage:
              error?.error_data?.details ?? error?.message ?? error?.title ?? 'Meta rechazó el envío',
          })
          .where(and(
            eq(automationLogs.sequenceId, mensaje.sequenceId),
            eq(automationLogs.consumerId, mensaje.consumerId),
            eq(automationLogs.status, 'sent')
          ))
          .returning({ id: automationLogs.id });

        if (corregidos.length > 0) {
          log.warn('Envío de campaña corregido a fallido', {
            ruta: '/webhooks/whatsapp',
            detalle: [mensaje.sequenceId, String(error?.code ?? '')],
          });
        }
      }
    }

    return Boolean(actualizado);
  });
}
