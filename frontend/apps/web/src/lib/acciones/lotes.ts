'use server';

// =============================================================================
// Lotes de producción
// =============================================================================
//
// Dar de alta una tanda es lo que hace posible todo lo demás. Sin lotes, una
// reseña dice qué pasó pero no a qué producción le pasó, y con eso se puede
// atender a un cliente pero no arreglar la causa.
//
// Retirar una tanda es una decisión con coste: se saca producto de circulación.
// Por eso exige el permiso de moderación y pide un motivo escrito — dentro de
// tres meses, cuando el problema se repita, lo único que va a quedar es esa
// frase.

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { lotes } from '@sighfood/domain/db/schema';
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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/lotes' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

/**
 * Normaliza el código como lo hace la tienda al buscarlo.
 *
 * Las dos puntas tienen que coincidir: si aquí se guarda "2026-08 b" y allí se
 * busca "2026-08B", el lote existe y la reseña nunca lo encuentra — un fallo
 * silencioso que solo se ve al preguntarse por qué ninguna reseña tiene tanda.
 */
function normalizarCodigo(bruto: string): string {
  return bruto.trim().toUpperCase().replace(/\s+/g, '');
}

export async function crearLote(datos: {
  codigo: string;
  productoId?: string | null;
  producidoEn: string;
  venceEn?: string | null;
  unidades?: number | null;
  notas?: string | null;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('crearLote', async () => {
    const actor = await exigir('resenas.moderar');

    const codigo = normalizarCodigo(datos.codigo);
    if (!codigo) throw new Error('El código del lote es obligatorio');
    if (!datos.producidoEn) throw new Error('Falta la fecha de producción');

    return conBaseDeDatos(async (db) => {
      const [ya] = await db
        .select({ id: lotes.id })
        .from(lotes)
        .where(eq(lotes.codigo, codigo))
        .limit(1);

      // Se avisa en vez de crear un duplicado: dos lotes con el mismo código
      // repartirían las reseñas de una misma tanda en dos filas, y ninguna de
      // las dos llegaría al umbral de alerta.
      if (ya) throw new Error(`Ya existe un lote con el código ${codigo}`);

      const [fila] = await db
        .insert(lotes)
        .values({
          codigo,
          productoId: datos.productoId || null,
          producidoEn: datos.producidoEn,
          venceEn: datos.venceEn || null,
          unidades: datos.unidades ?? null,
          notas: datos.notas?.trim() || null,
        })
        .returning({ id: lotes.id });

      log.info('Lote dado de alta', {
        ruta: '/acciones/lotes',
        detalle: [actor.email, codigo],
      });

      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/resenas');
    return r;
  });
}

/**
 * Retira una tanda de circulación, o la devuelve.
 *
 * No borra nada. El historial de un lote retirado es justo lo que hace falta
 * consultar cuando el problema se repita: qué se produjo ese día, cuántas
 * quejas hubo y qué se decidió.
 */
export async function alternarRetiroLote(
  id: string,
  retirar: boolean,
  motivo?: string
): Promise<Resultado> {
  return ejecutar('alternarRetiroLote', async () => {
    const actor = await exigir('resenas.moderar');

    // Retirar sin motivo deja una decisión sin explicación. Dentro de tres meses
    // esa frase es lo único que va a quedar de por qué se sacó la tanda.
    if (retirar && !motivo?.trim()) {
      throw new Error('Escribe por qué se retira: es lo único que quedará registrado');
    }

    await conBaseDeDatos((db) =>
      db
        .update(lotes)
        .set({
          retirado: retirar,
          retiradoEn: retirar ? new Date() : null,
          motivoRetiro: retirar ? motivo!.trim().slice(0, 500) : null,
          updatedAt: new Date(),
        })
        .where(eq(lotes.id, id))
    );

    log.info(retirar ? 'Lote retirado' : 'Lote devuelto a circulación', {
      ruta: '/acciones/lotes',
      detalle: [actor.email, id, motivo?.trim() ?? ''],
    });

    return undefined;
  }).then((r) => {
    if (r.ok) revalidatePath('/resenas');
    return r;
  });
}
