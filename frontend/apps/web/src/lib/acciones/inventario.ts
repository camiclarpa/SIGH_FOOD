'use server';

// =============================================================================
// Inventario / COGS — fichas técnicas, insumos, proveedores y compras
// =============================================================================

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { insumoCapas, insumos, proveedores, recetaItems } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';

export interface Resultado<T = undefined> {
  ok: boolean;
  error?: string;
  datos?: T;
}

async function ejecutar<T>(nombre: string, trabajo: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await trabajo() };
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message };
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/inventario' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// -----------------------------------------------------------------------------
// Insumos
// -----------------------------------------------------------------------------

export async function guardarInsumo(datos: {
  id?: string;
  nombre: string;
  unidadMedida: 'g' | 'kg' | 'ml' | 'l' | 'unidad';
  stockMinimo?: number | null;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarInsumo', async () => {
    await exigir('inventario.gestionar');
    if (!datos.nombre.trim()) throw new Error('El nombre es obligatorio');
    if (datos.stockMinimo != null && datos.stockMinimo < 0) {
      throw new Error('El stock mínimo no puede ser negativo');
    }

    return conBaseDeDatos(async (db) => {
      const valores = {
        nombre: datos.nombre.trim(),
        unidadMedida: datos.unidadMedida,
        stockMinimo: datos.stockMinimo != null ? String(datos.stockMinimo) : null,
        updatedAt: new Date(),
      };

      const [fila] = datos.id
        ? await db.update(insumos).set(valores).where(eq(insumos.id, datos.id)).returning({ id: insumos.id })
        : await db.insert(insumos).values(valores).returning({ id: insumos.id });

      if (!fila) throw new Error('El insumo no existe');
      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/finanzas/inventario');
    return r;
  });
}

export async function alternarInsumo(id: string, activo: boolean): Promise<Resultado> {
  return ejecutar('alternarInsumo', async () => {
    await exigir('inventario.gestionar');
    await conBaseDeDatos((db) =>
      db.update(insumos).set({ activo, updatedAt: new Date() }).where(eq(insumos.id, id))
    );
    revalidatePath('/finanzas/inventario');
    return undefined;
  });
}

// -----------------------------------------------------------------------------
// Ficha técnica (receta)
// -----------------------------------------------------------------------------

export async function guardarRecetaItem(datos: {
  id?: string;
  productoId: string;
  insumoId: string;
  cantidad: number;
  notas?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarRecetaItem', async () => {
    await exigir('inventario.gestionar');
    if (datos.cantidad <= 0) throw new Error('La cantidad debe ser mayor que cero');

    return conBaseDeDatos(async (db) => {
      const valores = {
        productoId: datos.productoId,
        insumoId: datos.insumoId,
        cantidad: String(datos.cantidad),
        notas: datos.notas?.trim().slice(0, 255) || null,
      };

      try {
        const [fila] = datos.id
          ? await db
              .update(recetaItems)
              .set(valores)
              .where(eq(recetaItems.id, datos.id))
              .returning({ id: recetaItems.id })
          : await db.insert(recetaItems).values(valores).returning({ id: recetaItems.id });

        if (!fila) throw new Error('El ingrediente de la receta no existe');
        return { id: fila.id };
      } catch (e) {
        if (String(e).includes('uq_receta_items_producto_insumo')) {
          throw new Error('Ese insumo ya está en la ficha técnica de este producto');
        }
        throw e;
      }
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/finanzas/inventario');
    return r;
  });
}

export async function borrarRecetaItem(id: string): Promise<Resultado> {
  return ejecutar('borrarRecetaItem', async () => {
    await exigir('inventario.gestionar');
    await conBaseDeDatos((db) => db.delete(recetaItems).where(eq(recetaItems.id, id)));
    revalidatePath('/finanzas/inventario');
    return undefined;
  });
}

// -----------------------------------------------------------------------------
// Proveedores
// -----------------------------------------------------------------------------

export async function guardarProveedor(datos: {
  id?: string;
  nombre: string;
  telefono?: string;
  notas?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarProveedor', async () => {
    await exigir('inventario.gestionar');
    if (!datos.nombre.trim()) throw new Error('El nombre es obligatorio');

    return conBaseDeDatos(async (db) => {
      const valores = {
        nombre: datos.nombre.trim(),
        telefono: datos.telefono?.trim() || null,
        notas: datos.notas?.trim() || null,
      };

      const [fila] = datos.id
        ? await db.update(proveedores).set(valores).where(eq(proveedores.id, datos.id)).returning({ id: proveedores.id })
        : await db.insert(proveedores).values(valores).returning({ id: proveedores.id });

      if (!fila) throw new Error('El proveedor no existe');
      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/finanzas/inventario');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Compras (crean una capa de costo FIFO)
// -----------------------------------------------------------------------------

/**
 * Registra una compra de insumo: crea una nueva capa FIFO disponible para las
 * próximas ventas. No toca capas existentes — el consumo FIFO ya sabe elegir
 * la más antigua con stock por su cuenta.
 */
export async function registrarCompra(datos: {
  insumoId: string;
  proveedorId?: string | null;
  cantidad: number;
  costoTotalCOP: number;
  referencia?: string;
  notas?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('registrarCompra', async () => {
    const actor = await exigir('inventario.gestionar');
    if (datos.cantidad <= 0) throw new Error('La cantidad debe ser mayor que cero');
    if (!Number.isInteger(datos.costoTotalCOP) || datos.costoTotalCOP <= 0) {
      throw new Error('El costo total debe ser un número de pesos mayor que cero');
    }

    return conBaseDeDatos(async (db) => {
      const costoUnitarioCOP = datos.costoTotalCOP / datos.cantidad;

      const [fila] = await db
        .insert(insumoCapas)
        .values({
          insumoId: datos.insumoId,
          proveedorId: datos.proveedorId || null,
          cantidadInicial: String(datos.cantidad),
          cantidadDisponible: String(datos.cantidad),
          costoTotalCOP: datos.costoTotalCOP,
          costoUnitarioCOP: costoUnitarioCOP.toFixed(6),
          referenciaCompra: datos.referencia?.trim().slice(0, 120) || null,
          notas: datos.notas?.trim() || null,
          registradoPor: actor.id || null,
        })
        .returning({ id: insumoCapas.id });

      log.info('Compra de insumo registrada', {
        ruta: '/acciones/inventario',
        detalle: [actor.email, datos.insumoId, `$${datos.costoTotalCOP}`],
      });

      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/finanzas/inventario');
    return r;
  });
}
