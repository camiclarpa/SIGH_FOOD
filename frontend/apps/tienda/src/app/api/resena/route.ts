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
import { and, desc, eq } from 'drizzle-orm';
import { consumerReviews, pedidoItems, pedidos, productos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

/**
 * Motivos de un toque para una nota baja.
 *
 * Existen porque casi nadie escribe un texto en el móvil. Sin ellos, una reseña
 * de dos estrellas llega vacía y no se puede saber si falló la cocina o el
 * reparto — que es justo lo que hay que distinguir para arreglarlo.
 */
const MOTIVOS = ['temperatura', 'tiempo', 'empaque', 'sabor', 'cantidad', 'otro'] as const;

const esquema = z.object({
  codigo: z.string().min(4).max(12),
  puntuacion: z.number().int().min(1, 'Elige de 1 a 5').max(5),
  comentario: z.string().max(1000).optional(),
  motivos: z.array(z.enum(MOTIVOS)).max(6).optional(),
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

      /*
        LA LÍNEA SENSORIAL SE DEDUCE DE LO QUE COMPRÓ.

        Antes no se guardaba, y por eso el panel del CRM mostraba "Sin definir"
        en todas las reseñas: una tabla de calidad por línea de producto en la
        que ninguna reseña tenía línea.

        Se toma la del producto MÁS CARO del pedido. Con varias líneas en una
        misma bolsa no hay forma de saber a cuál se refiere la nota, y el plato
        principal es la apuesta más razonable: es lo que la persona vino a comer
        y sobre lo que opina.
      */
      const [principal] = await db
        .select({ linea: productos.lineaProducto })
        .from(pedidoItems)
        .innerJoin(productos, eq(productos.id, pedidoItems.productoId))
        .where(eq(pedidoItems.pedidoId, pedido.id))
        .orderBy(desc(pedidoItems.precioUnitarioCOP))
        .limit(1);

      const motivos = v.data.motivos?.length ? v.data.motivos : null;

      await db.insert(consumerReviews).values({
        consumerId: pedido.consumerId,
        pedidoId: pedido.id,
        puntuacion: v.data.puntuacion,
        comentario: v.data.comentario?.trim().slice(0, 1000) || null,
        productLine: principal?.linea ?? null,
        motivos,
        /*
          La alerta se levanta AQUÍ, con la nota, sin esperar a la IA.

          El clasificador corre cada pocos minutos y puede fallar o quedarse
          corto de cuota. Una nota de tres o menos ya es motivo suficiente para
          que alguien la mire: hacerla depender de que un modelo responda
          significaría que un fallo de la IA esconde justo las reseñas que más
          urgen.

          La IA afina DESPUÉS —dice si fue cocina, reparto o simple preferencia—
          y puede retirar la alerta si resulta que no era un fallo.
        */
        alertaCalidad: v.data.puntuacion <= 3,
      });

      return { ok: true as const };
    });

    return NextResponse.json(r, { status: r.ok ? 201 : 409 });
  } catch {
    return NextResponse.json({ ok: false, error: 'No pudimos guardar tu reseña' }, { status: 500 });
  }
}
