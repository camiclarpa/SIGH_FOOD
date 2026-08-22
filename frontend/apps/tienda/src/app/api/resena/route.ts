// =============================================================================
// Reseña de un pedido entregado
// =============================================================================
//
// Solo se puede reseñar UN pedido PROPIO y ENTREGADO. Las tres condiciones van
// en el WHERE, no en comprobaciones previas: sin ellas, cualquiera con un
// código podría dejar cinco estrellas en pedidos ajenos, y la prueba social del
// catálogo dejaría de significar nada.
//
// El pedido se identifica por su código, que es lo que la persona tiene. No se
// exige sesión: obligar a entrar para opinar reduce las reseñas justo cuando
// están frescas, que es cuando valen.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { consumerReviews, pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

const esquema = z.object({
  codigo: z.string().min(4).max(12),
  puntuacion: z.number().int().min(1, 'Elige de 1 a 5').max(5),
  comentario: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const v = esquema.safeParse(await request.json().catch(() => null));
  if (!v.success) {
    return NextResponse.json(
      { ok: false, error: v.error.issues[0]?.message ?? 'Datos incompletos' },
      { status: 400 }
    );
  }

  try {
    const r = await conBaseDeDatos(async (db) => {
      const [pedido] = await db
        .select({ id: pedidos.id, consumerId: pedidos.consumerId })
        .from(pedidos)
        .where(
          and(
            eq(pedidos.codigo, v.data.codigo.toUpperCase()),
            // Solo lo entregado se reseña: opinar sobre algo que aún no has
            // recibido no es una reseña, es una expectativa.
            eq(pedidos.estado, 'entregado')
          )
        )
        .limit(1);

      if (!pedido?.consumerId) return { ok: false as const, error: 'Ese pedido no se puede reseñar todavía' };

      const [ya] = await db
        .select({ id: consumerReviews.id })
        .from(consumerReviews)
        .where(eq(consumerReviews.pedidoId, pedido.id))
        .limit(1);

      if (ya) return { ok: false as const, error: 'Ya nos contaste qué te pareció. Gracias.' };

      await db.insert(consumerReviews).values({
        consumerId: pedido.consumerId,
        pedidoId: pedido.id,
        puntuacion: v.data.puntuacion,
        comentario: v.data.comentario?.trim().slice(0, 1000) || null,
      });

      return { ok: true as const };
    });

    return NextResponse.json(r, { status: r.ok ? 201 : 409 });
  } catch {
    return NextResponse.json({ ok: false, error: 'No pudimos guardar tu reseña' }, { status: 500 });
  }
}
