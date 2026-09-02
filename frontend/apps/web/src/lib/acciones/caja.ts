'use server';

// =============================================================================
// Caja diaria — apertura, cierre y arqueo
// =============================================================================
//
// Solo puede haber una sesión abierta a la vez. No se comprueba antes en
// JavaScript: lo garantiza el índice único parcial `uq_caja_sesion_abierta`
// (migración 0025), mismo mecanismo que ya usa `pagos` para "un solo pago
// aprobado por pedido" — dos aperturas simultáneas chocan contra la base, no
// contra una condición que se puede perder por una carrera.

import { revalidatePath } from 'next/cache';
import { and, between, eq, sql } from 'drizzle-orm';
import { cajaSesiones, pedidos } from '@sighfood/domain/db/schema';
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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/caja' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function abrirCaja(datos: {
  montoInicialCOP: number;
  notas?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('abrirCaja', async () => {
    const actor = await exigir('caja.abrir');
    if (!Number.isInteger(datos.montoInicialCOP) || datos.montoInicialCOP < 0) {
      throw new Error('El monto inicial debe ser un número de pesos válido');
    }

    return conBaseDeDatos(async (db) => {
      try {
        const [fila] = await db
          .insert(cajaSesiones)
          .values({
            montoInicialCOP: datos.montoInicialCOP,
            notasApertura: datos.notas?.trim().slice(0, 255) || null,
            abiertaPor: actor.id,
          })
          .returning({ id: cajaSesiones.id });

        log.info('Caja abierta', {
          ruta: '/acciones/caja',
          detalle: [actor.email, `$${datos.montoInicialCOP}`],
        });
        return { id: fila.id };
      } catch (e) {
        // El índice único parcial es la garantía real; este mensaje es solo
        // para que no se vea como un error genérico de base de datos.
        if (String(e).includes('uq_caja_sesion_abierta')) {
          throw new Error('Ya hay una caja abierta. Ciérrala antes de abrir otra.');
        }
        throw e;
      }
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/finanzas/caja');
    return r;
  });
}

/**
 * Cierra la sesión abierta con el efectivo contado a mano.
 *
 * El efectivo esperado se calcula AQUÍ, con la misma consulta que usaría
 * cualquier vistazo en vivo mientras la caja sigue abierta, y se congela en
 * la fila junto con la diferencia. No existe ningún camino de código que
 * permita escribir `efectivoEsperadoCOP` con un valor distinto al que acaba
 * de calcular esta sentencia.
 */
export async function cerrarCaja(datos: {
  id: string;
  efectivoContadoCOP: number;
  notas?: string;
}): Promise<Resultado<{ esperado: number; diferencia: number }>> {
  return ejecutar('cerrarCaja', async () => {
    const actor = await exigir('caja.cerrar');
    if (!Number.isInteger(datos.efectivoContadoCOP) || datos.efectivoContadoCOP < 0) {
      throw new Error('El efectivo contado debe ser un número de pesos válido');
    }

    return conBaseDeDatos(async (db) => {
      const [sesion] = await db
        .select()
        .from(cajaSesiones)
        .where(eq(cajaSesiones.id, datos.id))
        .limit(1);
      if (!sesion) throw new Error('Esa sesión de caja no existe');
      if (sesion.estado !== 'abierta') throw new Error('Esa caja ya está cerrada');

      // between()/eq() en vez de `sql` crudo: `sesion.abiertaEn` ya es un
      // `Date` (drizzle lo convierte al leerlo), y un `Date` interpolado sin
      // tipo en una plantilla `sql` revienta bajo Hyperdrive —fetch_types:
      // false no sabe serializarlo—. Mismo bug real que se encontró al
      // probar /finanzas.abrirCaja en producción.
      const [esperado] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${pedidos.totalCOP}), 0)::int`,
        })
        .from(pedidos)
        .where(and(
          eq(pedidos.metodoPago, 'efectivo'),
          eq(pedidos.estadoPago, 'aprobado'),
          between(pedidos.pagoAprobadoEn, sesion.abiertaEn, new Date())
        ));

      const efectivoEsperadoCOP = sesion.montoInicialCOP + Number(esperado?.total ?? 0);
      const diferenciaCOP = datos.efectivoContadoCOP - efectivoEsperadoCOP;

      const [actualizada] = await db
        .update(cajaSesiones)
        .set({
          estado: 'cerrada',
          efectivoContadoCOP: datos.efectivoContadoCOP,
          efectivoEsperadoCOP,
          diferenciaCOP,
          cerradaPor: actor.id,
          cerradaEn: new Date(),
          notasCierre: datos.notas?.trim().slice(0, 255) || null,
        })
        .where(and(eq(cajaSesiones.id, datos.id), eq(cajaSesiones.estado, 'abierta')))
        .returning({ id: cajaSesiones.id });

      if (!actualizada) throw new Error('Alguien ya cerró esta caja. Recarga para ver el resultado.');

      log.info('Caja cerrada', {
        ruta: '/acciones/caja',
        detalle: [actor.email, `esperado $${efectivoEsperadoCOP}`, `diferencia $${diferenciaCOP}`],
      });

      return { esperado: efectivoEsperadoCOP, diferencia: diferenciaCOP };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/finanzas/caja');
    return r;
  });
}
