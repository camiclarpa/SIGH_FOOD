// =============================================================================
// Identidad liviana: el teléfono es la cuenta
// =============================================================================
//
// Sin contraseña, sin correo, sin registro. Se pide un código de seis dígitos
// por WhatsApp y ya está. Cualquier cosa más pesada se paga en compras
// perdidas: en comida a domicilio, el formulario de registro es donde más gente
// se va.
//
// Y hay una razón de fondo: el teléfono YA hay que darlo para recibir el
// pedido. Convertirlo en la identidad no pide ni un dato más de los que la
// persona iba a dar de todas formas.
//
// DECISIONES DE SEGURIDAD
// -----------------------
// · El código se guarda hasheado. Son seis dígitos que viven diez minutos, pero
//   quien pueda leer la base no debería poder entrar como otra persona.
// · El token de sesión también. Una fuga de la base no debe entregar sesiones
//   activas.
// · Cinco intentos y el código muere. Sin ese tope, seis dígitos son un millón
//   de combinaciones que un script prueba en minutos.
// · Pedir un código nuevo invalida el anterior: si no, cada petición añade una
//   llave más al mismo cerrojo.

import { and, desc, eq, gt, isNull, sql as sqlRaw } from 'drizzle-orm';
import { b2cConsumers, sesionesCliente } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { normalizarTelefono } from '@/lib/pedidos';

/** Cuánto vive el código. Diez minutos: suficiente para leerlo, poco para atacarlo. */
const CODIGO_MINUTOS = 10;
/** Cuánto vive la sesión. Treinta días: es una tienda de comida, no un banco. */
const SESION_DIAS = 30;
const MAX_INTENTOS = 5;

export const COOKIE_SESION = 'bocazo_sesion';

/** SHA-256 en hex. Web Crypto: funciona igual en Workers y en Node. */
async function hash(valor: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(valor));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Código de seis dígitos.
 *
 * Con getRandomValues y no con Math.random: este último es predecible a partir
 * de unas cuantas salidas, y aquí el número ES la credencial.
 */
function generarCodigo(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, '0');
}

/** Token de sesión de 256 bits. */
function generarToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export type ResultadoCodigo =
  | { ok: true; telefono: string; codigo: string }
  | { ok: false; error: string };

/**
 * Crea un código para un teléfono.
 *
 * Devuelve el código en claro UNA sola vez, para que quien llama lo mande por
 * WhatsApp. No se puede recuperar después: en la base solo queda el hash.
 */
export async function pedirCodigo(telefonoBruto: string): Promise<ResultadoCodigo> {
  const telefono = normalizarTelefono(telefonoBruto);
  if (!telefono) return { ok: false, error: 'Ese teléfono no parece válido' };

  const codigo = generarCodigo();
  const codigoHash = await hash(codigo);
  const expira = new Date(Date.now() + CODIGO_MINUTOS * 60_000);

  return conBaseDeDatos(async (db) => {
    // Un código nuevo invalida los anteriores del mismo número. Sin esto, cada
    // petición dejaría otra llave viva sobre el mismo cerrojo.
    await db
      .update(sesionesCliente)
      .set({ codigoHash: null, codigoExpiraEn: null })
      .where(and(eq(sesionesCliente.telefono, telefono), isNull(sesionesCliente.verificadoEn)));

    const [comensal] = await db
      .select({ id: b2cConsumers.id })
      .from(b2cConsumers)
      .where(eq(b2cConsumers.whatsappPhone, telefono))
      .limit(1);

    await db.insert(sesionesCliente).values({
      telefono,
      consumerId: comensal?.id ?? null,
      codigoHash,
      codigoExpiraEn: expira,
    });

    return { ok: true as const, telefono, codigo };
  });
}

export type ResultadoVerificar =
  | { ok: true; token: string; consumerId: string; expiraEn: Date }
  | { ok: false; error: string };

/**
 * Comprueba el código y abre sesión.
 *
 * Los intentos se cuentan en la propia fila y se comparan dentro del UPDATE:
 * llevar la cuenta en memoria no serviría, porque cada isolate de Workers tiene
 * la suya y el límite real sería el configurado por el número de isolates.
 */
export async function verificarCodigo(
  telefonoBruto: string,
  codigo: string
): Promise<ResultadoVerificar> {
  const telefono = normalizarTelefono(telefonoBruto);
  if (!telefono) return { ok: false, error: 'Ese teléfono no parece válido' };
  if (!/^\d{6}$/.test(codigo)) return { ok: false, error: 'El código son seis dígitos' };

  const codigoHash = await hash(codigo);

  return conBaseDeDatos(async (db) => {
    const [fila] = await db
      .select()
      .from(sesionesCliente)
      .where(
        and(
          eq(sesionesCliente.telefono, telefono),
          isNull(sesionesCliente.verificadoEn),
          gt(sesionesCliente.codigoExpiraEn, new Date())
        )
      )
      .orderBy(desc(sesionesCliente.createdAt))
      .limit(1);

    if (!fila) return { ok: false as const, error: 'El código caducó. Pide uno nuevo.' };

    if (fila.intentos >= MAX_INTENTOS) {
      return { ok: false as const, error: 'Demasiados intentos. Pide un código nuevo.' };
    }

    if (fila.codigoHash !== codigoHash) {
      // El fallo se cuenta con una expresión SQL, no leyendo y escribiendo:
      // varios intentos a la vez se pisarían y el contador quedaría corto.
      await db
        .update(sesionesCliente)
        .set({ intentos: sqlRaw`${sesionesCliente.intentos} + 1` })
        .where(eq(sesionesCliente.id, fila.id));

      const quedan = MAX_INTENTOS - fila.intentos - 1;
      return {
        ok: false as const,
        error: quedan > 0 ? `Código incorrecto. Te quedan ${quedan} intentos.` : 'Código incorrecto.',
      };
    }

    // El comensal se crea aquí si no existía: alguien puede pedir su código
    // antes de haber comprado nunca.
    let consumerId = fila.consumerId;
    if (!consumerId) {
      const [nuevo] = await db
        .insert(b2cConsumers)
        .values({ whatsappPhone: telefono })
        .onConflictDoNothing({ target: b2cConsumers.whatsappPhone })
        .returning({ id: b2cConsumers.id });

      consumerId = nuevo?.id ?? null;
      if (!consumerId) {
        const [existente] = await db
          .select({ id: b2cConsumers.id })
          .from(b2cConsumers)
          .where(eq(b2cConsumers.whatsappPhone, telefono))
          .limit(1);
        consumerId = existente?.id ?? null;
      }
    }

    if (!consumerId) return { ok: false as const, error: 'No pudimos abrir tu sesión' };

    const token = generarToken();
    const expiraEn = new Date(Date.now() + SESION_DIAS * 86_400_000);

    await db
      .update(sesionesCliente)
      .set({
        consumerId,
        tokenHash: await hash(token),
        expiraEn,
        verificadoEn: new Date(),
        // El código se quema al usarlo: un código válido dos veces es un código
        // que sirve para entrar dos veces.
        codigoHash: null,
        codigoExpiraEn: null,
      })
      .where(eq(sesionesCliente.id, fila.id));

    return { ok: true as const, token, consumerId, expiraEn };
  });
}

export type { Identidad } from '@/lib/club-tipos';
import type { Identidad } from '@/lib/club-tipos';

/**
 * Quién es el portador de este token, o null.
 *
 * Se consulta por el hash, nunca por el token: así el índice sirve y la base
 * jamás contiene el valor que abre la sesión.
 */
export async function identidadDe(token: string | undefined): Promise<Identidad | null> {
  if (!token) return null;

  const tokenHash = await hash(token);

  return conBaseDeDatos(async (db) => {
    const [fila] = await db
      .select({
        consumerId: sesionesCliente.consumerId,
        telefono: sesionesCliente.telefono,
        nombre: b2cConsumers.fullName,
        puntos: b2cConsumers.points,
      })
      .from(sesionesCliente)
      .innerJoin(b2cConsumers, eq(b2cConsumers.id, sesionesCliente.consumerId))
      .where(and(eq(sesionesCliente.tokenHash, tokenHash), gt(sesionesCliente.expiraEn, new Date())))
      .limit(1);

    if (!fila?.consumerId) return null;

    return {
      consumerId: fila.consumerId,
      telefono: fila.telefono,
      nombre: fila.nombre,
      puntos: fila.puntos ?? 0,
    };
  });
}

/** Cierra la sesión invalidando el token en la base, no solo la cookie. */
export async function cerrarSesion(token: string | undefined): Promise<void> {
  if (!token) return;
  const tokenHash = await hash(token);

  await conBaseDeDatos(async (db) => {
    // Se borra el token en lugar de la fila: el historial de verificaciones es
    // útil si algún día hay que investigar un acceso.
    await db
      .update(sesionesCliente)
      .set({ tokenHash: null, expiraEn: null })
      .where(eq(sesionesCliente.tokenHash, tokenHash));
  });
}
