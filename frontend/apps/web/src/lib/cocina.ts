// =============================================================================
// Pedidos: reglas y lecturas
// =============================================================================
//
// Vive fuera de acciones/pedidos.ts porque aquel lleva 'use server', y ahí Next
// exige que TODO lo exportado sea una función async. `siguientesDe` es síncrona
// y rompería el build con "Server Actions must be async functions", señalando
// además la línea del export y no la causa.
//
// Separarlo tiene otra ventaja: las lecturas dejan de ser acciones invocables
// desde el navegador solo por estar exportadas junto a las escrituras.

import { desc, inArray, sql } from 'drizzle-orm';
import { pedidoItems, pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export type EstadoPedido =
  | 'recibido'
  | 'confirmado'
  | 'preparando'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

/** Orden real del flujo. El índice ES la regla de avance. */
const FLUJO: EstadoPedido[] = [
  'recibido',
  'confirmado',
  'preparando',
  'listo',
  'en_camino',
  'entregado',
];

/**
 * A qué estados se puede pasar desde uno dado.
 *
 * Vive aquí y no en la interfaz para que la regla no dependa de qué botones se
 * pintaron: la pantalla puede quedarse desactualizada en una pestaña abierta
 * desde hace media hora, el servidor no.
 */
export function siguientesDe(estado: EstadoPedido, tipoEntrega: string): EstadoPedido[] {
  if (estado === 'entregado' || estado === 'cancelado') return [];

  const flujo = tipoEntrega === 'recoger' ? FLUJO.filter((e) => e !== 'en_camino') : FLUJO;
  const i = flujo.indexOf(estado);
  const siguiente = i >= 0 && i < flujo.length - 1 ? [flujo[i + 1]] : [];

  return [...siguiente, 'cancelado'];
}


// -----------------------------------------------------------------------------
// Lecturas
// -----------------------------------------------------------------------------

/**
 * La cola de la cocina.
 *
 * Trae primero lo que está vivo y lo ordena por antigüedad: el pedido que lleva
 * más tiempo esperando va arriba, que es el que más urge. Ordenar por fecha
 * descendente —lo más nuevo primero— es el error clásico: entierra justo lo que
 * hay que atender.
 */
export async function colaDePedidos(incluirCerrados = false) {
  return conBaseDeDatos(async (db) => {
    const vivos: EstadoPedido[] = ['recibido', 'confirmado', 'preparando', 'listo', 'en_camino'];

    const filas = await db
      .select({
        pedido: pedidos,
        // La antigüedad la calcula Postgres, con el mismo reloj que escribió
        // created_at. Hacerlo con Date.now() en el render sería una llamada
        // impura y además compararía dos relojes distintos.
        minutos: sql<number>`GREATEST(0, EXTRACT(EPOCH FROM (now() - ${pedidos.createdAt})) / 60)::int`,
      })
      .from(pedidos)
      .where(incluirCerrados ? undefined : inArray(pedidos.estado, vivos))
      .orderBy(incluirCerrados ? desc(pedidos.createdAt) : pedidos.createdAt)
      .limit(incluirCerrados ? 50 : 100);

    if (filas.length === 0) return [];

    const items = await db
      .select()
      .from(pedidoItems)
      .where(inArray(pedidoItems.pedidoId, filas.map((f) => f.pedido.id)));

    const porPedido = new Map<string, typeof items>();
    for (const i of items) {
      if (!porPedido.has(i.pedidoId)) porPedido.set(i.pedidoId, []);
      porPedido.get(i.pedidoId)!.push(i);
    }

    return filas.map((f) => ({
      ...f.pedido,
      minutos: Number(f.minutos),
      items: porPedido.get(f.pedido.id) ?? [],
    }));
  });
}

/** Cifras del día para la cabecera. */
export async function resumenDelDia() {
  return conBaseDeDatos(async (db) => {
    const [r] = await db
      .select({
        pedidos: sql<number>`COUNT(*)::int`,
        ventas: sql<number>`COALESCE(SUM(${pedidos.totalCOP}), 0)::int`,
        entregados: sql<number>`COUNT(*) FILTER (WHERE ${pedidos.estado} = 'entregado')::int`,
        cancelados: sql<number>`COUNT(*) FILTER (WHERE ${pedidos.estado} = 'cancelado')::int`,
        sinCobrar: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${pedidos.estadoPago} <> 'aprobado'), 0)::int`,
      })
      .from(pedidos)
      // El día del negocio se cuenta en hora de Bogotá, no en UTC: en GMT, un
      // pedido de las 8 de la noche ya cuenta como del día siguiente.
      .where(sql`(${pedidos.createdAt} AT TIME ZONE 'America/Bogota')::date = (now() AT TIME ZONE 'America/Bogota')::date`);

    return {
      pedidos: Number(r?.pedidos ?? 0),
      ventas: Number(r?.ventas ?? 0),
      entregados: Number(r?.entregados ?? 0),
      cancelados: Number(r?.cancelados ?? 0),
      sinCobrar: Number(r?.sinCobrar ?? 0),
      ticketMedio: r?.pedidos ? Math.round(Number(r.ventas) / Number(r.pedidos)) : 0,
    };
  });
}
