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
export async function colaDePedidos(incluirCerrados = false, filtroEstado?: EstadoPedido) {
  return conBaseDeDatos(async (db) => {
    const vivos: EstadoPedido[] = ['recibido', 'confirmado', 'preparando', 'listo', 'en_camino'];

    // Un filtro por estado concreto manda sobre el toggle cola/historial: si
    // alguien pide "cancelados", da igual si estaba mirando la cola o el
    // historial, el filtro es la intención más específica.
    const condicion = filtroEstado
      ? eq(pedidos.estado, filtroEstado)
      : incluirCerrados ? undefined : inArray(pedidos.estado, vivos);

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
      .where(condicion)
      .orderBy(incluirCerrados || filtroEstado ? desc(pedidos.createdAt) : pedidos.createdAt)
      .limit(incluirCerrados || filtroEstado ? 50 : 100);

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

/**
 * Cifras de venta para la cabecera del panel.
 *
 * El panel medía comensales, escaneos e insignias, pero ninguna cifra de dinero:
 * no se podía responder «¿cuánto vendí ayer?» sin salir a la base. Esto es lo
 * primero que se mira al abrir el CRM por la mañana, así que va arriba del todo.
 *
 * Todo se cuenta en HORA DE BOGOTÁ, no en UTC. Un pedido de las ocho de la noche
 * en GMT ya cuenta como del día siguiente, y con eso la caja del día nunca cuadra
 * contra lo que dice el local.
 *
 * Los cancelados se excluyen del dinero pero se devuelven aparte: no son ingreso,
 * y sumarlos infla la venta; pero esconderlos tampoco sirve, porque una racha de
 * cancelaciones es justo lo que hay que ver a tiempo.
 */
export async function resumenVentas() {
  return conBaseDeDatos(async (db) => {
    const hoyBogota = sql`(now() AT TIME ZONE 'America/Bogota')::date`;
    const diaDelPedido = sql`(${pedidos.createdAt} AT TIME ZONE 'America/Bogota')::date`;
    const cuenta = sql`${pedidos.estado} <> 'cancelado'`;

    const [hoy] = await db
      .select({
        pedidos: sql<number>`COUNT(*) FILTER (WHERE ${cuenta})::int`,
        ventas: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta}), 0)::int`,
        cancelados: sql<number>`COUNT(*) FILTER (WHERE ${pedidos.estado} = 'cancelado')::int`,
      })
      .from(pedidos)
      .where(sql`${diaDelPedido} = ${hoyBogota}`);

    // Ayer, para saber si hoy va mejor o peor sin tener que recordar la cifra.
    const [ayer] = await db
      .select({
        ventas: sql<number>`COALESCE(SUM(${pedidos.totalCOP}) FILTER (WHERE ${cuenta}), 0)::int`,
      })
      .from(pedidos)
      .where(sql`${diaDelPedido} = ${hoyBogota} - 1`);

    // Lo que está cobrado y todavía no ha salido: es trabajo pendiente, no
    // histórico, así que no se limita al día. Un pedido de anoche sin entregar
    // sigue siendo un cliente esperando.
    const [pendiente] = await db
      .select({
        pedidos: sql<number>`COUNT(*)::int`,
        importe: sql<number>`COALESCE(SUM(${pedidos.totalCOP}), 0)::int`,
      })
      .from(pedidos)
      .where(sql`${pedidos.estado} IN ('recibido','confirmado','preparando','listo','en_camino')`);

    // Cobrado por la pasarela pero sin confirmar: dinero que entró y que nadie
    // ha empezado a preparar. Es la fila que más urge de todo el panel.
    const [cobradoSinAtender] = await db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(pedidos)
      .where(sql`${pedidos.estadoPago} = 'aprobado' AND ${pedidos.estado} = 'recibido'`);

    // Serie de los últimos siete días para la tendencia. generate_series rellena
    // los días sin pedidos con cero: sin eso el gráfico se salta las fechas
    // vacías y una semana floja parece continua.
    const serie = await db.execute<{ dia: string; ventas: number; pedidos: number }>(sql`
      SELECT to_char(d.dia, 'YYYY-MM-DD') AS dia,
             COALESCE(SUM(p.total_cop) FILTER (WHERE p.estado <> 'cancelado'), 0)::int AS ventas,
             COUNT(p.id) FILTER (WHERE p.estado <> 'cancelado')::int AS pedidos
        FROM generate_series(${hoyBogota} - 6, ${hoyBogota}, interval '1 day') AS d(dia)
        LEFT JOIN pedidos p
          ON (p.created_at AT TIME ZONE 'America/Bogota')::date = d.dia
       GROUP BY d.dia
       ORDER BY d.dia
    `);

    const filas = (Array.isArray(serie) ? serie : (serie as { rows?: unknown[] }).rows ?? []) as Array<{
      dia: string;
      ventas: number;
      pedidos: number;
    }>;

    const ventasHoy = Number(hoy?.ventas ?? 0);
    const ventasAyer = Number(ayer?.ventas ?? 0);

    return {
      hoy: {
        pedidos: Number(hoy?.pedidos ?? 0),
        ventas: ventasHoy,
        cancelados: Number(hoy?.cancelados ?? 0),
        ticketMedio: hoy?.pedidos ? Math.round(ventasHoy / Number(hoy.pedidos)) : 0,
      },
      ayer: { ventas: ventasAyer },
      // Sin cifra de ayer no hay porcentaje que calcular: dividir por cero daría
      // Infinity y en pantalla saldría un "∞%" que no significa nada.
      variacion: ventasAyer > 0 ? Math.round(((ventasHoy - ventasAyer) / ventasAyer) * 100) : null,
      pendiente: {
        pedidos: Number(pendiente?.pedidos ?? 0),
        importe: Number(pendiente?.importe ?? 0),
      },
      cobradoSinAtender: Number(cobradoSinAtender?.n ?? 0),
      serie: filas.map((f) => ({
        dia: f.dia,
        ventas: Number(f.ventas),
        pedidos: Number(f.pedidos),
      })),
    };
  });
}
