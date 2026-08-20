'use server';

// =============================================================================
// Acciones de la suite de códigos QR
// =============================================================================
//
// El QR es el único punto por el que entra un comensal, así que estas acciones
// tocan la puerta de entrada del negocio: un lote mal generado deja un local sin
// captación, y una redirección mal puesta manda a los comensales a ningún sitio.

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { qrCodes, accounts } from '@sighfood/domain/db/schema';
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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/qr' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

/** Tope por lote. Un local con más de 200 mesas es un error de tecleo. */
const MAX_LOTE = 200;

/**
 * Token del QR.
 *
 * 24 caracteres de un alfabeto de 32: unos 120 bits. No es adivinable por
 * fuerza bruta, que es lo que importa — quien acierte un token puede registrar
 * momentos falsos en nombre de una mesa.
 */
function generarToken(): string {
  const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/**
 * Crea un lote de QR para un local.
 *
 * Existe porque dar de alta un bar de 30 mesas una a una son 30 formularios, y
 * a la mesa 19 alguien se equivoca de número sin darse cuenta.
 */
export async function crearLote(datos: {
  accountId: string;
  desde: number;
  hasta: number;
  prefijo?: string;
  campana?: string;
}): Promise<Resultado<{ creados: number; omitidos: string[] }>> {
  return ejecutar('crearLote', async () => {
    const actor = await exigir('qr.gestionar');

    const { desde, hasta } = datos;
    if (!Number.isInteger(desde) || !Number.isInteger(hasta)) {
      throw new Error('Los números de mesa deben ser enteros');
    }
    if (desde < 1 || hasta < desde) throw new Error('El rango de mesas no es válido');
    if (hasta - desde + 1 > MAX_LOTE) throw new Error(`El lote no puede superar ${MAX_LOTE} mesas`);

    const prefijo = (datos.prefijo ?? 'Mesa').trim();

    return conBaseDeDatos(async (db) => {
      const [bar] = await db.select({ id: accounts.id, nombre: accounts.name })
        .from(accounts).where(eq(accounts.id, datos.accountId)).limit(1);
      if (!bar) throw new Error('El bar no existe');

      const etiquetas = Array.from({ length: hasta - desde + 1 }, (_, i) => `${prefijo} ${desde + i}`);

      // Se consulta qué mesas ya tienen QR en lugar de dejar que falle el
      // insert: así se crean las que faltan y se informa de las omitidas, en
      // vez de abortar el lote entero por una mesa repetida.
      const existentes = await db
        .select({ mesa: qrCodes.tableNumber })
        .from(qrCodes)
        .where(and(eq(qrCodes.accountId, bar.id), inArray(qrCodes.tableNumber, etiquetas)));

      const yaHay = new Set(existentes.map((e) => e.mesa));
      const nuevas = etiquetas.filter((e) => !yaHay.has(e));

      if (nuevas.length === 0) {
        return { creados: 0, omitidos: [...yaHay] };
      }

      await db.insert(qrCodes).values(
        nuevas.map((mesa) => ({
          accountId: bar.id,
          tableNumber: mesa,
          qrToken: generarToken(),
          isActive: true,
          campana: datos.campana?.trim() || null,
        }))
      );

      log.info('Lote de QR creado', {
        ruta: '/acciones/qr',
        detalle: [actor.email, bar.nombre, `${nuevas.length} mesas`],
      });

      return { creados: nuevas.length, omitidos: [...yaHay] };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/qr');
    return r;
  });
}

/**
 * Cambia a dónde lleva un QR ya impreso.
 *
 * Es lo que permite reutilizar un adhesivo pegado en una mesa para otra
 * campaña. Sin esto, cambiar el destino obliga a reimprimir y sustituir cada
 * pegatina del local.
 */
export async function redirigirQr(datos: {
  id: string;
  destinoUrl: string | null;
  campana?: string | null;
}): Promise<Resultado> {
  return ejecutar('redirigirQr', async () => {
    const actor = await exigir('qr.redirigir');

    const destino = datos.destinoUrl?.trim() || null;

    if (destino) {
      let url: URL;
      try {
        url = new URL(destino);
      } catch {
        throw new Error('La URL no es válida. Debe empezar por https://');
      }
      // Solo https: un QR pegado en una mesa se escanea en un móvil ajeno, y
      // mandarlo por http expone el tráfico de quien confió en la marca.
      if (url.protocol !== 'https:') throw new Error('La URL debe usar https');
    }

    return conBaseDeDatos(async (db) => {
      const [fila] = await db
        .update(qrCodes)
        .set({ destinoUrl: destino, campana: datos.campana?.trim() || null })
        .where(eq(qrCodes.id, datos.id))
        .returning({ mesa: qrCodes.tableNumber });

      if (!fila) throw new Error('El código QR no existe');

      log.info('QR redirigido', {
        ruta: '/acciones/qr',
        detalle: [actor.email, fila.mesa, destino ?? 'flujo normal'],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/qr');
    return r;
  });
}

/** Activa o desactiva un QR sin borrarlo: el adhesivo sigue en la mesa. */
export async function alternarQr(id: string, activo: boolean): Promise<Resultado> {
  return ejecutar('alternarQr', async () => {
    await exigir('qr.gestionar');
    await conBaseDeDatos((db) =>
      db.update(qrCodes).set({ isActive: activo }).where(eq(qrCodes.id, id))
    );
    revalidatePath('/qr');
    return undefined;
  });
}

/** Cambia el destino de todos los QR de un bar a la vez. */
export async function redirigirLote(datos: {
  accountId: string;
  destinoUrl: string | null;
  campana?: string | null;
}): Promise<Resultado<{ afectados: number }>> {
  return ejecutar('redirigirLote', async () => {
    const actor = await exigir('qr.redirigir');
    const destino = datos.destinoUrl?.trim() || null;

    if (destino) {
      try {
        const url = new URL(destino);
        if (url.protocol !== 'https:') throw new Error('https');
      } catch {
        throw new Error('La URL no es válida. Debe empezar por https://');
      }
    }

    return conBaseDeDatos(async (db) => {
      const filas = await db
        .update(qrCodes)
        .set({ destinoUrl: destino, campana: datos.campana?.trim() || null })
        .where(eq(qrCodes.accountId, datos.accountId))
        .returning({ id: qrCodes.id });

      log.info('Lote de QR redirigido', {
        ruta: '/acciones/qr',
        detalle: [actor.email, `${filas.length} códigos`],
      });
      return { afectados: filas.length };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/qr');
    return r;
  });
}
