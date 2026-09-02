// =============================================================================
// Inventario / COGS — lecturas
// =============================================================================

import { and, between, desc, eq, sql } from 'drizzle-orm';
import {
  insumoCapas,
  insumoMovimientos,
  insumos,
  productos,
  proveedores,
  recetaItems,
} from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { conRespaldo } from '@/lib/respaldo';

/** Productos activos, para elegir a cuál se le está definiendo una ficha técnica. */
export async function listarProductosActivos() {
  return conRespaldo('inventario:productos', () => conBaseDeDatos(async (db) =>
    db
      .select({ id: productos.id, nombre: productos.nombre, precioCOP: productos.precioCOP })
      .from(productos)
      .where(eq(productos.activo, true))
      .orderBy(productos.nombre)
  ));
}

/** Proveedores activos, para el selector de una compra. */
export async function listarProveedores() {
  return conRespaldo('inventario:proveedores', () => conBaseDeDatos(async (db) =>
    db
      .select({ id: proveedores.id, nombre: proveedores.nombre })
      .from(proveedores)
      .where(eq(proveedores.activo, true))
      .orderBy(proveedores.nombre)
  ));
}

/**
 * Insumos con su stock total vivo (suma de lo disponible en todas sus capas).
 *
 * LEFT JOIN + GROUP BY, no una subconsulta correlacionada: una subconsulta
 * escrita como `sql\`... WHERE ${insumoCapas.insumoId} = ${insumos.id}\``
 * compila SIN calificar la tabla del lado correlacionado —el `id` de fuera
 * sale como `"id"` a secas, no `"insumos"."id"`— y como `insumo_capas` tiene
 * su propia columna `id`, Postgres resuelve esa comparación contra sí misma
 * en vez de contra el insumo. El resultado: el stock siempre daba 0, sin
 * error visible, para cualquier insumo. Bug real, encontrado al probar el
 * inventario en producción con una capa ya creada.
 */
export async function listarInsumos() {
  return conRespaldo('inventario:insumos', () => conBaseDeDatos(async (db) =>
    db
      .select({
        id: insumos.id,
        nombre: insumos.nombre,
        unidadMedida: insumos.unidadMedida,
        stockMinimo: insumos.stockMinimo,
        activo: insumos.activo,
        stockTotal: sql<string>`COALESCE(SUM(${insumoCapas.cantidadDisponible}), 0)`,
      })
      .from(insumos)
      .leftJoin(insumoCapas, eq(insumoCapas.insumoId, insumos.id))
      .groupBy(insumos.id)
      .orderBy(insumos.nombre)
  ));
}

/** Ficha técnica completa de un producto. */
export async function recetaDeProducto(productoId: string) {
  return conRespaldo(`inventario:receta:${productoId}`, () => conBaseDeDatos(async (db) =>
    db
      .select({
        id: recetaItems.id,
        insumoId: recetaItems.insumoId,
        insumoNombre: insumos.nombre,
        unidadMedida: insumos.unidadMedida,
        cantidad: recetaItems.cantidad,
        notas: recetaItems.notas,
      })
      .from(recetaItems)
      .innerJoin(insumos, eq(insumos.id, recetaItems.insumoId))
      .where(eq(recetaItems.productoId, productoId))
      .orderBy(insumos.nombre)
  ));
}

/**
 * Margen a precio ACTUAL de un producto: usa el costo de la capa más reciente
 * que aún tiene stock por cada insumo de la receta (no la que se usaría al
 * vender) — es "si vendo uno ahora, cuánto gano", separado del COGS histórico
 * ya realizado en ventas pasadas.
 */
export async function margenActualDeProducto(productoId: string) {
  return conRespaldo(`inventario:margen:${productoId}`, () => conBaseDeDatos(async (db) => {
    const [producto] = await db
      .select({ precioCOP: productos.precioCOP })
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1);
    if (!producto) return null;

    const receta = await db
      .select({ insumoId: recetaItems.insumoId, cantidad: recetaItems.cantidad })
      .from(recetaItems)
      .where(eq(recetaItems.productoId, productoId));

    if (receta.length === 0) {
      return { precioCOP: producto.precioCOP, costoRecetaCOP: null, margenCOP: null, completo: false };
    }

    let costoRecetaCOP = 0;
    let completo = true;

    for (const linea of receta) {
      const [capa] = await db
        .select({ costoUnitarioCOP: insumoCapas.costoUnitarioCOP })
        .from(insumoCapas)
        .where(and(eq(insumoCapas.insumoId, linea.insumoId), sql`${insumoCapas.cantidadDisponible} > 0`))
        .orderBy(desc(insumoCapas.fechaCompra))
        .limit(1);

      if (!capa) {
        completo = false;
        continue;
      }
      costoRecetaCOP += Number(linea.cantidad) * Number(capa.costoUnitarioCOP);
    }

    const redondeado = Math.round(costoRecetaCOP);
    return {
      precioCOP: producto.precioCOP,
      costoRecetaCOP: redondeado,
      margenCOP: producto.precioCOP - redondeado,
      // false si algún insumo de la receta no tiene ninguna capa con stock:
      // el margen mostrado es parcial, no el real completo.
      completo,
    };
  }));
}

/**
 * COGS realmente incurrido (ledger de salidas por venta) en un período.
 *
 * Toma un `db` ya abierto en vez de pedir el suyo propio: lo llama
 * resumenFinanciero() desde dentro de su propio conBaseDeDatos(), y anidar
 * una segunda conexión de Hyperdrive ahí dentro —una por cada función
 * combinada en Promise.all— fue uno de los dos bugs reales que tumbaron
 * /finanzas la primera vez que se probó en producción.
 *
 * El otro: `between()`/`eq()` en vez de un `sql` crudo con `desde`/`hasta`.
 * Con Hyperdrive postgres.js corre con `fetch_types: false` (no consulta el
 * catálogo de tipos, ver packages/sighfood-domain/src/db/index.ts) y sin esa
 * consulta no sabe serializar un `Date` interpolado sin tipo — revienta con
 * "The 'string' argument must be of type string... Received an instance of
 * Date". Los operadores tipados de drizzle no tienen ese problema: pasan cada
 * valor por el mapeo propio de la columna antes de mandarlo al driver.
 */
export async function cogsRealizado(db: Database, desde: Date, hasta: Date): Promise<number> {
  const [r] = await db
    .select({ total: sql<number>`COALESCE(SUM(${insumoMovimientos.costoCOP}), 0)::int` })
    .from(insumoMovimientos)
    .where(and(
      eq(insumoMovimientos.tipo, 'salida_venta'),
      between(insumoMovimientos.creadoEn, desde, hasta)
    ));
  return Number(r?.total ?? 0);
}

/** Salidas que no se pudieron cubrir con ninguna capa: inventario desincronizado. */
export async function faltantesRecientes(limite = 20) {
  return conRespaldo('inventario:faltantes', () => conBaseDeDatos(async (db) =>
    db
      .select({
        id: insumoMovimientos.id,
        insumoNombre: insumos.nombre,
        unidadMedida: insumos.unidadMedida,
        cantidad: insumoMovimientos.cantidad,
        pedidoId: insumoMovimientos.pedidoId,
        creadoEn: insumoMovimientos.creadoEn,
      })
      .from(insumoMovimientos)
      .innerJoin(insumos, eq(insumos.id, insumoMovimientos.insumoId))
      .where(eq(insumoMovimientos.tipo, 'faltante'))
      .orderBy(desc(insumoMovimientos.creadoEn))
      .limit(limite)
  ));
}
