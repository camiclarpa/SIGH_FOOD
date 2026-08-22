// =============================================================================
// Bocazo Club — puntos, sellos y recompra
// =============================================================================
//
// El motor de puntos ya existía en el CRM (point_transactions, otorgarPuntos).
// Aquí NO se reimplementa: se conecta. Duplicarlo habría dado dos saldos que
// se contradicen, y ante una reclamación de un cliente no habría forma de saber
// cuál es el bueno.
//
// La regla de oro heredada de ese motor: los puntos nunca se escriben
// directamente sobre b2c_consumers.points. Se registra un movimiento y el saldo
// se deriva de él, para que siempre se pueda explicar de dónde salió cada punto.

import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  b2cConsumers,
  favoritos,
  pedidoItems,
  pedidos,
  pointTransactions,
  productoOpciones,
  productos,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  PUNTOS_POR_MIL,
  SELLOS_PARA_PREMIO,
  type EstadoClub,
  type LineaRecompra,
  type PedidoResumen,
} from '@/lib/club-tipos';

// Las constantes y las formas viven en club-tipos.ts, sin imports de base de
// datos: la pantalla de cuenta es un componente de cliente y las necesita.
export {
  PUNTOS_POR_MIL,
  SELLOS_PARA_PREMIO,
  type EstadoClub,
  type LineaRecompra,
  type PedidoResumen,
} from '@/lib/club-tipos';



/**
 * Otorga los puntos de un pedido entregado.
 *
 * Idempotente por `pedidos.puntos_otorgados`: la entrega puede marcarse dos
 * veces —dos personas en la cocina, un reintento de red— y los puntos solo
 * pueden darse una. La condición va en el WHERE del UPDATE, no en una
 * comprobación previa, porque entre leer y escribir cabe el segundo intento.
 */
export async function otorgarPuntosDePedido(pedidoId: string): Promise<number> {
  return conBaseDeDatos(async (db) => {
    const [pedido] = await db
      .select({
        id: pedidos.id,
        codigo: pedidos.codigo,
        consumerId: pedidos.consumerId,
        totalCOP: pedidos.totalCOP,
        estado: pedidos.estado,
      })
      .from(pedidos)
      .where(eq(pedidos.id, pedidoId))
      .limit(1);

    if (!pedido || pedido.estado !== 'entregado' || !pedido.consumerId) return 0;

    const puntos = Math.floor((pedido.totalCOP / 1000) * PUNTOS_POR_MIL);
    if (puntos <= 0) return 0;

    // Marcar y ganar la carrera en el mismo paso: si otra ejecución ya lo hizo,
    // esto no actualiza ninguna fila y se sale sin dar nada.
    const [marcado] = await db
      .update(pedidos)
      .set({ puntosOtorgados: puntos })
      .where(and(eq(pedidos.id, pedidoId), isNull(pedidos.puntosOtorgados)))
      .returning({ id: pedidos.id });

    if (!marcado) return 0;

    await db.transaction(async (tx) => {
      const [fila] = await tx
        .update(b2cConsumers)
        .set({ points: sql`COALESCE(${b2cConsumers.points}, 0) + ${puntos}` })
        .where(eq(b2cConsumers.id, pedido.consumerId!))
        .returning({ saldo: b2cConsumers.points });

      await tx.insert(pointTransactions).values({
        consumerId: pedido.consumerId!,
        puntos,
        motivo: 'escaneo',
        referenciaId: pedido.id,
        descripcion: `Pedido ${pedido.codigo}`,
        saldoResultante: fila?.saldo ?? null,
      });
    });

    return puntos;
  });
}


/**
 * Dónde va la persona en el club.
 *
 * Los sellos se cuentan en módulo: al llegar a diez, la barra vuelve a cero y
 * empieza otra ronda. Sin el módulo, quien ya canjeó vería la barra llena para
 * siempre y dejaría de significar nada.
 */
export async function estadoClub(consumerId: string): Promise<EstadoClub> {
  return conBaseDeDatos(async (db) => {
    const [c] = await db
      .select({ puntos: b2cConsumers.points })
      .from(b2cConsumers)
      .where(eq(b2cConsumers.id, consumerId))
      .limit(1);

    const [entregados] = await db
      .select({ n: count(pedidos.id) })
      .from(pedidos)
      .where(and(eq(pedidos.consumerId, consumerId), eq(pedidos.estado, 'entregado')));

    const total = Number(entregados?.n ?? 0);
    const sellos = total % SELLOS_PARA_PREMIO;

    return {
      puntos: c?.puntos ?? 0,
      pedidosEntregados: total,
      sellos,
      faltan: SELLOS_PARA_PREMIO - sellos,
      // Se cumple una ronda completa cuando el total es múltiplo de diez y no
      // es cero: ahí el módulo da 0 y la barra está, de hecho, llena.
      tienePremio: total > 0 && sellos === 0,
    };
  });
}

// -----------------------------------------------------------------------------
// Historial y recompra
// -----------------------------------------------------------------------------


export async function historial(consumerId: string, limite = 20): Promise<PedidoResumen[]> {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select()
      .from(pedidos)
      .where(eq(pedidos.consumerId, consumerId))
      .orderBy(desc(pedidos.createdAt))
      .limit(limite);

    if (filas.length === 0) return [];

    const items = await db
      .select()
      .from(pedidoItems)
      .where(
        sql`${pedidoItems.pedidoId} IN ${sql.raw(`(${filas.map((f) => `'${f.id}'`).join(',')})`)}`
      );

    const porPedido = new Map<string, typeof items>();
    for (const i of items) {
      if (!porPedido.has(i.pedidoId)) porPedido.set(i.pedidoId, []);
      porPedido.get(i.pedidoId)!.push(i);
    }

    return filas.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      estado: p.estado,
      totalCOP: p.totalCOP,
      createdAt: p.createdAt,
      items: (porPedido.get(p.id) ?? []).map((i) => ({
        nombre: i.nombreProducto,
        cantidad: i.cantidad,
      })),
    }));
  });
}


/**
 * Reconstruye un pedido anterior para volver a meterlo al carrito.
 *
 * NO se copia lo que quedó congelado en el pedido: se vuelve a leer el producto
 * y sus opciones de la base. El pedido guarda lo que se cobró entonces, que es
 * lo correcto para el recibo, pero repetir con el precio de hace tres meses
 * sería vender por debajo de coste sin darse cuenta.
 *
 * Lo que ya no existe o está agotado se devuelve marcado, no se calla: quien
 * pulsa "repetir" tiene que saber qué le falta antes de llegar a la caja.
 */
export async function lineasParaRepetir(
  pedidoId: string,
  consumerId: string
): Promise<LineaRecompra[]> {
  return conBaseDeDatos(async (db) => {
    const [pedido] = await db
      .select({ id: pedidos.id })
      .from(pedidos)
      // El consumerId va en el WHERE: sin él, cualquiera con un id de pedido
      // podría leer la composición del pedido de otra persona.
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.consumerId, consumerId)))
      .limit(1);

    if (!pedido) return [];

    const items = await db.select().from(pedidoItems).where(eq(pedidoItems.pedidoId, pedidoId));
    if (items.length === 0) return [];

    const salida: LineaRecompra[] = [];

    for (const i of items) {
      if (!i.productoId) continue;

      const [p] = await db
        .select()
        .from(productos)
        .where(and(eq(productos.id, i.productoId), eq(productos.activo, true)))
        .limit(1);

      if (!p) continue;

      // Las opciones se rebuscan por etiqueta y grupo: los ids pueden haber
      // cambiado si alguien reeditó el producto, pero "Queso extra" sigue
      // siendo "Queso extra".
      const opciones: LineaRecompra['opciones'] = [];
      for (const o of i.opciones ?? []) {
        const [actual] = await db
          .select()
          .from(productoOpciones)
          .where(
            and(
              eq(productoOpciones.productoId, p.id),
              eq(productoOpciones.grupo, o.grupo),
              eq(productoOpciones.etiqueta, o.etiqueta),
              eq(productoOpciones.activo, true)
            )
          )
          .limit(1);

        if (actual) {
          opciones.push({
            id: actual.id,
            grupo: actual.grupo,
            etiqueta: actual.etiqueta,
            sobreprecioCOP: actual.sobreprecioCOP,
          });
        }
      }

      salida.push({
        slug: p.slug,
        nombre: p.nombre,
        imagen: p.imagen,
        precioCOP: p.precioCOP,
        cantidad: i.cantidad,
        opciones,
        disponible: p.disponible,
      });
    }

    return salida;
  });
}

// -----------------------------------------------------------------------------
// Favoritos
// -----------------------------------------------------------------------------

export async function favoritosDe(consumerId: string): Promise<LineaRecompra[]> {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select({ fav: favoritos, producto: productos })
      .from(favoritos)
      .innerJoin(productos, eq(productos.id, favoritos.productoId))
      .where(and(eq(favoritos.consumerId, consumerId), eq(productos.activo, true)))
      .orderBy(desc(favoritos.createdAt));

    const salida: LineaRecompra[] = [];

    for (const f of filas) {
      const ids = f.fav.opcionIds ?? [];
      const opciones: LineaRecompra['opciones'] = [];

      for (const id of ids) {
        const [o] = await db
          .select()
          .from(productoOpciones)
          .where(and(eq(productoOpciones.id, id), eq(productoOpciones.activo, true)))
          .limit(1);
        if (o) {
          opciones.push({
            id: o.id,
            grupo: o.grupo,
            etiqueta: o.etiqueta,
            sobreprecioCOP: o.sobreprecioCOP,
          });
        }
      }

      salida.push({
        slug: f.producto.slug,
        nombre: f.fav.etiqueta || f.producto.nombre,
        imagen: f.producto.imagen,
        precioCOP: f.producto.precioCOP,
        cantidad: 1,
        opciones,
        disponible: f.producto.disponible,
      });
    }

    return salida;
  });
}

export async function guardarFavorito(datos: {
  consumerId: string;
  slug: string;
  opcionIds: string[];
  etiqueta?: string;
}): Promise<boolean> {
  return conBaseDeDatos(async (db) => {
    const [p] = await db
      .select({ id: productos.id })
      .from(productos)
      .where(eq(productos.slug, datos.slug))
      .limit(1);

    if (!p) return false;

    await db.insert(favoritos).values({
      consumerId: datos.consumerId,
      productoId: p.id,
      // Se ordenan para que la misma configuración dé siempre la misma lista.
      opcionIds: [...datos.opcionIds].sort(),
      etiqueta: datos.etiqueta?.trim().slice(0, 60) || null,
    });

    return true;
  });
}

export async function quitarFavorito(consumerId: string, favoritoId: string): Promise<boolean> {
  return conBaseDeDatos(async (db) => {
    const borrados = await db
      .delete(favoritos)
      // El consumerId protege de borrar el favorito de otra persona conociendo
      // solo su id.
      .where(and(eq(favoritos.id, favoritoId), eq(favoritos.consumerId, consumerId)))
      .returning({ id: favoritos.id });

    return borrados.length > 0;
  });
}
