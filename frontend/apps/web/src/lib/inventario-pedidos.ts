// =============================================================================
// Descuento de inventario por pedido entregado — motor COGS/FIFO
// =============================================================================
//
// Mismo criterio que club-pedidos.ts (otorgarPuntosDePedido): el efecto
// secundario de una entrega real vive aparte de avanzarPedido(), es
// idempotente por una columna marcadora en `pedidos`, y un fallo aquí no
// puede impedir marcar una entrega que ya ocurrió físicamente.

import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm';
import {
  insumoCapas,
  insumoMovimientos,
  pedidoItems,
  pedidos,
  recetaItems,
} from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';

/**
 * Consume una cantidad de un insumo de las capas FIFO más antiguas con stock.
 *
 * No hay lock explícito: cada UPDATE lleva la condición de la resta en su
 * propio WHERE, así que Postgres serializa dos ventas concurrentes con el
 * lock de fila normal. Quien pierde la carrera ve 0 filas afectadas y
 * relee la capa (que puede seguir siendo la misma con menos stock, o ya
 * puede estar agotada y tocar la siguiente).
 *
 * Si no queda ninguna capa con stock, registra un movimiento 'faltante' y
 * termina — visible, no bloqueante: la comida ya se entregó.
 */
async function consumirInsumo(
  db: Database,
  datos: { insumoId: string; cantidad: number; pedidoId: string; pedidoItemId: string }
): Promise<void> {
  let restante = datos.cantidad;

  while (restante > 0) {
    const [capa] = await db
      .select({
        id: insumoCapas.id,
        cantidadDisponible: insumoCapas.cantidadDisponible,
        costoUnitarioCOP: insumoCapas.costoUnitarioCOP,
      })
      .from(insumoCapas)
      .where(and(eq(insumoCapas.insumoId, datos.insumoId), sql`${insumoCapas.cantidadDisponible} > 0`))
      .orderBy(asc(insumoCapas.fechaCompra))
      .limit(1);

    if (!capa) {
      await db.insert(insumoMovimientos).values({
        insumoId: datos.insumoId,
        capaId: null,
        tipo: 'faltante',
        cantidad: String(restante),
        costoCOP: null,
        pedidoId: datos.pedidoId,
        pedidoItemId: datos.pedidoItemId,
      });
      return;
    }

    const disponible = Number(capa.cantidadDisponible);
    const tomar = Math.min(restante, disponible);

    const [actualizada] = await db
      .update(insumoCapas)
      .set({ cantidadDisponible: sql`${insumoCapas.cantidadDisponible} - ${tomar}` })
      .where(and(eq(insumoCapas.id, capa.id), gte(insumoCapas.cantidadDisponible, String(tomar))))
      .returning({ id: insumoCapas.id });

    if (!actualizada) {
      // Otra venta concurrente ganó esta capa entre el SELECT y el UPDATE.
      // Se relee sin descontar `restante` — puede tocar la misma capa con
      // menos stock, o ya agotada.
      continue;
    }

    await db.insert(insumoMovimientos).values({
      insumoId: datos.insumoId,
      capaId: capa.id,
      tipo: 'salida_venta',
      cantidad: String(tomar),
      costoCOP: Math.round(tomar * Number(capa.costoUnitarioCOP)),
      pedidoId: datos.pedidoId,
      pedidoItemId: datos.pedidoItemId,
    });

    restante -= tomar;
  }
}

/**
 * Descuenta el inventario de insumos de un pedido entregado, según la ficha
 * técnica de cada producto vendido.
 *
 * Idempotente por `pedidos.inventarioDescontadoEn`: la condición va en el
 * WHERE del UPDATE que marca, en el mismo paso que la lectura, para que dos
 * llamadas concurrentes (o un reintento) no descuenten dos veces la misma
 * masa. Un producto sin ficha técnica (`recetaItems` vacío) no descuenta
 * nada — no es un error, es un producto sin costear todavía.
 */
export async function descontarInsumosDePedido(pedidoId: string): Promise<void> {
  await conBaseDeDatos(async (db) => {
    const [marcado] = await db
      .update(pedidos)
      .set({ inventarioDescontadoEn: new Date() })
      .where(and(eq(pedidos.id, pedidoId), isNull(pedidos.inventarioDescontadoEn)))
      .returning({ id: pedidos.id });

    if (!marcado) return;

    const items = await db
      .select({
        id: pedidoItems.id,
        productoId: pedidoItems.productoId,
        cantidad: pedidoItems.cantidad,
      })
      .from(pedidoItems)
      .where(eq(pedidoItems.pedidoId, pedidoId));

    for (const item of items) {
      if (!item.productoId) continue;

      const receta = await db
        .select({ insumoId: recetaItems.insumoId, cantidad: recetaItems.cantidad })
        .from(recetaItems)
        .where(eq(recetaItems.productoId, item.productoId));

      for (const linea of receta) {
        await consumirInsumo(db, {
          insumoId: linea.insumoId,
          cantidad: Number(linea.cantidad) * item.cantidad,
          pedidoId,
          pedidoItemId: item.id,
        });
      }
    }

    log.info('Inventario descontado', { ruta: '/lib/inventario-pedidos', detalle: pedidoId });
  });
}
