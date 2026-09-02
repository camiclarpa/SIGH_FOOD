// =============================================================================
// Quién pertenece a cada segmento
// =============================================================================
//
// Había siete segmentos definidos —Noctámbulos, Amantes del picante, En riesgo
// de olvido…— con sus reglas bien pensadas, y CERO comensales asignados a
// ninguno. La tabla `consumer_segments` no la escribía nadie.
//
// El efecto no era solo una pantalla vacía: las secuencias de Mensajería tienen
// un campo `targetSegment`, así que una campaña dirigida a "En riesgo de olvido"
// no habría encontrado nunca a quién mandarla. La segmentación era decorativa.
//
// Esto es el proceso que faltaba. Lo ejecuta el cron diario, antes de evaluar
// las secuencias: si se hiciera después, una campaña saldría con el reparto de
// ayer.
//
// DINÁMICO SIGNIFICA QUE TAMBIÉN SE SALE
// --------------------------------------
// Un segmento dinámico no es una lista a la que se entra y se queda uno para
// siempre. Quien vuelve a pedir deja de estar "en riesgo de olvido", y si no se
// le saca seguiría recibiendo mensajes de reactivación después de haber vuelto
// — que es la forma más rápida de que alguien silencie el número.
//
// Por eso cada pasada recalcula la pertenencia entera y borra las que ya no
// aplican. Los segmentos marcados como 'manual' no se tocan: si alguien metió a
// una persona a mano, un proceso automático no puede sacarla.

import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import {
  b2cConsumers,
  consumerSegments,
  segments,
  sensoryMoments,
  pedidos,
} from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { tablaRFM, type SegmentoRFM } from '@/lib/rfm';
import { ZONA_NEGOCIO } from '@/lib/fidelizacion';

/**
 * La regla de un segmento.
 *
 * `segmentoRfm` es la que se añade ahora: permite que un segmento se apoye en el
 * cálculo de valor —campeón, en riesgo, dormido— en vez de en escaneos. Es lo
 * que el plan llama "segmentación automática por valor".
 */
export interface ReglaSegmento {
  lineaProducto?: string;
  zona?: string;
  franjaDesde?: number;
  franjaHasta?: number;
  minEscaneos?: number;
  diasInactivo?: number;
  nivel?: string;
  /** Se apoya en RFM en lugar de en escaneos. */
  segmentoRfm?: SegmentoRFM;
  /** Pedidos entregados mínimos. Alta frecuencia. */
  minPedidos?: number;
  /** Gasto acumulado mínimo, en pesos. Alto ticket. */
  minGasto?: number;
}

export interface ResultadoSegmento {
  segmento: string;
  miembros: number;
  entraron: number;
  salieron: number;
  motivo?: string;
}

/**
 * Quién cumple la regla de un segmento.
 *
 * Devuelve identificadores. Se separa de la escritura para poder comprobar a
 * quién va a coger una regla nueva antes de aplicarla — una regla mal puesta
 * que mete a todo el mundo en "Dormidos" se descubre demasiado tarde si lo
 * primero que hace es escribir.
 */
export async function miembrosDe(
  db: Database,
  regla: ReglaSegmento,
  rfm: Awaited<ReturnType<typeof tablaRFM>>
): Promise<string[]> {
  // --- Reglas de VALOR: se resuelven con lo que ya calculó RFM ---
  if (regla.segmentoRfm) {
    return rfm.filter((f) => f.segmento === regla.segmentoRfm).map((f) => f.consumerId);
  }

  if (regla.minPedidos !== undefined || regla.minGasto !== undefined) {
    return rfm
      .filter(
        (f) =>
          (regla.minPedidos === undefined || f.frecuencia >= regla.minPedidos) &&
          (regla.minGasto === undefined || f.monetario >= regla.minGasto)
      )
      .map((f) => f.consumerId);
  }

  // --- Reglas de CONSUMO: se resuelven contra los escaneos en mesa ---
  const condiciones = [];

  if (regla.nivel) condiciones.push(eq(b2cConsumers.membershipTier, regla.nivel as never));

  if (regla.lineaProducto) {
    // `b2c_consumers.id` va literal, NO como `${b2cConsumers.id}`: drizzle
    // compila esa referencia SIN calificar la tabla dentro de una subconsulta
    // correlacionada (sale "id" a secas, no "b2c_consumers"."id"), y como
    // `sensory_moments` también tiene su propia columna `id`, Postgres la
    // resuelve contra la fila interna en vez de la externa — la condición
    // nunca hacía match. Bug real y confirmado con datos de producción: toda
    // esta función llevaba dando 0 miembros para cualquier regla de consumo.
    condiciones.push(sql`EXISTS (
      SELECT 1 FROM ${sensoryMoments} m
      WHERE m.consumer_id = b2c_consumers.id AND m.product_line = ${regla.lineaProducto}
    )`);
  }

  if (regla.minEscaneos !== undefined) {
    condiciones.push(sql`(
      SELECT count(*) FROM ${sensoryMoments} m WHERE m.consumer_id = b2c_consumers.id
    ) >= ${regla.minEscaneos}`);
  }

  if (regla.franjaDesde !== undefined && regla.franjaHasta !== undefined) {
    // La franja puede cruzar la medianoche (22-4), así que no basta con
    // comparar desde <= hora <= hasta. Y la hora se lee en el huso del negocio:
    // sin AT TIME ZONE, un escaneo de las 23:30 cuenta como las 4 de la mañana.
    const { franjaDesde: d, franjaHasta: h } = regla;
    const dentro =
      d <= h
        ? sql`hora BETWEEN ${d} AND ${h}`
        : sql`(hora >= ${d} OR hora <= ${h})`;

    condiciones.push(sql`EXISTS (
      SELECT 1 FROM (
        SELECT EXTRACT(HOUR FROM (m.scanned_at AT TIME ZONE ${sql.raw(`'${ZONA_NEGOCIO}'`)}))::int AS hora
        FROM ${sensoryMoments} m WHERE m.consumer_id = b2c_consumers.id
      ) f WHERE ${dentro}
    )`);
  }

  if (regla.diasInactivo !== undefined) {
    /*
      Inactivo se mide contra CUALQUIER señal de vida, escaneo o pedido.

      Mirar solo los escaneos marcaría como dormido a quien lleva meses pidiendo
      a domicilio sin pisar el local — y mandarle un "te echamos de menos" a un
      cliente que compró ayer es la clase de error que hace que la gente deje de
      leer los mensajes.
    */
    condiciones.push(sql`COALESCE(
      GREATEST(
        (SELECT max(m.scanned_at) FROM ${sensoryMoments} m WHERE m.consumer_id = b2c_consumers.id),
        (SELECT max(p.created_at) FROM ${pedidos} p WHERE p.consumer_id = b2c_consumers.id)
      ),
      ${b2cConsumers.createdAt}
    ) < now() - ${sql.raw(`interval '${Number(regla.diasInactivo)} days'`)}`);
  }

  // Una regla vacía cogería a TODOS. Es casi siempre un error de configuración,
  // y aplicarla mandaría una campaña a la base entera.
  if (condiciones.length === 0) return [];

  const filas = await db
    .select({ id: b2cConsumers.id })
    .from(b2cConsumers)
    .where(and(...condiciones));

  return filas.map((f) => f.id);
}

/**
 * Recalcula la pertenencia de todos los segmentos dinámicos.
 *
 * Nunca lanza: devuelve el detalle de cada uno. Un segmento con una regla rota
 * no puede impedir que se recalculen los demás.
 */
export async function recalcularSegmentos(): Promise<ResultadoSegmento[]> {
  return conBaseDeDatos(async (db) => {
    const [definiciones, rfm] = await Promise.all([
      db.select().from(segments).where(eq(segments.activo, true)),
      tablaRFM(db, 2000),
    ]);

    const resultados: ResultadoSegmento[] = [];

    for (const def of definiciones) {
      const base: ResultadoSegmento = { segmento: def.nombre, miembros: 0, entraron: 0, salieron: 0 };

      // Los manuales no se tocan: si alguien metió a una persona a mano, un
      // proceso automático no tiene por qué saber más que ella.
      if (def.tipo !== 'dinamico') {
        resultados.push({ ...base, motivo: 'manual: no se recalcula' });
        continue;
      }

      try {
        const deben = await miembrosDe(db, (def.regla ?? {}) as ReglaSegmento, rfm);
        base.miembros = deben.length;

        if (deben.length > 0) {
          const insertados = await db
            .insert(consumerSegments)
            .values(deben.map((consumerId) => ({ consumerId, segmentId: def.id })))
            // El índice único (consumer, segment) es la garantía real; esto solo
            // evita que salte el error en la reejecución diaria.
            .onConflictDoNothing()
            .returning({ id: consumerSegments.id });
          base.entraron = insertados.length;
        }

        // Y los que ya no cumplen, fuera. Ver la cabecera: quien volvió a pedir
        // debe salir de "en riesgo", o seguirá recibiendo reactivaciones.
        const fuera = await db
          .delete(consumerSegments)
          .where(
            and(
              eq(consumerSegments.segmentId, def.id),
              deben.length > 0
                ? notInArray(consumerSegments.consumerId, deben)
                : sql`true`
            )
          )
          .returning({ id: consumerSegments.id });
        base.salieron = fuera.length;
      } catch (e) {
        base.motivo = e instanceof Error ? e.message : 'error al evaluar la regla';
        log.error('Fallo al recalcular un segmento', e, {
          ruta: '/segmentacion',
          detalle: def.nombre,
        });
      }

      resultados.push(base);
    }

    return resultados;
  });
}

/** Segmentos a los que pertenece un comensal. Para su ficha. */
export async function segmentosDe(db: Database, consumerId: string) {
  return db
    .select({ id: segments.id, nombre: segments.nombre, color: segments.color })
    .from(consumerSegments)
    .innerJoin(segments, eq(segments.id, consumerSegments.segmentId))
    .where(eq(consumerSegments.consumerId, consumerId));
}

/** Ids de los comensales de un segmento, por su nombre. Lo usa Mensajería. */
export async function comensalesDelSegmentoPorNombre(
  db: Database,
  nombre: string
): Promise<string[]> {
  const filas = await db
    .select({ id: consumerSegments.consumerId })
    .from(consumerSegments)
    .innerJoin(segments, eq(segments.id, consumerSegments.segmentId))
    .where(eq(segments.nombre, nombre));

  return filas.map((f) => f.id);
}
