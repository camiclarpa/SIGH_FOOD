// =============================================================================
// RFM y riesgo de abandono, calculados
// =============================================================================
//
// Esto sustituye al `churnScore` que devolvía el modelo de lenguaje.
//
// Pedirle a un LLM "dame la probabilidad de abandono entre 0 y 1" produce un
// número que parece una predicción y no lo es: no está calibrado contra ningún
// resultado real, cambia entre llamadas con la misma entrada, no se puede
// explicar y cuesta dinero cada vez. Lo peor no es que sea impreciso, es que
// nadie puede saber cuánto lo es.
//
// Lo de aquí son tres agregados y una división. Se puede auditar, sale igual
// dos veces seguidas, cuesta una consulta y se le puede explicar a quien
// pregunte por qué su cliente aparece en riesgo.
//
// LA DEFINICIÓN DE ABANDONO
// -------------------------
// Recencia mayor que 1,5 veces el intervalo habitual de ESA persona.
//
// El intervalo habitual es propio de cada uno y por eso funciona: quien pide
// todos los viernes está en riesgo a los diez días, y quien pide una vez al mes
// no lo está hasta los cuarenta y cinco. Un umbral fijo —"treinta días sin
// comprar"— trataría igual a los dos y daría la alarma tarde para el primero y
// en falso para el segundo.
//
// Se usa la MEDIANA y no la media: una sola compra rara —un pedido grande para
// una fiesta, seis meses antes— arrastra la media y esconde a alguien que en
// realidad viene cada semana.

import { sql } from 'drizzle-orm';
import type { Database } from '@sighfood/domain/db';

/** Cuántas veces su intervalo habitual tiene que pasar para considerarlo en riesgo. */
export const FACTOR_RIESGO = 1.5;

/**
 * Pedidos mínimos para poder hablar de "intervalo habitual".
 *
 * Con uno solo no hay intervalo. Con dos hay uno, que puede ser cualquier cosa.
 * A partir de tres la mediana empieza a significar algo. Por debajo de eso el
 * segmento es 'nuevo' y no se le calcula riesgo: decir que alguien con un
 * pedido está "en riesgo" es ruido, no información.
 */
export const PEDIDOS_MINIMOS_PARA_RIESGO = 3;

export type SegmentoRFM =
  | 'campeon'      // compra mucho, gasta mucho y vino hace poco
  | 'leal'         // vuelve con regularidad
  | 'prometedor'   // pocos pedidos pero recientes
  | 'nuevo'        // aún no hay historial para juzgar
  | 'en_riesgo'    // lleva más de lo suyo sin aparecer
  | 'dormido';     // hace mucho que se fue

export interface FilaRFM {
  consumerId: string;
  nombre: string | null;
  telefono: string;
  /** Días desde el último pedido entregado. */
  recencia: number | null;
  /** Pedidos entregados en total. */
  frecuencia: number;
  /** Pesos gastados en total. */
  monetario: number;
  /** Mediana de días entre sus pedidos. Null si no tiene suficientes. */
  intervaloHabitual: number | null;
  /**
   * Cuánto lleva de retraso respecto a lo suyo: 1 = justo a tiempo,
   * 2 = el doble de lo que suele tardar. Null si no se puede calcular.
   */
  retraso: number | null;
  enRiesgo: boolean;
  segmento: SegmentoRFM;
}

/**
 * Clasifica a partir de los números ya calculados.
 *
 * Función pura y aparte para poder probarla sin base de datos: el orden de las
 * ramas ES la política comercial, y conviene poder cambiarla mirando una tabla
 * de casos en vez de una consulta.
 */
export function clasificar(datos: {
  recencia: number | null;
  frecuencia: number;
  monetario: number;
  retraso: number | null;
}): { segmento: SegmentoRFM; enRiesgo: boolean } {
  // Sin pedidos entregados no hay nada que clasificar.
  if (datos.frecuencia === 0 || datos.recencia === null) {
    return { segmento: 'nuevo', enRiesgo: false };
  }

  // Se mira el riesgo ANTES que el valor: alguien que gastaba mucho y lleva el
  // triple de lo suyo sin aparecer es el caso más urgente que existe, y
  // clasificarlo como 'campeón' por lo que gastó el mes pasado es justo el
  // error que hace perder al mejor cliente sin enterarse.
  if (datos.retraso !== null && datos.retraso >= FACTOR_RIESGO) {
    // Muy pasado de vuelta ya no es "en riesgo", es que se fue. Se separan
    // porque piden mensajes distintos: a uno se le recuerda, al otro se le
    // reconquista.
    return { segmento: datos.retraso >= 3 ? 'dormido' : 'en_riesgo', enRiesgo: true };
  }

  if (datos.frecuencia < PEDIDOS_MINIMOS_PARA_RIESGO) {
    return { segmento: 'prometedor', enRiesgo: false };
  }

  // El corte de campeón es por frecuencia Y gasto: solo por gasto, un único
  // pedido enorme de una fiesta convertiría en campeón a quien no ha vuelto.
  if (datos.frecuencia >= 5 && datos.monetario >= 200_000) {
    return { segmento: 'campeon', enRiesgo: false };
  }

  return { segmento: 'leal', enRiesgo: false };
}

/**
 * RFM de todos los comensales con al menos un pedido entregado.
 *
 * Todo el cálculo ocurre en Postgres. Traerse los pedidos para agrupar en
 * JavaScript crecería con el historial completo del negocio, y esto se pinta en
 * una pantalla que se abre a diario.
 *
 * `percentile_cont` da la mediana de los huecos entre pedidos consecutivos, que
 * es el intervalo habitual de cada persona.
 */
export async function tablaRFM(db: Database, limite = 500): Promise<FilaRFM[]> {
  const filas = await db.execute<{
    consumer_id: string;
    nombre: string | null;
    telefono: string;
    recencia: number | null;
    frecuencia: number;
    monetario: number;
    intervalo_habitual: number | null;
  }>(sql`
    WITH entregados AS (
      SELECT
        p.consumer_id,
        p.created_at,
        p.total_cop,
        -- Días desde el pedido anterior de la MISMA persona.
        EXTRACT(EPOCH FROM (
          p.created_at - LAG(p.created_at) OVER (
            PARTITION BY p.consumer_id ORDER BY p.created_at
          )
        )) / 86400.0 AS hueco
      FROM pedidos p
      WHERE p.estado = 'entregado' AND p.consumer_id IS NOT NULL
    )
    SELECT
      c.id                                       AS consumer_id,
      c.full_name                                AS nombre,
      c.whatsapp_phone                           AS telefono,
      EXTRACT(DAY FROM (now() - MAX(e.created_at)))::int  AS recencia,
      COUNT(*)::int                              AS frecuencia,
      COALESCE(SUM(e.total_cop), 0)::int         AS monetario,
      -- Mediana, no media: un pedido raro de hace meses arrastra la media y
      -- esconde a quien en realidad viene cada semana.
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY e.hueco))::int AS intervalo_habitual
    FROM entregados e
    JOIN b2c_consumers c ON c.id = e.consumer_id
    GROUP BY c.id, c.full_name, c.whatsapp_phone
    ORDER BY monetario DESC
    LIMIT ${limite}
  `);

  // postgres.js devuelve las filas como un array, no envueltas en `.rows`.
  return filas.map((f) => {
    const frecuencia = Number(f.frecuencia ?? 0);
    const recencia = f.recencia === null ? null : Number(f.recencia);
    const intervalo =
      f.intervalo_habitual === null || frecuencia < PEDIDOS_MINIMOS_PARA_RIESGO
        ? null
        : Number(f.intervalo_habitual);

    // Un intervalo de 0 días —dos pedidos el mismo día— no se puede usar como
    // divisor: daría un retraso infinito y marcaría en riesgo a quien acaba de
    // pedir dos veces seguidas.
    const retraso =
      intervalo !== null && intervalo > 0 && recencia !== null
        ? Number((recencia / intervalo).toFixed(2))
        : null;

    const monetario = Number(f.monetario ?? 0);
    const { segmento, enRiesgo } = clasificar({ recencia, frecuencia, monetario, retraso });

    return {
      consumerId: f.consumer_id,
      nombre: f.nombre,
      telefono: f.telefono,
      recencia,
      frecuencia,
      monetario,
      intervaloHabitual: intervalo,
      retraso,
      enRiesgo,
      segmento,
    };
  });
}

/** Cuántos hay en cada segmento. Para la cabecera del panel de clientes. */
export function repartoPorSegmento(filas: FilaRFM[]): Record<SegmentoRFM, number> {
  const base: Record<SegmentoRFM, number> = {
    campeon: 0, leal: 0, prometedor: 0, nuevo: 0, en_riesgo: 0, dormido: 0,
  };
  for (const f of filas) base[f.segmento]++;
  return base;
}

export const ETIQUETAS_SEGMENTO: Record<SegmentoRFM, string> = {
  campeon: 'Campeón',
  leal: 'Leal',
  prometedor: 'Prometedor',
  nuevo: 'Nuevo',
  en_riesgo: 'En riesgo',
  dormido: 'Dormido',
};
