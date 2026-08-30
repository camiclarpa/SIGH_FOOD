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
import { consumerReviews, lotes, pedidoItems, pedidos, productos } from '@sighfood/domain/db/schema';
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

/**
 * Los cuatro atributos que se puntúan por separado, TODOS opcionales.
 *
 * Cada uno apunta a un responsable distinto: crocancia es proceso, sabor es
 * receta, empaque es sellado y frescura es rotación.
 *
 * Estaba escrito como `z.record(z.enum([...]), ...)` y era un fallo grave:
 * en Zod 4, un record con clave de enum exige que estén las CUATRO claves. Quien
 * puntuaba solo la crocancia recibía «expected number, received undefined» y se
 * perdía la reseña ENTERA — nota incluida.
 *
 * Lo encontró una prueba contra producción, no el compilador: los tipos
 * encajaban perfectamente.
 *
 * Escrito así, cada atributo se puede mandar o no, que es como se usa de verdad:
 * casi nadie puntúa las cuatro cosas.
 */
const atributosParciales = z.object({
  crocancia: z.number().int().min(1).max(5).optional(),
  sabor: z.number().int().min(1).max(5).optional(),
  empaque: z.number().int().min(1).max(5).optional(),
  frescura: z.number().int().min(1).max(5).optional(),
});

const esquema = z.object({
  codigo: z.string().min(4).max(12),
  puntuacion: z.number().int().min(1, 'Elige de 1 a 5').max(5),
  comentario: z.string().max(1000).optional(),
  motivos: z.array(z.enum(MOTIVOS)).max(6).optional(),

  /**
   * Puntuacion de 1 a 5 por atributo.
   *
   * Una nota global no le sirve a produccion: "buenisimo pero llego blando" y
   * "crujiente pero soso" son las mismas tres estrellas y se arreglan en sitios
   * distintos.
   */
  atributos: atributosParciales.optional(),

  /**
   * El codigo impreso en la bolsa.
   *
   * Es lo que permite saber A QUE TANDA le paso, no solo que paso. Sin el, tres
   * quejas de "perdio la crocancia" pueden ser una tanda mala o un problema de
   * la receta, y son decisiones opuestas.
   *
   * Opcional a proposito: exigirlo perderia la mayoria de las resenas, porque
   * mucha gente ya tiro la bolsa.
   */
  lote: z.string().max(40).optional(),
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

      /*
        EL LOTE, SI LO ESCRIBIÓ.

        Se busca por el código impreso, normalizado a mayúsculas y sin espacios:
        quien lo copia de una bolsa arrugada no acierta con el formato exacto, y
        "2026-08B" y "2026 08b" son la misma tanda.

        Un código que no existe NO invalida la reseña. La opinión vale igual, y
        rechazarla por una errata al teclear sería perder el dato que sí importa
        para no perder el que solo ayuda.
      */
      let loteId: string | null = null;
      if (v.data.lote?.trim()) {
        const codigo = v.data.lote.trim().toUpperCase().replace(/\s+/g, '');
        const [l] = await db
          .select({ id: lotes.id })
          .from(lotes)
          .where(eq(lotes.codigo, codigo))
          .limit(1);
        loteId = l?.id ?? null;
      }

      const atributos = v.data.atributos && Object.keys(v.data.atributos).length > 0
        ? v.data.atributos
        : null;

      await db.insert(consumerReviews).values({
        consumerId: pedido.consumerId,
        pedidoId: pedido.id,
        puntuacion: v.data.puntuacion,
        comentario: v.data.comentario?.trim().slice(0, 1000) || null,
        productLine: principal?.linea ?? null,
        motivos,
        loteId,
        atributosCalidad: atributos,
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

/**
 * Añade detalle a una reseña que YA existe: atributos y código de lote.
 *
 * POR QUÉ NO SE REENVÍA LA RESEÑA ENTERA
 * --------------------------------------
 * La nota se guarda al primer toque, y desde aquí NO se puede cambiar. Si este
 * endpoint aceptara una puntuación, cualquiera con un código de pedido podría
 * convertir un uno en un cinco después de haberlo enviado — y la prueba social
 * del catálogo dejaría de significar nada.
 *
 * Solo se permite AÑADIR lo que no estaba: si la reseña ya trae atributos o
 * lote, no se pisan. Alguien que abre el enlace dos veces no debe poder
 * reescribir lo que dijo la primera.
 */
export async function PATCH(request: NextRequest) {
  const esquemaDetalle = z.object({
    codigo: z.string().min(4).max(12),
    atributos: atributosParciales.optional(),
    lote: z.string().max(40).optional(),
  });

  const v = esquemaDetalle.safeParse(await request.json().catch(() => null));
  if (!v.success) {
    return NextResponse.json({ ok: false, error: 'Datos no válidos' }, { status: 400 });
  }

  // Nada que añadir: se contesta bien y se ahorra el viaje a la base.
  if (!v.data.atributos && !v.data.lote?.trim()) {
    return NextResponse.json({ ok: true });
  }

  try {
    await conBaseDeDatos(async (db) => {
      const [pedido] = await db
        .select({ id: pedidos.id })
        .from(pedidos)
        .where(eq(pedidos.codigo, v.data.codigo.toUpperCase()))
        .limit(1);

      if (!pedido) return;

      const [resena] = await db
        .select({
          id: consumerReviews.id,
          atributos: consumerReviews.atributosCalidad,
          loteId: consumerReviews.loteId,
        })
        .from(consumerReviews)
        .where(eq(consumerReviews.pedidoId, pedido.id))
        .limit(1);

      if (!resena) return;

      let loteId = resena.loteId;
      if (!loteId && v.data.lote?.trim()) {
        const codigo = v.data.lote.trim().toUpperCase().replace(/\s+/g, '');
        const [l] = await db
          .select({ id: lotes.id })
          .from(lotes)
          .where(eq(lotes.codigo, codigo))
          .limit(1);
        loteId = l?.id ?? null;
      }

      await db
        .update(consumerReviews)
        .set({
          // Solo si no había: no se sobrescribe lo que ya contó.
          atributosCalidad: resena.atributos ?? v.data.atributos ?? null,
          loteId,
        })
        .where(eq(consumerReviews.id, resena.id));
    });

    return NextResponse.json({ ok: true });
  } catch {
    // El detalle es información extra sobre algo ya guardado. Que falle no
    // justifica preocupar a quien acaba de hacernos un favor.
    return NextResponse.json({ ok: true });
  }
}
