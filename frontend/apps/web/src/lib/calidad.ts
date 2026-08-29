// =============================================================================
// Control de calidad por lote
// =============================================================================
//
// LO QUE ESTE ARCHIVO RESPONDE
// ----------------------------
// «Tres personas dicen que perdió la crocancia. ¿Es la receta o fue una tanda?»
//
// Esa pregunta no se puede contestar mirando reseñas sueltas, y las dos
// respuestas llevan a decisiones opuestas: retirar un lote, o cambiar un
// producto que probablemente funciona bien.
//
// Agrupando por lote se ve enseguida. Tres quejas repartidas en tres tandas
// distintas es ruido; tres quejas del mismo código impreso es una tanda que hay
// que sacar de circulación.

import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { consumerReviews, lotes, productos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

/**
 * Los cuatro atributos que se puntúan.
 *
 * Son los que un snack empaquetado puede fallar, y cada uno apunta a un
 * responsable distinto: la crocancia es proceso, el sabor es receta, el empaque
 * es línea de sellado y la frescura es rotación de inventario.
 *
 * Una nota global de 3 estrellas no le dice nada a nadie. «Buenísimo pero llegó
 * blando» y «crujiente pero soso» son las mismas 3 estrellas y se arreglan en
 * sitios distintos.
 */
export const ATRIBUTOS = [
  { id: 'crocancia', etiqueta: 'Crocancia', responsable: 'Proceso' },
  { id: 'sabor', etiqueta: 'Sabor', responsable: 'Receta' },
  { id: 'empaque', etiqueta: 'Empaque', responsable: 'Sellado' },
  { id: 'frescura', etiqueta: 'Frescura', responsable: 'Rotación' },
] as const;

export type AtributoId = (typeof ATRIBUTOS)[number]['id'];

// -----------------------------------------------------------------------------
// El umbral de alerta
// -----------------------------------------------------------------------------

/**
 * Porcentaje de reseñas negativas que dispara la revisión de una tanda.
 *
 * Es la regla correcta CON VOLUMEN. Con cinco reseñas no lo es: una sola queja
 * da el 20% y se alertaría por cada cliente descontento que aparezca.
 */
export const PORCENTAJE_ALERTA = 2;

/** Reseñas mínimas antes de que un porcentaje signifique algo. */
export const MUESTRA_MINIMA = 20;

/**
 * Quejas que disparan alerta aunque no haya muestra suficiente.
 *
 * Tres personas distintas quejándose del MISMO lote es señal aunque solo haya
 * cinco reseñas. Sin esta regla, una tanda mala con pocas ventas no alertaría
 * nunca — y es justo cuando más a tiempo se está de retirarla.
 */
export const QUEJAS_ABSOLUTAS = 3;

export interface EstadoLote {
  alerta: boolean;
  motivo: string;
}

/**
 * ¿Hay que revisar esta tanda?
 *
 * Función pura y aparte para poder probarla: es la regla que decide si se
 * retira producto, y equivocarse en cualquiera de los dos sentidos cuesta
 * dinero. Alertar de más hace que se deje de mirar el panel; alertar de menos
 * deja producto malo en la calle.
 */
export function evaluarLote(datos: { resenas: number; negativas: number }): EstadoLote {
  if (datos.negativas >= QUEJAS_ABSOLUTAS) {
    return {
      alerta: true,
      motivo: `${datos.negativas} quejas sobre la misma tanda`,
    };
  }

  if (datos.resenas >= MUESTRA_MINIMA) {
    const pct = (datos.negativas / datos.resenas) * 100;
    if (pct > PORCENTAJE_ALERTA) {
      return {
        alerta: true,
        motivo: `${pct.toFixed(1)}% de reseñas negativas, por encima del ${PORCENTAJE_ALERTA}%`,
      };
    }
  }

  // Se dice POR QUÉ no hay alerta, no solo que no la hay: con pocas reseñas el
  // silencio puede confundirse con "va bien".
  if (datos.negativas > 0 && datos.resenas < MUESTRA_MINIMA) {
    return {
      alerta: false,
      motivo: `${datos.negativas} de ${datos.resenas} — muestra corta para concluir`,
    };
  }

  return { alerta: false, motivo: datos.resenas === 0 ? 'sin reseñas todavía' : 'sin incidencias' };
}

// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/**
 * Media de cada atributo sobre todas las reseñas que lo puntuaron.
 *
 * Se calcula en SQL y no en JavaScript porque el jsonb puede traer atributos
 * que ya no se preguntan, y recorrerlo aquí obligaría a traerse todas las
 * reseñas a memoria para promediar cuatro números.
 */
export async function mediasPorAtributo() {
  return conBaseDeDatos(async (db) => {
    const filas = await db.execute<{ atributo: string; media: number; n: number }>(sql`
      SELECT clave AS atributo,
             ROUND(AVG(valor::numeric), 2)::float8 AS media,
             COUNT(*)::int AS n
        FROM consumer_reviews,
             LATERAL jsonb_each_text(atributos_calidad) AS t(clave, valor)
       WHERE atributos_calidad IS NOT NULL
         AND valor ~ '^[1-5]$'
       GROUP BY clave
    `);

    const lista = (Array.isArray(filas) ? filas : (filas as { rows?: unknown[] }).rows ?? []) as Array<{
      atributo: string;
      media: number;
      n: number;
    }>;

    // Se devuelven SIEMPRE los cuatro, en su orden, aunque nadie los haya
    // puntuado: una tabla a la que le faltan filas se lee como si el atributo no
    // existiera, en vez de como que aún no hay datos.
    return ATRIBUTOS.map((a) => {
      const f = lista.find((x) => x.atributo === a.id);
      return {
        ...a,
        media: f ? Number(f.media) : null,
        respuestas: f ? Number(f.n) : 0,
      };
    });
  });
}

/** Cada lote con sus reseñas, su nota y si hay que revisarlo. */
export async function lotesConCalidad() {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select({
        id: lotes.id,
        codigo: lotes.codigo,
        producidoEn: lotes.producidoEn,
        venceEn: lotes.venceEn,
        unidades: lotes.unidades,
        retirado: lotes.retirado,
        motivoRetiro: lotes.motivoRetiro,
        producto: productos.nombre,
        resenas: sql<number>`COUNT(${consumerReviews.id})::int`,
        media: sql<number>`COALESCE(ROUND(AVG(${consumerReviews.puntuacion})::numeric, 2), 0)::float8`,
        // Negativa = 3 estrellas o menos. Es el mismo corte que levanta la
        // alerta individual al guardar la reseña.
        negativas: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.puntuacion} <= 3)::int`,
        fallos: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.categoria} IN ('fallo_cocina','fallo_logistica'))::int`,
      })
      .from(lotes)
      .leftJoin(consumerReviews, eq(consumerReviews.loteId, lotes.id))
      .leftJoin(productos, eq(productos.id, lotes.productoId))
      .groupBy(
        lotes.id,
        lotes.codigo,
        lotes.producidoEn,
        lotes.venceEn,
        lotes.unidades,
        lotes.retirado,
        lotes.motivoRetiro,
        productos.nombre
      )
      .orderBy(desc(lotes.producidoEn));

    return filas.map((l) => ({
      ...l,
      resenas: Number(l.resenas),
      negativas: Number(l.negativas),
      fallos: Number(l.fallos),
      media: Number(l.media),
      estado: evaluarLote({ resenas: Number(l.resenas), negativas: Number(l.negativas) }),
    }));
  });
}

/** Reparto por categoría: preferencia, fallo, sugerencia o elogio. */
export async function repartoPorCategoria() {
  return conBaseDeDatos(async (db) => {
    const [f] = await db
      .select({
        elogio: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.categoria} = 'elogio')::int`,
        preferencia: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.categoria} = 'preferencia')::int`,
        sugerencia: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.categoria} = 'sugerencia')::int`,
        falloCocina: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.categoria} = 'fallo_cocina')::int`,
        falloLogistica: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.categoria} = 'fallo_logistica')::int`,
        sinClasificar: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.categoria} IS NULL)::int`,
      })
      .from(consumerReviews);

    const n = (v: unknown) => Number(v ?? 0);
    const fallos = n(f?.falloCocina) + n(f?.falloLogistica);

    return {
      elogio: n(f?.elogio),
      preferencia: n(f?.preferencia),
      sugerencia: n(f?.sugerencia),
      falloCocina: n(f?.falloCocina),
      falloLogistica: n(f?.falloLogistica),
      fallos,
      sinClasificar: n(f?.sinClasificar),
      /*
        La cifra que de verdad importa del panel.

        Separa lo que hay que ARREGLAR de lo que solo hay que ESCUCHAR. Un
        cliente al que no le gusta el picante no es un defecto de fabricación, y
        contarlo como tal lleva a suavizar un producto que a los demás les gusta
        justo así.
      */
      defectos: fallos,
      subjetivas: n(f?.preferencia) + n(f?.sugerencia),
    };
  });
}

/** Busca un lote por el código impreso en la bolsa. */
export async function loteporCodigo(codigo: string) {
  const limpio = codigo.trim().toUpperCase().replace(/\s+/g, '');
  if (!limpio) return null;

  const [l] = await conBaseDeDatos((db) =>
    db.select().from(lotes).where(eq(lotes.codigo, limpio)).limit(1)
  );
  return l ?? null;
}

/** Las sugerencias de producto, que es lo que dice qué fabricar después. */
export async function sugerenciasRecientes(limite = 20) {
  return conBaseDeDatos((db) =>
    db
      .select({
        id: consumerReviews.id,
        comentario: consumerReviews.comentario,
        puntuacion: consumerReviews.puntuacion,
        fecha: consumerReviews.createdAt,
        linea: consumerReviews.productLine,
      })
      .from(consumerReviews)
      .where(
        and(eq(consumerReviews.categoria, 'sugerencia'), isNotNull(consumerReviews.comentario))
      )
      .orderBy(desc(consumerReviews.createdAt))
      .limit(limite)
  );
}
