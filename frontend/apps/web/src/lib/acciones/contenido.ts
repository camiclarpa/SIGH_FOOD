'use server';

// =============================================================================
// Acciones de contenido, activaciones y embajadores
// =============================================================================
//
// Toda escritura empieza por `exigir`. Comprobarlo solo en la interfaz
// —escondiendo un botón— no protege nada: la Server Action sigue siendo
// invocable por quien sepa hacerlo.

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import {
  activaciones,
  b2cConsumers,
  contenidos,
  embajadores,
} from '@sighfood/domain/db/schema';
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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/contenido' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

/** Recorta y devuelve null si queda vacío: una cadena vacía no es un dato. */
function texto(valor: string | undefined | null, maximo: number): string | null {
  const limpio = valor?.trim().slice(0, maximo);
  return limpio ? limpio : null;
}

/** Entero no negativo, o null. Un "" en un campo numérico no es un cero. */
function entero(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

// -----------------------------------------------------------------------------
// Biblioteca de contenido
// -----------------------------------------------------------------------------

export async function guardarContenido(datos: {
  id?: string;
  titulo: string;
  tipo: string;
  canal: string;
  lineaProducto?: string;
  estado: string;
  gancho?: string;
  notas?: string;
  url?: string;
  alcance?: string;
  interacciones?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarContenido', async () => {
    const actor = await exigir('contenido.gestionar');

    if (!datos.titulo?.trim()) throw new Error('Falta el título');

    const valores = {
      titulo: datos.titulo.trim().slice(0, 200),
      tipo: datos.tipo as never,
      canal: datos.canal as never,
      lineaProducto: (texto(datos.lineaProducto, 40) as never) ?? null,
      estado: datos.estado as never,
      gancho: texto(datos.gancho, 500),
      notas: texto(datos.notas, 2000),
      url: texto(datos.url, 500),
      alcance: entero(datos.alcance),
      interacciones: entero(datos.interacciones),
      updatedAt: new Date(),
      /*
        La fecha de publicación la pone el sistema al pasar a 'publicado', y no
        se pide en el formulario. Es un dato que se olvida teclear justo cuando
        más importa —al publicar— y que después nadie recuerda.

        Solo se fija la primera vez: reeditar una pieza ya publicada no la
        convierte en nueva.
      */
      ...(datos.estado === 'publicado' ? { publicadoEn: sql`COALESCE(publicado_en, now())` } : {}),
    };

    const [fila] = datos.id
      ? await conBaseDeDatos((db) =>
          db.update(contenidos).set(valores).where(eq(contenidos.id, datos.id!)).returning({ id: contenidos.id })
        )
      : await conBaseDeDatos((db) =>
          db.insert(contenidos).values({ ...valores, creadoPor: actor.id || null }).returning({ id: contenidos.id })
        );

    if (!fila) throw new Error('No se pudo guardar');

    log.info(datos.id ? 'Contenido actualizado' : 'Contenido creado', {
      ruta: '/acciones/contenido',
      detalle: [actor.email, valores.titulo],
    });

    revalidatePath('/contenido');
    return { id: fila.id };
  });
}

export async function archivarContenido(id: string): Promise<Resultado> {
  return ejecutar('archivarContenido', async () => {
    const actor = await exigir('contenido.gestionar');

    // Archivar y no borrar: una pieza que funcionó es la referencia con la que
    // se escribe la siguiente, y borrarla pierde justamente lo que se aprendió.
    await conBaseDeDatos((db) =>
      db.update(contenidos).set({ estado: 'archivado', updatedAt: new Date() }).where(eq(contenidos.id, id))
    );

    log.info('Contenido archivado', { ruta: '/acciones/contenido', detalle: [actor.email, id] });
    revalidatePath('/contenido');
    return undefined;
  });
}

// -----------------------------------------------------------------------------
// Activaciones presenciales
// -----------------------------------------------------------------------------

export async function guardarActivacion(datos: {
  id?: string;
  nombre: string;
  tipo: string;
  estado: string;
  lugar: string;
  direccion?: string;
  fecha: string;
  qrCodeId?: string;
  aforoEstimado?: string;
  asistentes?: string;
  comensalesNuevos?: string;
  ventasCOP?: string;
  costeCOP?: string;
  notas?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarActivacion', async () => {
    const actor = await exigir('activaciones.gestionar');

    if (!datos.nombre?.trim()) throw new Error('Falta el nombre');
    if (!datos.lugar?.trim()) throw new Error('Falta el lugar');

    const fecha = new Date(datos.fecha);
    if (Number.isNaN(fecha.getTime())) throw new Error('La fecha no es válida');

    const valores = {
      nombre: datos.nombre.trim().slice(0, 200),
      tipo: datos.tipo as never,
      estado: datos.estado as never,
      lugar: datos.lugar.trim().slice(0, 200),
      direccion: texto(datos.direccion, 255),
      fecha,
      // Cadena vacía del <select> significa "sin QR", no un id inválido.
      qrCodeId: texto(datos.qrCodeId, 40),
      aforoEstimado: entero(datos.aforoEstimado),
      asistentes: entero(datos.asistentes),
      comensalesNuevos: entero(datos.comensalesNuevos),
      ventasCOP: entero(datos.ventasCOP),
      costeCOP: entero(datos.costeCOP),
      notas: texto(datos.notas, 2000),
      updatedAt: new Date(),
    };

    const [fila] = datos.id
      ? await conBaseDeDatos((db) =>
          db.update(activaciones).set(valores).where(eq(activaciones.id, datos.id!)).returning({ id: activaciones.id })
        )
      : await conBaseDeDatos((db) =>
          db.insert(activaciones).values({ ...valores, creadoPor: actor.id || null }).returning({ id: activaciones.id })
        );

    if (!fila) throw new Error('No se pudo guardar');

    log.info(datos.id ? 'Activación actualizada' : 'Activación creada', {
      ruta: '/acciones/contenido',
      detalle: [actor.email, valores.nombre],
    });

    revalidatePath('/contenido');
    return { id: fila.id };
  });
}

// -----------------------------------------------------------------------------
// Embajadores
// -----------------------------------------------------------------------------

/**
 * Normaliza el código del embajador.
 *
 * Va en una URL que la persona comparte y a veces dicta en voz alta, así que se
 * fuerza a minúsculas y se limita a letras, números y guiones: un código con
 * mayúsculas o acentos genera enlaces que fallan según quién los escriba.
 */
function normalizarCodigo(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);
}

export async function guardarEmbajador(datos: {
  id?: string;
  consumerId: string;
  alias?: string;
  codigo: string;
  estado: string;
  puntosPorPedido?: string;
  seguidores?: string;
  notas?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarEmbajador', async () => {
    const actor = await exigir('embajadores.gestionar');

    const codigo = normalizarCodigo(datos.codigo ?? '');
    if (codigo.length < 3) {
      throw new Error('El código debe tener al menos 3 caracteres (letras, números o guiones)');
    }

    const comensal = await conBaseDeDatos(async (db) => {
      const [c] = await db
        .select({ id: b2cConsumers.id })
        .from(b2cConsumers)
        .where(eq(b2cConsumers.id, datos.consumerId))
        .limit(1);
      return c;
    });
    if (!comensal) throw new Error('Ese comensal no existe');

    const valores = {
      consumerId: datos.consumerId,
      alias: texto(datos.alias, 80),
      codigo,
      estado: datos.estado as never,
      puntosPorPedido: entero(datos.puntosPorPedido) ?? 0,
      seguidores: entero(datos.seguidores),
      notas: texto(datos.notas, 2000),
      updatedAt: new Date(),
    };

    try {
      const [fila] = datos.id
        ? await conBaseDeDatos((db) =>
            db.update(embajadores).set(valores).where(eq(embajadores.id, datos.id!)).returning({ id: embajadores.id })
          )
        : await conBaseDeDatos((db) =>
            db.insert(embajadores).values(valores).returning({ id: embajadores.id })
          );

      if (!fila) throw new Error('No se pudo guardar');

      log.info(datos.id ? 'Embajador actualizado' : 'Embajador dado de alta', {
        ruta: '/acciones/contenido',
        detalle: [actor.email, codigo],
      });

      revalidatePath('/embajadores');
      return { id: fila.id };
    } catch (e) {
      /*
        Los dos únicos choques posibles son el código repetido y la persona ya
        dada de alta. Se traducen porque el mensaje de Postgres —"duplicate key
        value violates unique constraint uq_..."— no le dice nada a quien está
        rellenando un formulario, y el que lo lea va a pensar que el CRM se rompió.
      */
      const mensaje = e instanceof Error ? e.message : '';
      if (mensaje.includes('embajadores_codigo')) {
        throw new Error(`El código "${codigo}" ya lo usa otro embajador`);
      }
      if (mensaje.includes('embajadores_consumer_id')) {
        throw new Error('Ese comensal ya está dado de alta como embajador');
      }
      throw e;
    }
  });
}
