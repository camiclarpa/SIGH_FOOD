'use server';

// =============================================================================
// Acciones sobre el catálogo de insignias
// =============================================================================
//
// Hasta ahora las 15 insignias solo se creaban a mano contra la base de datos
// —sembrar-b2c.mjs, o un UPDATE suelto—. Cualquier ajuste (subir un umbral,
// desactivar una que ya no aplica, dar de alta una nueva) exigía tocar
// producción directamente. Esto le da al catálogo el mismo trato que Premios:
// CRUD desde el CRM, con permiso y rastro.

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { badges } from '@sighfood/domain/db/schema';
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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/insignias' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

const CRITERIOS_VALIDOS = [
  'escaneos_totales', 'lineas_distintas', 'bares_distintos', 'escaneos_en_franja',
  'racha_semanas', 'referidos_convertidos', 'pedidos_totales', 'gasto_acumulado', 'lineas_pedidas',
] as const;

export async function guardarInsignia(datos: {
  id?: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  criterio: string;
  umbral: number;
  parametro?: string | null;
  puntosOtorgados: number;
  activa: boolean;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarInsignia', async () => {
    await exigir('desafios.gestionar');

    if (!datos.nombre.trim()) throw new Error('El nombre es obligatorio');
    if (!datos.codigo.trim()) throw new Error('El código es obligatorio');
    if (!/^[a-z0-9_]+$/.test(datos.codigo.trim())) {
      throw new Error('El código solo admite minúsculas, números y guion bajo');
    }
    if (!(CRITERIOS_VALIDOS as readonly string[]).includes(datos.criterio)) {
      throw new Error('Criterio no reconocido');
    }
    if (!Number.isInteger(datos.umbral) || datos.umbral <= 0) {
      throw new Error('El umbral debe ser un entero mayor que cero');
    }
    if (!Number.isInteger(datos.puntosOtorgados) || datos.puntosOtorgados < 0) {
      throw new Error('Los puntos otorgados no pueden ser negativos');
    }

    return conBaseDeDatos(async (db) => {
      const valores = {
        codigo: datos.codigo.trim().toLowerCase(),
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim(),
        icono: datos.icono.trim() || '*',
        criterio: datos.criterio as never,
        umbral: datos.umbral,
        parametro: datos.parametro?.trim() || null,
        puntosOtorgados: datos.puntosOtorgados,
        activa: datos.activa,
      };

      const [fila] = datos.id
        ? await db.update(badges).set(valores).where(eq(badges.id, datos.id)).returning({ id: badges.id })
        : await db.insert(badges).values(valores).returning({ id: badges.id });

      if (!fila) throw new Error('La insignia no existe');
      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/fidelizacion');
    return r;
  });
}

export async function alternarInsignia(id: string, activa: boolean): Promise<Resultado> {
  return ejecutar('alternarInsignia', async () => {
    await exigir('desafios.gestionar');
    await conBaseDeDatos((db) => db.update(badges).set({ activa }).where(eq(badges.id, id)));
    revalidatePath('/fidelizacion');
    return undefined;
  });
}
