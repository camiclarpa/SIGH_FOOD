// =============================================================================
// Web Push: el canal que no cobra nadie
// =============================================================================
//
// POR QUÉ EXISTE
// --------------
// Meta cobra las plantillas de categoría MARKETING y, sin tarjeta registrada,
// las rechaza con el error 131042. Eso deja fuera justo el contenido que más se
// manda: bienvenidas, encuestas, reactivaciones, subidas de nivel.
//
// Web Push va del servidor al navegador del comensal sin pasar por Meta. No hay
// cuota ni coste por mensaje.
//
// LO QUE ESTE CANAL NO PUEDE HACER
// --------------------------------
// En iPhone solo funciona si la persona AÑADIÓ la web a la pantalla de inicio
// (iOS 16.4+). Si abre la tienda en Safari sin instalarla, no hay notificación
// posible — es una restricción de Apple, no del código.
//
// Por eso esto no sustituye a WhatsApp: lo transaccional urgente (un pedido en
// camino, un código de acceso) sigue yendo por WhatsApp, donde llega seguro y
// además es gratis por ser UTILIDAD. Aquí va lo que puede esperar.

import { and, eq, sql } from 'drizzle-orm';
import { pushSuscripciones } from '@sighfood/domain/db/schema';
import {
  cifrarPayload,
  firmaVapid,
  type ClavesVapid,
} from '@sighfood/domain/lib/push-cripto';
import { conBaseDeDatos, variableDeEntorno } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';

/** Lo que se le enseña a la persona. */
export interface Notificacion {
  titulo: string;
  cuerpo: string;
  /** A dónde lleva al tocarla. Relativa a la tienda. */
  url?: string;
  /**
   * Agrupador. Dos notificaciones con la misma etiqueta se sustituyen en vez de
   * apilarse: sin esto, tres avisos del mismo pedido dejan tres tarjetas.
   */
  etiqueta?: string;
}

export type EstadoVapid =
  | { listo: true; claves: ClavesVapid; contacto: string }
  | { listo: false; motivo: string };

/**
 * Lee las claves VAPID por petición, no al importar el módulo.
 *
 * En Workers `process.env` está vacío en el ámbito global y las variables llegan
 * por el binding. Una constante de módulo valdría undefined para siempre — el
 * mismo error que dejó la integración de WhatsApp sin credenciales.
 */
export async function configVapid(): Promise<EstadoVapid> {
  const [publica, privada, contacto] = await Promise.all([
    variableDeEntorno('VAPID_PUBLIC_KEY'),
    variableDeEntorno('VAPID_PRIVATE_KEY'),
    variableDeEntorno('VAPID_CONTACTO'),
  ]);

  if (!publica?.trim() || !privada?.trim()) {
    return {
      listo: false,
      motivo: 'Faltan las claves VAPID. Se generan con `node scripts/configurar-push.mjs`.',
    };
  }

  return {
    listo: true,
    claves: { publica: publica.trim(), privada: privada.trim() },
    // El contacto es obligatorio por especificación: es a dónde escribe el
    // servicio de push si nuestros envíos causan problemas.
    contacto: contacto?.trim() || 'mailto:hola@bocazo.co',
  };
}

export interface ResultadoPush {
  /** Cuántos dispositivos recibieron el aviso. */
  entregados: number;
  /** Suscripciones que ya no existen y se han desactivado. */
  caducadas: number;
  fallidos: number;
  /** true si el comensal no tiene ningún dispositivo suscrito. */
  sinDispositivos: boolean;
  error?: string;
}

/**
 * Manda una notificación a TODOS los dispositivos de un comensal.
 *
 * A todos y no solo al último: alguien que se suscribió en el móvil y en el
 * portátil espera enterarse mire donde mire, y elegir uno por él significa
 * acertar la mitad de las veces.
 *
 * Nunca lanza. El cron recorre muchos comensales seguidos y un dispositivo
 * caducado no puede detener la campaña entera.
 */
export async function enviarPush(
  consumerId: string,
  aviso: Notificacion
): Promise<ResultadoPush> {
  const base: ResultadoPush = {
    entregados: 0,
    caducadas: 0,
    fallidos: 0,
    sinDispositivos: false,
  };

  const config = await configVapid();
  if (!config.listo) return { ...base, error: config.motivo };

  const destinos = await conBaseDeDatos((db) =>
    db
      .select({
        id: pushSuscripciones.id,
        endpoint: pushSuscripciones.endpoint,
        p256dh: pushSuscripciones.p256dh,
        auth: pushSuscripciones.auth,
      })
      .from(pushSuscripciones)
      .where(and(eq(pushSuscripciones.consumerId, consumerId), eq(pushSuscripciones.activa, true)))
  );

  if (destinos.length === 0) return { ...base, sinDispositivos: true };

  const cuerpo = JSON.stringify({
    titulo: aviso.titulo,
    cuerpo: aviso.cuerpo,
    url: aviso.url ?? '/',
    etiqueta: aviso.etiqueta ?? 'bocazo',
  });

  for (const d of destinos) {
    try {
      const cifrado = await cifrarPayload(cuerpo, { p256dh: d.p256dh, auth: d.auth });
      const jwt = await firmaVapid({
        endpoint: d.endpoint,
        claves: config.claves,
        contacto: config.contacto,
      });

      const respuesta = await fetch(d.endpoint, {
        method: 'POST',
        headers: {
          // La clave pública va en la cabecera junto al JWT: así el servicio de
          // push puede comprobar la firma sin conocernos de antes.
          Authorization: `vapid t=${jwt}, k=${config.claves.publica}`,
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          // Cuánto guardarlo si el móvil está apagado. Doce horas: un aviso de
          // ayer ya no interesa, y guardarlo más solo consigue que la persona
          // reciba algo desfasado al encender.
          TTL: '43200',
          Urgency: 'normal',
        },
        body: cifrado as BodyInit,
      });

      if (respuesta.ok) {
        base.entregados++;
        await conBaseDeDatos((db) =>
          db
            .update(pushSuscripciones)
            .set({ ultimaEntrega: new Date(), fallos: 0 })
            .where(eq(pushSuscripciones.id, d.id))
        );
        continue;
      }

      /*
        404 y 410 significan que esa suscripción ya no existe: desinstaló la web
        o revocó el permiso. Se desactiva de inmediato.

        Cualquier otro código NO la desactiva. Un 500 del servicio de push es un
        problema suyo, y tratarlo como baja borraría a media base de suscriptores
        durante una caída ajena.
      */
      if (respuesta.status === 404 || respuesta.status === 410) {
        base.caducadas++;
        await conBaseDeDatos((db) =>
          db
            .update(pushSuscripciones)
            .set({ activa: false })
            .where(eq(pushSuscripciones.id, d.id))
        );
      } else {
        base.fallidos++;
        await conBaseDeDatos((db) =>
          db
            .update(pushSuscripciones)
            .set({ fallos: sql`${pushSuscripciones.fallos} + 1` })
            .where(eq(pushSuscripciones.id, d.id))
        );
        log.warn('El servicio de push rechazó el envío', {
          ruta: '/lib/push',
          detalle: [String(respuesta.status), new URL(d.endpoint).host],
        });
      }
    } catch (e) {
      base.fallidos++;
      log.warn('No se pudo enviar la notificación', {
        ruta: '/lib/push',
        detalle: [e instanceof Error ? e.message : String(e)],
      });
    }
  }

  return base;
}

/** ¿Se puede alcanzar a este comensal por push? Decide el canal, no envía. */
export async function tienePush(consumerId: string): Promise<boolean> {
  const [fila] = await conBaseDeDatos((db) =>
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(pushSuscripciones)
      .where(and(eq(pushSuscripciones.consumerId, consumerId), eq(pushSuscripciones.activa, true)))
  );
  return Number(fila?.n ?? 0) > 0;
}

/** Cuántos dispositivos hay suscritos, para el panel. */
export async function resumenPush(): Promise<{
  dispositivos: number;
  comensales: number;
  bajas: number;
}> {
  const [fila] = await conBaseDeDatos((db) =>
    db
      .select({
        dispositivos: sql<number>`count(*) FILTER (WHERE ${pushSuscripciones.activa})::int`,
        comensales: sql<number>`count(DISTINCT ${pushSuscripciones.consumerId}) FILTER (WHERE ${pushSuscripciones.activa})::int`,
        bajas: sql<number>`count(*) FILTER (WHERE NOT ${pushSuscripciones.activa})::int`,
      })
      .from(pushSuscripciones)
  );

  return {
    dispositivos: Number(fila?.dispositivos ?? 0),
    comensales: Number(fila?.comensales ?? 0),
    bajas: Number(fila?.bajas ?? 0),
  };
}
