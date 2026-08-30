'use server';

// =============================================================================
// Acciones sobre segmentos
// =============================================================================
//
// El constructor de segmentos personalizados arma exactamente la misma
// `ReglaSegmento` que ya interpreta segmentacion.ts —lineaProducto, zona,
// franja, minEscaneos, diasInactivo, nivel, segmentoRfm, minPedidos,
// minGasto—, combinada con Y. No hay un motor de O ni de paréntesis detrás:
// ofrecer esa opción en la pantalla sin que el motor la resuelva sería
// prometer algo que luego no filtra nada.

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { segments } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';
import type { ReglaSegmento } from '@/lib/segmentacion';
import { recalcularSegmentos } from '@/lib/segmentacion';

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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/segmentos' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function crearSegmentoPersonalizado(datos: {
  nombre: string;
  descripcion?: string;
  color?: string;
  regla: ReglaSegmento;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('crearSegmentoPersonalizado', async () => {
    await exigir('segmentos.gestionar');

    if (!datos.nombre.trim()) throw new Error('El nombre es obligatorio');
    if (Object.keys(datos.regla).length === 0) {
      throw new Error('Marca al menos una condición: una regla vacía cogería a todos los comensales');
    }

    return conBaseDeDatos(async (db) => {
      const [fila] = await db
        .insert(segments)
        .values({
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion?.trim() || null,
          tipo: 'dinamico',
          regla: datos.regla,
          color: datos.color || 'slate',
          activo: true,
        })
        .returning({ id: segments.id });
      return { id: fila.id };
    });
  }).then(async (r) => {
    if (r.ok) {
      // Sin esto el segmento recién creado se ve con 0 comensales hasta la
      // próxima pasada del cron —hasta 24h—, y quien lo acaba de crear no
      // tiene forma de saber si la regla que escribió sirve para algo.
      await recalcularSegmentos().catch(() => undefined);
      revalidatePath('/segmentos');
    }
    return r;
  });
}

export async function alternarSegmento(id: string, activo: boolean): Promise<Resultado> {
  return ejecutar('alternarSegmento', async () => {
    await exigir('segmentos.gestionar');
    await conBaseDeDatos((db) => db.update(segments).set({ activo }).where(eq(segments.id, id)));
    revalidatePath('/segmentos');
    return undefined;
  });
}
