'use server';

// =============================================================================
// Acciones de la economía de canje
// =============================================================================
//
// Aquí el CRM deja de solo leer. Cada función mueve puntos o entrega un premio,
// así que todas empiezan exigiendo permiso y acaban dejando rastro.

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import {
  b2cConsumers,
  redemptions,
  rewards,
  pointTransactions,
  consumerReviews,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';
import { NIVELES } from '@/lib/fidelizacion';

export interface Resultado<T = undefined> {
  ok: boolean;
  error?: string;
  datos?: T;
}

/**
 * Envuelve una acción para que un fallo llegue a la interfaz como un mensaje y
 * no como una pantalla de error.
 *
 * Los errores de permiso se distinguen del resto: son la respuesta esperada del
 * sistema, no una avería, y no deben ensuciar el log de errores.
 */
async function ejecutar<T>(nombre: string, trabajo: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await trabajo() };
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message };
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/canjes' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// -----------------------------------------------------------------------------
// Catálogo de premios
// -----------------------------------------------------------------------------

export async function guardarPremio(datos: {
  id?: string;
  nombre: string;
  descripcion?: string;
  tipo: string;
  costePuntos: number;
  stock?: number | null;
  nivelMinimo?: string | null;
  diasValidez: number;
  activo: boolean;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarPremio', async () => {
    await exigir('premios.gestionar');

    if (!datos.nombre.trim()) throw new Error('El nombre es obligatorio');
    // Un premio gratis vaciaría el catálogo en cuanto alguien lo descubriera.
    if (datos.costePuntos <= 0) throw new Error('El coste en puntos debe ser mayor que cero');
    if (datos.diasValidez <= 0) throw new Error('La validez debe ser de al menos un día');

    return conBaseDeDatos(async (db) => {
      const valores = {
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion?.trim() || null,
        tipo: datos.tipo as never,
        costePuntos: datos.costePuntos,
        stock: datos.stock ?? null,
        nivelMinimo: (datos.nivelMinimo || null) as never,
        diasValidez: datos.diasValidez,
        activo: datos.activo,
        updatedAt: new Date(),
      };

      const [fila] = datos.id
        ? await db.update(rewards).set(valores).where(eq(rewards.id, datos.id)).returning({ id: rewards.id })
        : await db.insert(rewards).values(valores).returning({ id: rewards.id });

      if (!fila) throw new Error('El premio no existe');
      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/premios');
    return r;
  });
}

export async function alternarPremio(id: string, activo: boolean): Promise<Resultado> {
  return ejecutar('alternarPremio', async () => {
    await exigir('premios.gestionar');
    await conBaseDeDatos((db) =>
      db.update(rewards).set({ activo, updatedAt: new Date() }).where(eq(rewards.id, id))
    );
    revalidatePath('/premios');
    return undefined;
  });
}

// -----------------------------------------------------------------------------
// Emisión de canjes
// -----------------------------------------------------------------------------

/**
 * Código que el comensal enseña en la mesa.
 *
 * Sin I, O, 0 ni 1: se dictan y se teclean a mano, y confundir una O con un cero
 * convierte un canje válido en una discusión en el mostrador.
 */
function generarCodigo(): string {
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/**
 * Canjea puntos por un premio.
 *
 * Todo va en una transacción y el descuento de puntos lleva su propia condición
 * de saldo: sin ella, dos canjes simultáneos del mismo comensal podrían pasar
 * los dos la comprobación previa y dejarlo en negativo.
 */
export async function emitirCanje(datos: {
  consumerId: string;
  rewardId: string;
}): Promise<Resultado<{ codigo: string; expiraEn: Date }>> {
  return ejecutar('emitirCanje', async () => {
    const actor = await exigir('canjes.emitir');

    return conBaseDeDatos(async (db) =>
      db.transaction(async (tx) => {
        const [premio] = await tx.select().from(rewards).where(eq(rewards.id, datos.rewardId)).limit(1);
        if (!premio) throw new Error('El premio no existe');
        if (!premio.activo) throw new Error('Ese premio ya no está disponible');
        if (premio.stock !== null && premio.stock <= 0) throw new Error('Sin existencias de ese premio');

        const [comensal] = await tx
          .select({ puntos: b2cConsumers.points, nivel: b2cConsumers.membershipTier })
          .from(b2cConsumers)
          .where(eq(b2cConsumers.id, datos.consumerId))
          .limit(1);
        if (!comensal) throw new Error('El comensal no existe');

        if (premio.nivelMinimo) {
          const orden = NIVELES.map((n) => n.nivel) as readonly string[];
          const suyo = orden.indexOf(comensal.nivel ?? '');
          const exigido = orden.indexOf(premio.nivelMinimo);
          if (exigido !== -1 && (suyo === -1 || suyo < exigido)) {
            throw new Error(`Ese premio exige nivel ${premio.nivelMinimo}`);
          }
        }

        const saldo = comensal.puntos ?? 0;
        if (saldo < premio.costePuntos) {
          throw new Error(`Le faltan ${premio.costePuntos - saldo} puntos`);
        }

        // El WHERE con el saldo es la garantía real: si otra petición gastó los
        // puntos entre la lectura y esta línea, no actualiza ninguna fila.
        const [actualizado] = await tx
          .update(b2cConsumers)
          .set({ points: sql`${b2cConsumers.points} - ${premio.costePuntos}` })
          .where(and(
            eq(b2cConsumers.id, datos.consumerId),
            sql`COALESCE(${b2cConsumers.points}, 0) >= ${premio.costePuntos}`
          ))
          .returning({ saldo: b2cConsumers.points });

        if (!actualizado) throw new Error('El saldo cambió durante el canje. Inténtalo otra vez.');

        const expiraEn = new Date(Date.now() + premio.diasValidez * 86_400_000);
        const codigo = generarCodigo();

        const [canje] = await tx
          .insert(redemptions)
          .values({
            consumerId: datos.consumerId,
            rewardId: premio.id,
            codigo,
            puntosGastados: premio.costePuntos,
            expiraEn,
          })
          .returning();

        await tx.insert(pointTransactions).values({
          consumerId: datos.consumerId,
          puntos: -premio.costePuntos,
          motivo: 'canje',
          referenciaId: canje.id,
          descripcion: `Canje: ${premio.nombre}`,
          saldoResultante: actualizado.saldo,
        });

        if (premio.stock !== null) {
          await tx.update(rewards)
            .set({ stock: sql`${rewards.stock} - 1` })
            .where(eq(rewards.id, premio.id));
        }

        log.info('Canje emitido', {
          ruta: '/acciones/canjes',
          detalle: [actor.email, premio.nombre, codigo],
        });

        return { codigo, expiraEn };
      })
    );
  }).then((r) => {
    if (r.ok) {
      revalidatePath('/premios');
      revalidatePath('/comensales');
    }
    return r;
  });
}

// -----------------------------------------------------------------------------
// Entrega en mesa
// -----------------------------------------------------------------------------

/**
 * Marca un canje como entregado.
 *
 * La condición de estado va en el WHERE: si dos camareros teclean el mismo
 * código a la vez, solo uno actualiza la fila y el otro recibe el aviso. Con una
 * comprobación previa en JavaScript, ambos entregarían el premio.
 */
export async function entregarCanje(datos: {
  codigo: string;
  accountId?: string;
}): Promise<Resultado<{ premio: string; comensal: string | null }>> {
  return ejecutar('entregarCanje', async () => {
    const actor = await exigir('canjes.entregar');
    const codigo = datos.codigo.trim().toUpperCase();
    if (!codigo) throw new Error('Introduce el código del canje');

    return conBaseDeDatos(async (db) => {
      const [canje] = await db
        .select({
          id: redemptions.id,
          estado: redemptions.estado,
          expiraEn: redemptions.expiraEn,
          premio: rewards.nombre,
          comensal: b2cConsumers.fullName,
        })
        .from(redemptions)
        .innerJoin(rewards, eq(rewards.id, redemptions.rewardId))
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, redemptions.consumerId))
        .where(eq(redemptions.codigo, codigo))
        .limit(1);

      if (!canje) throw new Error('Ese código no existe');
      if (canje.estado === 'canjeado') throw new Error('Ese canje ya se entregó');
      if (canje.estado === 'anulado') throw new Error('Ese canje está anulado');
      if (new Date(canje.expiraEn) < new Date()) throw new Error('Ese canje ha caducado');

      const [entregado] = await db
        .update(redemptions)
        .set({
          estado: 'canjeado',
          canjeadoEn: new Date(),
          canjeadoPor: actor.id || null,
          accountId: datos.accountId ?? null,
        })
        .where(and(eq(redemptions.id, canje.id), eq(redemptions.estado, 'pendiente')))
        .returning({ id: redemptions.id });

      if (!entregado) throw new Error('Otro usuario acaba de entregar ese canje');

      log.info('Canje entregado', { ruta: '/acciones/canjes', detalle: [actor.email, codigo] });
      return { premio: canje.premio, comensal: canje.comensal };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/premios');
    return r;
  });
}

/** Revierte un canje y devuelve los puntos. */
export async function anularCanje(datos: { id: string; motivo: string }): Promise<Resultado> {
  return ejecutar('anularCanje', async () => {
    const actor = await exigir('canjes.anular');
    if (!datos.motivo.trim()) throw new Error('Indica el motivo de la anulación');

    return conBaseDeDatos(async (db) =>
      db.transaction(async (tx) => {
        const [canje] = await tx
          .update(redemptions)
          .set({ estado: 'anulado', motivoAnulacion: datos.motivo.trim() })
          .where(and(
            eq(redemptions.id, datos.id),
            // Solo se anula lo que no está ya anulado: repetirlo devolvería los
            // puntos dos veces.
            sql`${redemptions.estado} <> 'anulado'`
          ))
          .returning();

        if (!canje) throw new Error('El canje no existe o ya estaba anulado');

        const [devuelto] = await tx
          .update(b2cConsumers)
          .set({ points: sql`COALESCE(${b2cConsumers.points}, 0) + ${canje.puntosGastados}` })
          .where(eq(b2cConsumers.id, canje.consumerId))
          .returning({ saldo: b2cConsumers.points });

        await tx.insert(pointTransactions).values({
          consumerId: canje.consumerId,
          puntos: canje.puntosGastados,
          motivo: 'ajuste_manual',
          referenciaId: canje.id,
          descripcion: `Anulación de canje: ${datos.motivo.trim()}`,
          saldoResultante: devuelto?.saldo ?? null,
        });

        // El stock también vuelve: el premio no se entregó.
        await tx.update(rewards)
          .set({ stock: sql`CASE WHEN ${rewards.stock} IS NULL THEN NULL ELSE ${rewards.stock} + 1 END` })
          .where(eq(rewards.id, canje.rewardId));

        log.info('Canje anulado', { ruta: '/acciones/canjes', detalle: [actor.email, datos.id] });
        return undefined;
      })
    );
  }).then((r) => {
    if (r.ok) revalidatePath('/premios');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Ajuste manual de puntos
// -----------------------------------------------------------------------------

export async function ajustarPuntos(datos: {
  consumerId: string;
  puntos: number;
  motivo: string;
}): Promise<Resultado<{ saldo: number | null }>> {
  return ejecutar('ajustarPuntos', async () => {
    const actor = await exigir('puntos.ajustar');
    if (!Number.isInteger(datos.puntos) || datos.puntos === 0) {
      throw new Error('Indica una cantidad de puntos distinta de cero');
    }
    // Un ajuste a mano siempre lleva motivo: es la única forma de que el
    // historial siga explicando de dónde salió cada punto.
    if (!datos.motivo.trim()) throw new Error('Indica el motivo del ajuste');

    return conBaseDeDatos(async (db) =>
      db.transaction(async (tx) => {
        const [fila] = await tx
          .update(b2cConsumers)
          .set({ points: sql`GREATEST(0, COALESCE(${b2cConsumers.points}, 0) + ${datos.puntos})` })
          .where(eq(b2cConsumers.id, datos.consumerId))
          .returning({ saldo: b2cConsumers.points });

        if (!fila) throw new Error('El comensal no existe');

        await tx.insert(pointTransactions).values({
          consumerId: datos.consumerId,
          puntos: datos.puntos,
          motivo: 'ajuste_manual',
          descripcion: `${datos.motivo.trim()} (por ${actor.email})`,
          saldoResultante: fila.saldo,
        });

        return { saldo: fila.saldo };
      })
    );
  }).then((r) => {
    if (r.ok) revalidatePath('/comensales');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Compensación por un fallo de calidad
// -----------------------------------------------------------------------------

/** Nombre fijo del premio de disculpa. find-or-create: no hace falta sembrarlo aparte. */
const NOMBRE_COMPENSACION = 'Disculpa ROYS';

/**
 * Emite un cupón de compensación por una alerta de calidad confirmada.
 *
 * NO usa emitirCanje(): esto no lo paga el comensal con sus puntos, lo paga
 * la casa. `puntosGastados` se guarda en 0 y el saldo de puntos del comensal
 * no se toca en absoluto — un cupón que "cuesta puntos" a quien recibió un
 * producto defectuoso sería una disculpa que además le sale cara.
 */
export async function emitirCompensacion(datos: {
  consumerId: string;
  motivo: string;
  reviewId?: string;
}): Promise<Resultado<{ codigo: string; expiraEn: Date }>> {
  return ejecutar('emitirCompensacion', async () => {
    const actor = await exigir('resenas.moderar');
    if (!datos.motivo.trim()) throw new Error('Indica el motivo de la compensación');

    return conBaseDeDatos(async (db) =>
      db.transaction(async (tx) => {
        let [premio] = await tx.select().from(rewards).where(eq(rewards.nombre, NOMBRE_COMPENSACION)).limit(1);
        if (!premio) {
          [premio] = await tx
            .insert(rewards)
            .values({
              nombre: NOMBRE_COMPENSACION,
              descripcion: 'Compensación por una experiencia que no estuvo a la altura. La casa invita.',
              tipo: 'producto',
              // 0 puntos: no es un premio del catálogo normal, es una
              // disculpa. No aparece como "gratis" en la tienda porque nadie
              // lo canjea desde ahí — solo lo emite el equipo, desde aquí.
              costePuntos: 0,
              diasValidez: 60,
              activo: false,
            })
            .returning();
        }

        const comensal = await tx
          .select({ id: b2cConsumers.id })
          .from(b2cConsumers)
          .where(eq(b2cConsumers.id, datos.consumerId))
          .limit(1);
        if (!comensal[0]) throw new Error('El comensal no existe');

        const codigo = generarCodigo();
        const expiraEn = new Date(Date.now() + premio.diasValidez * 86_400_000);

        const [canje] = await tx
          .insert(redemptions)
          .values({
            consumerId: datos.consumerId,
            rewardId: premio.id,
            codigo,
            puntosGastados: 0,
            expiraEn,
          })
          .returning();

        if (datos.reviewId) {
          await tx
            .update(consumerReviews)
            .set({
              atributos: sql`
                COALESCE(${consumerReviews.atributos}, '{}'::jsonb) ||
                ${JSON.stringify({
                  _compensacionCodigo: codigo,
                  _compensacionMotivo: datos.motivo.trim(),
                  _compensacionPor: actor.email,
                  _compensacionEn: new Date().toISOString(),
                })}::jsonb
              `,
            })
            .where(eq(consumerReviews.id, datos.reviewId));
        }

        log.info('Compensación emitida', {
          ruta: '/acciones/canjes',
          detalle: [actor.email, datos.consumerId, codigo],
        });

        return { codigo, expiraEn };
      })
    );
  }).then((r) => {
    if (r.ok) { revalidatePath('/resenas'); revalidatePath('/premios'); }
    return r;
  });
}
