// =============================================================================
// Pedidos: lecturas para la cocina
// =============================================================================
//
// Solo servidor: importa la base. La máquina de estados vive aparte, en
// lib/estados-pedido.ts, porque la comparte el componente de cliente.

import { desc, eq, inArray, sql } from 'drizzle-orm';
import { accounts, pedidoItems, pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import type { EstadoPedido } from '@/lib/estados-pedido';

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
        // Nombre del local, para cuando haya varios: una comanda que dice
        // "mesa 4" sin decir de qué bar no sirve de nada.
        local: sql<string | null>`COALESCE(${accounts.commercialName}, ${accounts.name})`,
      })
      .from(pedidos)
      .leftJoin(accounts, eq(accounts.id, pedidos.accountId))
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
      local: f.local,
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
