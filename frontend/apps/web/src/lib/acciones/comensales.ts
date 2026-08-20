'use server';

// =============================================================================
// Acciones sobre el comensal: reseñas, consentimientos y staff
// =============================================================================
//
// Todo lo de aquí toca datos personales de alguien que confió en la marca al
// escanear un QR. La revocación de consentimiento no es una casilla más: es la
// obligación que hace legal el resto del programa.

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, sql } from 'drizzle-orm';
import {
  consumerReviews,
  dataConsents,
  b2cConsumers,
  staffUsers,
  mensajesEntrantes,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso, type Rol } from '@/lib/permisos';

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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/comensales' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// -----------------------------------------------------------------------------
// Reseñas
// -----------------------------------------------------------------------------

/** Registra la reseña que deja el comensal en la mesa. */
export async function guardarResena(datos: {
  consumerId: string;
  accountId?: string;
  momentId?: string;
  productLine?: string;
  puntuacion: number;
  comentario?: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarResena', async () => {
    // No exige permiso: la deja el propio comensal desde la mesa, no el equipo.
    if (datos.puntuacion < 1 || datos.puntuacion > 5) {
      throw new Error('La puntuación debe estar entre 1 y 5');
    }

    return conBaseDeDatos(async (db) => {
      const [fila] = await db
        .insert(consumerReviews)
        .values({
          consumerId: datos.consumerId,
          accountId: datos.accountId ?? null,
          momentId: datos.momentId ?? null,
          productLine: (datos.productLine ?? null) as never,
          puntuacion: datos.puntuacion,
          comentario: datos.comentario?.trim() || null,
        })
        .returning({ id: consumerReviews.id });

      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/resenas');
    return r;
  });
}

/**
 * Marca una alerta de calidad como revisada.
 *
 * La alerta la pone la IA; quitarla es una decisión humana. Se conserva el
 * análisis —sentimiento, atributos— y solo se baja la bandera: borrar el
 * análisis perdería el motivo por el que saltó.
 */
export async function resolverAlerta(datos: {
  id: string;
  esFalloReal: boolean;
  nota?: string;
}): Promise<Resultado> {
  return ejecutar('resolverAlerta', async () => {
    const actor = await exigir('resenas.moderar');

    return conBaseDeDatos(async (db) => {
      const [fila] = await db
        .update(consumerReviews)
        .set({
          alertaCalidad: false,
          atributos: sql`
            COALESCE(${consumerReviews.atributos}, '{}'::jsonb) ||
            ${JSON.stringify({
              _revisadoPor: actor.email,
              _revisadoEn: new Date().toISOString(),
              _falloConfirmado: datos.esFalloReal ? 'si' : 'no',
              ...(datos.nota?.trim() ? { _notaRevision: datos.nota.trim() } : {}),
            })}::jsonb
          `,
        })
        .where(and(eq(consumerReviews.id, datos.id), eq(consumerReviews.alertaCalidad, true)))
        .returning({ id: consumerReviews.id });

      if (!fila) throw new Error('Esa alerta ya estaba resuelta');

      log.info('Alerta de calidad resuelta', {
        ruta: '/acciones/comensales',
        detalle: [actor.email, datos.esFalloReal ? 'fallo confirmado' : 'descartada'],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) { revalidatePath('/resenas'); revalidatePath('/panel'); }
    return r;
  });
}

// -----------------------------------------------------------------------------
// Consentimientos
// -----------------------------------------------------------------------------

export type CanalConsentimiento = 'whatsapp' | 'email' | 'sms' | 'push' | 'datos';

/**
 * Revoca el consentimiento de un canal.
 *
 * Se marca revocado en lugar de borrar la fila: hay que poder demostrar que
 * hubo consentimiento antes y cuándo dejó de haberlo. Borrarlo destruiría la
 * prueba de las dos cosas.
 *
 * Revocar 'datos' revoca todo lo demás: sin permiso para tratar los datos, no
 * queda base legal para ningún canal.
 */
export async function revocarConsentimiento(datos: {
  consumerId: string;
  canal: CanalConsentimiento;
  aPeticionDelComensal: boolean;
}): Promise<Resultado<{ revocados: number }>> {
  return ejecutar('revocarConsentimiento', async () => {
    const actor = await exigir('consentimientos.revocar');

    return conBaseDeDatos(async (db) => {
      const quien = datos.aPeticionDelComensal
        ? 'el comensal'
        : `equipo: ${actor.email}`;

      const filas = await db
        .update(dataConsents)
        .set({ revokedAt: new Date(), revokedBy: quien })
        .where(and(
          eq(dataConsents.consumerId, datos.consumerId),
          isNull(dataConsents.revokedAt),
          // 'datos' arrastra a todos; el resto solo a su canal.
          datos.canal === 'datos' ? undefined : eq(dataConsents.canal, datos.canal)
        ))
        .returning({ id: dataConsents.id });

      // Sin permiso de contacto, el VIP de WhatsApp deja de tener sentido.
      if (datos.canal === 'whatsapp' || datos.canal === 'datos') {
        await db
          .update(b2cConsumers)
          .set({ isVipWhatsapp: false })
          .where(eq(b2cConsumers.id, datos.consumerId));
      }

      log.info('Consentimiento revocado', {
        ruta: '/acciones/comensales',
        detalle: [actor.email, datos.canal, `${filas.length} registros`],
      });

      return { revocados: filas.length };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/comensales');
    return r;
  });
}

/** Vuelve a otorgar un consentimiento revocado. Crea una fila nueva. */
export async function otorgarConsentimiento(datos: {
  consumerId: string;
  canal: CanalConsentimiento;
}): Promise<Resultado> {
  return ejecutar('otorgarConsentimiento', async () => {
    const actor = await exigir('consentimientos.revocar');

    await conBaseDeDatos((db) =>
      db.insert(dataConsents).values({
        consumerId: datos.consumerId,
        consentType: datos.canal,
        canal: datos.canal,
        // Queda claro que lo registró el equipo y no el propio comensal desde
        // su móvil: no es la misma prueba de consentimiento.
        userAgent: `registrado por ${actor.email}`,
        grantedAt: new Date(),
      })
    );

    log.info('Consentimiento otorgado', {
      ruta: '/acciones/comensales',
      detalle: [actor.email, datos.canal],
    });
    return undefined;
  }).then((r) => {
    if (r.ok) revalidatePath('/comensales');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Bandeja de entrada
// -----------------------------------------------------------------------------

export async function marcarAtendido(datos: {
  id: string;
  nota?: string;
}): Promise<Resultado> {
  return ejecutar('marcarAtendido', async () => {
    const actor = await exigir('campanas.editar');

    const [fila] = await conBaseDeDatos((db) =>
      db
        .update(mensajesEntrantes)
        .set({
          atendido: true,
          atendidoPor: actor.id || null,
          atendidoEn: new Date(),
          notaInterna: datos.nota?.trim() || null,
        })
        .where(and(eq(mensajesEntrantes.id, datos.id), eq(mensajesEntrantes.atendido, false)))
        .returning({ id: mensajesEntrantes.id })
    );

    if (!fila) throw new Error('Ese mensaje ya estaba atendido');
    return undefined;
  }).then((r) => {
    if (r.ok) revalidatePath('/mensajeria');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Usuarios del equipo
// -----------------------------------------------------------------------------

/** PBKDF2-SHA256. Workers rechaza más de 100.000 iteraciones. */
const ITERACIONES = 100_000;

async function hashearPassword(password: string): Promise<string> {
  const hex = (b: ArrayBuffer) =>
    [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

  const sal = crypto.getRandomValues(new Uint8Array(16));
  const clave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: ITERACIONES, hash: 'SHA-256' }, clave, 256
  );
  return `${ITERACIONES}:${hex(sal.buffer as ArrayBuffer)}:${hex(bits)}`;
}

export async function crearUsuario(datos: {
  email: string;
  fullName: string;
  rol: Rol;
  password: string;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('crearUsuario', async () => {
    const actor = await exigir('usuarios.gestionar');

    const email = datos.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('El email no es válido');
    if (!datos.fullName.trim()) throw new Error('El nombre es obligatorio');
    // 12 y no 8: esta contraseña abre el CRM entero, con los datos personales de
    // todos los comensales dentro.
    if (datos.password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres');

    return conBaseDeDatos(async (db) => {
      const [existe] = await db
        .select({ id: staffUsers.id })
        .from(staffUsers)
        .where(eq(staffUsers.email, email))
        .limit(1);
      if (existe) throw new Error('Ya hay un usuario con ese email');

      const [fila] = await db
        .insert(staffUsers)
        .values({
          email,
          fullName: datos.fullName.trim(),
          passwordHash: await hashearPassword(datos.password),
          role: datos.rol,
          isActive: true,
        })
        .returning({ id: staffUsers.id });

      log.info('Usuario creado', { ruta: '/acciones/comensales', detalle: [actor.email, email, datos.rol] });
      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/usuarios');
    return r;
  });
}

export async function cambiarRol(datos: { id: string; rol: Rol }): Promise<Resultado> {
  return ejecutar('cambiarRol', async () => {
    const actor = await exigir('usuarios.gestionar');

    return conBaseDeDatos(async (db) => {
      // Quitarse a uno mismo el rol de admin deja el CRM sin quien gestione
      // usuarios si es el único, y es un error del que no se sale desde la
      // interfaz.
      if (datos.id === actor.id && datos.rol !== 'admin') {
        throw new Error('No puedes quitarte a ti mismo el rol de administrador');
      }

      if (datos.rol !== 'admin') {
        const [{ admins }] = await db
          .select({ admins: sql<number>`COUNT(*)::int` })
          .from(staffUsers)
          .where(and(eq(staffUsers.role, 'admin'), eq(staffUsers.isActive, true)));

        const [objetivo] = await db
          .select({ rol: staffUsers.role })
          .from(staffUsers)
          .where(eq(staffUsers.id, datos.id))
          .limit(1);

        if (objetivo?.rol === 'admin' && Number(admins) <= 1) {
          throw new Error('No se puede dejar el sistema sin ningún administrador');
        }
      }

      const [fila] = await db
        .update(staffUsers)
        .set({ role: datos.rol })
        .where(eq(staffUsers.id, datos.id))
        .returning({ email: staffUsers.email });

      if (!fila) throw new Error('El usuario no existe');

      log.info('Rol cambiado', { ruta: '/acciones/comensales', detalle: [actor.email, fila.email, datos.rol] });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/usuarios');
    return r;
  });
}

export async function alternarUsuario(id: string, activo: boolean): Promise<Resultado> {
  return ejecutar('alternarUsuario', async () => {
    const actor = await exigir('usuarios.gestionar');

    if (id === actor.id && !activo) {
      throw new Error('No puedes desactivarte a ti mismo');
    }

    return conBaseDeDatos(async (db) => {
      if (!activo) {
        const [{ admins }] = await db
          .select({ admins: sql<number>`COUNT(*)::int` })
          .from(staffUsers)
          .where(and(eq(staffUsers.role, 'admin'), eq(staffUsers.isActive, true)));

        const [objetivo] = await db
          .select({ rol: staffUsers.role })
          .from(staffUsers)
          .where(eq(staffUsers.id, id))
          .limit(1);

        if (objetivo?.rol === 'admin' && Number(admins) <= 1) {
          throw new Error('No se puede desactivar al único administrador');
        }
      }

      await db.update(staffUsers).set({ isActive: activo }).where(eq(staffUsers.id, id));
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/usuarios');
    return r;
  });
}
