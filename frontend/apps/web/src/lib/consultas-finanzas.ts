// =============================================================================
// Dashboard financiero — combina caja, COGS y pasivo de puntos
// =============================================================================
//
// No recalcula nada por su cuenta: cada cifra sale de la función que ya la
// posee (cogsRealizado en consultas-inventario.ts, costoFidelizacionRealizado
// y el pasivo vivo en consultas-b2c.ts, sesionAbierta en consultas-caja.ts).
// Esto es solo el punto donde se juntan para una sola pantalla.
//
// OJO al tocar este archivo: un `Date` de JS interpolado directo en un `sql`
// crudo revienta bajo Hyperdrive (fetch_types: false no sabe serializarlo) —
// usa gte()/between() sobre la columna en vez de meterlo en una plantilla
// `sql`. Y las funciones que abren su propia conexión (cogsRealizado,
// sesionAbierta) se llaman aquí en su variante "con db" para no anidar una
// segunda conexión de Hyperdrive dentro de este Promise.all. Los dos fueron
// bugs reales encontrados al probar /finanzas en producción.

import { and, gte, sql } from 'drizzle-orm';
import { b2cConsumers, pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { conRespaldo } from '@/lib/respaldo';
import { costoFidelizacionRealizado, VALOR_PUNTO_COP } from '@/lib/consultas-b2c';
import { cogsRealizado } from '@/lib/consultas-inventario';
import { sesionAbiertaConDb } from '@/lib/consultas-caja';

/**
 * Sobre qué % del ingreso de 30 días móviles se mide la alerta del pasivo de
 * puntos. Decisión de negocio, no un dato calculado — igual que
 * VALOR_PUNTO_COP.
 */
export const UMBRAL_PASIVO_PORCENTAJE = 5;

export async function resumenFinanciero() {
  return conRespaldo('finanzas:resumen', () => conBaseDeDatos(async (db) => {
    const hoyBogota = sql`(now() AT TIME ZONE 'America/Bogota')::date`;
    const diaDelPedido = sql`(${pedidos.createdAt} AT TIME ZONE 'America/Bogota')::date`;
    const cuenta = sql`${pedidos.estado} <> 'cancelado'`;

    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const hace30dias = new Date(ahora.getTime() - 30 * 86_400_000);
    const hace14dias = new Date(ahora.getTime() - 14 * 86_400_000);

    const [
      [ventasHoyPorCanal],
      [ventasMes],
      [ventas30dias],
      [ventas14dias],
      serieProyeccion,
      cogsMes,
      cogsFidelizacionMes,
      puntosVivos,
      caja,
    ] = await Promise.all([
      db
        .select({
          efectivo: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta} AND ${pedidos.metodoPago} = 'efectivo'), 0)::int`,
          digital: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta} AND ${pedidos.metodoPago} <> 'efectivo'), 0)::int`,
          bruto: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta}), 0)::int`,
          descuentos: sql<number>`COALESCE(SUM(${pedidos.descuentoCOP}) FILTER (WHERE ${cuenta}), 0)::int`,
        })
        .from(pedidos)
        .where(sql`${diaDelPedido} = ${hoyBogota}`),

      db
        .select({ total: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta}), 0)::int` })
        .from(pedidos)
        .where(and(cuenta, gte(pedidos.createdAt, inicioMes))),

      db
        .select({ total: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta}), 0)::int` })
        .from(pedidos)
        .where(and(cuenta, gte(pedidos.createdAt, hace30dias))),

      db
        .select({ total: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta}), 0)::int` })
        .from(pedidos)
        .where(and(cuenta, gte(pedidos.createdAt, hace14dias))),

      // Serie de 14 días para calcular el promedio móvil de la proyección —
      // mismo patrón generate_series que resumenVentas() en cocina.ts.
      db.execute<{ dia: string; ventas: number }>(sql`
        SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
               COALESCE(SUM(p.total_cop) FILTER (WHERE p.estado <> 'cancelado'), 0)::int AS ventas
          FROM generate_series(${hoyBogota} - 13, ${hoyBogota}, interval '1 day') AS d(dia)
          LEFT JOIN pedidos p
            ON (p.created_at AT TIME ZONE 'America/Bogota')::date = d.dia
         GROUP BY d.dia
         ORDER BY d.dia
      `),

      cogsRealizado(db, inicioMes, ahora),
      costoFidelizacionRealizado(db, inicioMes, ahora),

      db
        .select({ total: sql<number>`COALESCE(SUM(${b2cConsumers.points}), 0)::int` })
        .from(b2cConsumers),

      sesionAbiertaConDb(db),
    ]);

    const ventasMesTotal = Number(ventasMes?.total ?? 0);
    const margenBrutoCOP = ventasMesTotal - cogsMes;
    const margenBrutoPorcentaje = ventasMesTotal > 0 ? Math.round((margenBrutoCOP / ventasMesTotal) * 1000) / 10 : null;

    const pasivoPuntosCop = Number(puntosVivos[0]?.total ?? 0) * VALOR_PUNTO_COP;
    const ventas30 = Number(ventas30dias?.total ?? 0);
    const pasivoSobreVentasPorcentaje = ventas30 > 0 ? Math.round((pasivoPuntosCop / ventas30) * 1000) / 10 : null;

    // Promedio móvil de 14 días × 30, la misma lógica que pidió el negocio.
    const filas14 = (Array.isArray(serieProyeccion) ? serieProyeccion : (serieProyeccion as { rows?: unknown[] }).rows ?? []) as Array<{ dia: string; ventas: number }>;
    const promedioDiario = filas14.length > 0
      ? filas14.reduce((acc, f) => acc + Number(f.ventas), 0) / filas14.length
      : 0;
    const proyeccion30dias = Math.round(promedioDiario * 30);

    return {
      hoy: {
        efectivoCOP: Number(ventasHoyPorCanal?.efectivo ?? 0),
        digitalCOP: Number(ventasHoyPorCanal?.digital ?? 0),
        brutoCOP: Number(ventasHoyPorCanal?.bruto ?? 0),
        descuentosCOP: Number(ventasHoyPorCanal?.descuentos ?? 0),
        netoCOP: Number(ventasHoyPorCanal?.bruto ?? 0) - Number(ventasHoyPorCanal?.descuentos ?? 0),
      },
      mes: {
        ventasCOP: ventasMesTotal,
        cogsCOP: cogsMes,
        margenBrutoCOP,
        margenBrutoPorcentaje,
        costoFidelizacionCOP: cogsFidelizacionMes,
      },
      pasivoPuntos: {
        cop: pasivoPuntosCop,
        ventas30diasCOP: ventas30,
        porcentajeSobreVentas30dias: pasivoSobreVentasPorcentaje,
        alerta: pasivoSobreVentasPorcentaje != null && pasivoSobreVentasPorcentaje > UMBRAL_PASIVO_PORCENTAJE,
        umbral: UMBRAL_PASIVO_PORCENTAJE,
      },
      proyeccion30dias: proyeccion30dias,
      promedioDiario14dias: Math.round(promedioDiario),
      caja,
    };
  }));
}
