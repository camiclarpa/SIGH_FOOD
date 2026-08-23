// =============================================================================
// Alta y baja de notificaciones
// =============================================================================
//
// Exige sesión. Una suscripción sin dueño no sirve para nada: el CRM manda por
// comensal —"a quien lleva 15 días sin pedir"—, no por dispositivo suelto.
//
// Lo que llega aquí es lo que devuelve `PushSubscription.toJSON()` del
// navegador: una dirección y dos claves. No es un dato secreto nuestro, pero sí
// permite mandarle notificaciones a esa persona, así que solo se acepta de quien
// ha iniciado sesión y se guarda atado a su ficha.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { pushSuscripciones } from '@sighfood/domain/db/schema';
import { COOKIE_SESION, identidadDe } from '@/lib/sesion';
import { conBaseDeDatos } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

const esquema = z.object({
  suscripcion: z.object({
    // Se valida que sea una URL http(s) real: el endpoint se usa después como
    // destino de un fetch desde el servidor, y aceptar cualquier cadena
    // convertiría esto en una forma de hacer que nuestro servidor llame a donde
    // le digan.
    endpoint: z.string().url().max(2000).refine(
      (u) => u.startsWith('https://'),
      'El endpoint debe ser https'
    ),
    keys: z.object({
      p256dh: z.string().min(20).max(200),
      auth: z.string().min(10).max(100),
    }),
  }),
  /** Endpoint anterior, cuando el navegador rota la suscripción. */
  anterior: z.string().url().max(2000).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const yo = await identidadDe(request.cookies.get(COOKIE_SESION)?.value);
  if (!yo) {
    return NextResponse.json({ ok: false, error: 'Entra a tu cuenta primero' }, { status: 401 });
  }

  const v = esquema.safeParse(await request.json().catch(() => null));
  if (!v.success) {
    return NextResponse.json({ ok: false, error: 'Suscripción no válida' }, { status: 400 });
  }

  const { suscripcion, anterior } = v.data;
  const agente = request.headers.get('user-agent')?.slice(0, 255) ?? null;

  await conBaseDeDatos(async (db) => {
    /*
      Si el navegador rotó la suscripción, la vieja se desactiva.

      No se borra: la fila anterior puede haber recibido mensajes, y borrarla
      dejaría huérfano ese historial. Marcarla inactiva conserva el rastro sin
      volver a intentar entregas por una dirección muerta.
    */
    if (anterior && anterior !== suscripcion.endpoint) {
      await db
        .update(pushSuscripciones)
        .set({ activa: false })
        .where(eq(pushSuscripciones.endpoint, anterior));
    }

    /*
      onConflictDoUpdate sobre el endpoint, no insert a secas.

      El navegador reenvía la MISMA suscripción cada vez que se abre la app. Sin
      esto se acumularían filas idénticas y cada notificación sonaría tres o
      cuatro veces en el mismo teléfono — que es la forma más rápida de que
      alguien desactive los avisos para siempre.

      Y se reasigna el consumer_id: un móvil prestado, o alguien que cambia de
      cuenta, deja de recibir los avisos del dueño anterior.
    */
    await db
      .insert(pushSuscripciones)
      .values({
        consumerId: yo.consumerId,
        endpoint: suscripcion.endpoint,
        p256dh: suscripcion.keys.p256dh,
        auth: suscripcion.keys.auth,
        agente,
      })
      .onConflictDoUpdate({
        target: pushSuscripciones.endpoint,
        set: {
          consumerId: yo.consumerId,
          p256dh: suscripcion.keys.p256dh,
          auth: suscripcion.keys.auth,
          agente,
          // Volver a suscribirse reactiva: puede ser alguien que se dio de baja
          // y ha cambiado de opinión.
          activa: true,
          fallos: 0,
        },
      });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

/**
 * Baja.
 *
 * Se desactiva en vez de borrar. Cuánta gente se da de baja es justo la señal de
 * que los mensajes molestan, y borrar la fila esconde ese dato — dejando el
 * panel con un número de suscriptores que solo sube.
 */
export async function DELETE(request: NextRequest) {
  const yo = await identidadDe(request.cookies.get(COOKIE_SESION)?.value);
  if (!yo) {
    return NextResponse.json({ ok: false, error: 'Entra a tu cuenta primero' }, { status: 401 });
  }

  const endpoint = request.nextUrl.searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: 'Falta el endpoint' }, { status: 400 });
  }

  await conBaseDeDatos((db) =>
    db
      .update(pushSuscripciones)
      .set({ activa: false })
      // El consumerId va en el WHERE: sin él, conocer un endpoint bastaría para
      // dar de baja las notificaciones de otra persona.
      .where(
        and(
          eq(pushSuscripciones.endpoint, endpoint),
          eq(pushSuscripciones.consumerId, yo.consumerId)
        )
      )
  );

  return NextResponse.json({ ok: true });
}
