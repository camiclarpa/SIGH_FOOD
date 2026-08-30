// =============================================================================
// El embudo: de escanear a comprar
// =============================================================================
//
// SOBRE "CONVERSIÓN ANÓNIMO → REGISTRO"
// --------------------------------------
// Se pidió como métrica y no existe en este sistema, y merece explicarse en vez
// de fingir un dato que no hay: escanear un QR YA exige el teléfono para
// registrar el momento. No hay un estado "anónimo" intermedio del que convertir
// — la ficha del comensal (`b2c_consumers`) se crea en el propio escaneo.
//
// La pregunta de negocio que sí tiene sentido, y que aquí se responde, es otra:
// de quien solo ha ESCANEADO —en un bar, o una bolsa en casa— ¿cuántos llegan a
// COMPRAR directo en la tienda? Esa sí es la tracción real del canal físico al
// digital, y es lo que mide `conversionAPedido()`.

import { sql } from 'drizzle-orm';
import { conBaseDeDatos } from '@/lib/cloudflare';

export interface EmbudoConversion {
  /** Comensales con al menos un momento sensorial registrado. */
  escanearon: number;
  /** De esos, cuántos llegaron a tener al menos un pedido. */
  compraron: number;
  /** compraron / escanearon, en un entero de 0 a 100. */
  tasa: number;
  /** Días de mediana entre el primer escaneo y el primer pedido de quien convirtió. */
  diasMedianaHastaCompra: number | null;
}

/**
 * De quien escanea, ¿cuántos acaban comprando en la tienda?
 *
 * Se usa la MEDIANA y no el promedio para el tiempo hasta la compra: un solo
 * comensal que tardó ocho meses en volver desplazaría el promedio entero y
 * haría parecer lento un embudo que en realidad convierte rápido. La mediana no
 * se deja arrastrar por ese caso suelto.
 */
export async function conversionAPedido(): Promise<EmbudoConversion> {
  return conBaseDeDatos(async (db) => {
    const [fila] = await db.execute<{
      escanearon: number;
      compraron: number;
      dias_mediana: number | null;
    }>(sql`
      WITH primer_momento AS (
        SELECT consumer_id, MIN(scanned_at) AS momento
          FROM sensory_moments
         WHERE consumer_id IS NOT NULL
         GROUP BY consumer_id
      ),
      primer_pedido AS (
        /*
          Solo pedidos ENTREGADOS, y no cualquier pedido creado.

          Un pedido cancelado no demuestra que el canal físico trajera un
          cliente — demuestra que alguien empezó un checkout y se arrepintió.
          Contarlo como conversión inflaría la tasa con algo que nunca llegó a
          ser una venta.
        */
        SELECT consumer_id, MIN(created_at) AS pedido
          FROM pedidos
         WHERE consumer_id IS NOT NULL AND estado = 'entregado'
         GROUP BY consumer_id
      )
      SELECT
        COUNT(*)::int AS escanearon,
        COUNT(*) FILTER (WHERE pp.pedido IS NOT NULL AND pp.pedido >= pm.momento)::int AS compraron,
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (pp.pedido - pm.momento)) / 86400.0
        ) FILTER (WHERE pp.pedido IS NOT NULL AND pp.pedido >= pm.momento) AS dias_mediana
      FROM primer_momento pm
      LEFT JOIN primer_pedido pp ON pp.consumer_id = pm.consumer_id
    `);

    const salida = (Array.isArray(fila) ? fila[0] : fila) as
      | { escanearon: number; compraron: number; dias_mediana: number | null }
      | undefined;

    const escanearon = Number(salida?.escanearon ?? 0);
    const compraron = Number(salida?.compraron ?? 0);

    return {
      escanearon,
      compraron,
      tasa: escanearon > 0 ? Math.round((compraron / escanearon) * 100) : 0,
      diasMedianaHastaCompra:
        salida?.dias_mediana !== null && salida?.dias_mediana !== undefined
          ? Math.round(Number(salida.dias_mediana) * 10) / 10
          : null,
    };
  });
}

/** Comensales que escanearon hace más de 21 días y no han vuelto a escanear. */
export const DIAS_INACTIVIDAD_MOMENTO = 21;

export interface RecuperacionInactividad {
  id: string;
  telefono: string;
  nombre: string | null;
  ultimoMomento: Date;
}

/**
 * Quién no registra un momento hace más de 21 días.
 *
 * No mira si tiene pedidos: esta es la señal de "dejó de consumir el producto",
 * que puede pasar aunque siga pidiendo por la tienda —alguien que ahora compra
 * sin escanear la bolsa igual sigue siendo cliente—. Mezclar las dos señales
 * dispararía una recuperación a quien en realidad sigue activo.
 */
export async function pendientesDeRecuperar(): Promise<RecuperacionInactividad[]> {
  return conBaseDeDatos(async (db) => {
    /*
      El corte se calcula DENTRO del SQL, no se interpola un objeto Date de JS.

      Fallaba en producción — "Failed query" contra Hyperdrive — y no en las
      pruebas locales contra Neon directo con el cliente `postgres` puro: el
      mismo Date que ese cliente serializa sin problema, Drizzle lo envía de otra
      forma a través de `db.execute()` sobre el binding de Cloudflare Workers.

      `now() - interval` es además más simple: es exactamente lo que ya usan
      cocina.ts y el resto de consultas de este proyecto que sí funcionan en
      producción, así que se sigue el patrón que está probado en vez de uno
      nuevo.
    */
    const filas = await db.execute<{
      id: string;
      whatsapp_phone: string;
      full_name: string | null;
      ultimo: string;
    }>(sql`
      SELECT c.id, c.whatsapp_phone, c.full_name, MAX(m.scanned_at) AS ultimo
        FROM b2c_consumers c
        JOIN sensory_moments m ON m.consumer_id = c.id
       GROUP BY c.id, c.whatsapp_phone, c.full_name
      HAVING MAX(m.scanned_at) < now() - (${DIAS_INACTIVIDAD_MOMENTO} || ' days')::interval
       ORDER BY MAX(m.scanned_at) ASC
       LIMIT 200
    `);

    const lista = (Array.isArray(filas) ? filas : (filas as { rows?: unknown[] }).rows ?? []) as Array<{
      id: string;
      whatsapp_phone: string;
      full_name: string | null;
      ultimo: string;
    }>;

    return lista.map((f) => ({
      id: f.id,
      telefono: f.whatsapp_phone,
      nombre: f.full_name,
      ultimoMomento: new Date(f.ultimo),
    }));
  });
}
