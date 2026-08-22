// =============================================================================
// Capa phygital: del QR de la mesa al pedido
// =============================================================================
//
// El caso que resuelve es el más valioso de todos: alguien sentado en el local,
// con el antojo delante, que no tiene que levantarse, hacer cola ni esperar a
// que le vean la mano levantada.
//
// El QR ya existía en el CRM (tabla qr_codes, pantalla /qr): token → local +
// mesa, con `destinoUrl` para poder cambiar la campaña de un adhesivo YA
// PEGADO, y `campana` para medir qué lote trajo qué. Aquí no se reinventa nada:
// se consume.
//
// POR QUÉ EL CONTEXTO VIVE EN UNA COOKIE
// --------------------------------------
// El token llega una sola vez, en la URL del escaneo. A partir de ahí la
// persona navega —catálogo, producto, carrito, checkout— y el parámetro se
// pierde en el primer clic. Arrastrarlo por todas las URLs ensuciaría cada
// enlace y se rompería en cuanto alguien comparta uno.
//
// La cookie dura unas horas, no días: una mesa se ocupa por una noche. Si
// caducara al cerrar la pestaña se perdería al mirar WhatsApp un momento; si
// durara un mes, alguien pediría a domicilio desde casa y la comanda saldría
// hacia la mesa 4 de un bar donde no está.

import { and, eq } from 'drizzle-orm';
import { accounts, qrCodes } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export const COOKIE_MESA = 'bocazo_mesa';

/** Cuánto vale el contexto de mesa. Una noche larga, no más. */
export const HORAS_MESA = 6;

export interface ContextoMesa {
  qrToken: string;
  accountId: string;
  local: string;
  zona: string | null;
  mesa: string;
  campana: string | null;
}

/**
 * Resuelve un token de QR a local y mesa.
 *
 * Devuelve null si el token no existe o el QR está desactivado. Desactivar un
 * QR es la forma de retirar un adhesivo sin ir a despegarlo: a partir de ese
 * momento lleva al catálogo normal, no a una mesa que ya no existe.
 */
export async function resolverQr(token: string): Promise<ContextoMesa | null> {
  if (!token || token.length > 255) return null;

  return conBaseDeDatos(async (db) => {
    const [fila] = await db
      .select({
        qrToken: qrCodes.qrToken,
        accountId: qrCodes.accountId,
        mesa: qrCodes.tableNumber,
        campana: qrCodes.campana,
        local: accounts.commercialName,
        nombre: accounts.name,
        zona: accounts.zone,
      })
      .from(qrCodes)
      .innerJoin(accounts, eq(accounts.id, qrCodes.accountId))
      .where(and(eq(qrCodes.qrToken, token), eq(qrCodes.isActive, true)))
      .limit(1);

    if (!fila) return null;

    return {
      qrToken: fila.qrToken,
      accountId: fila.accountId,
      // El nombre comercial es el que la gente reconoce; el razón social solo
      // sirve para facturar.
      local: fila.local || fila.nombre,
      zona: fila.zona,
      mesa: fila.mesa,
      campana: fila.campana,
    };
  });
}

/**
 * Serializa el contexto para la cookie.
 *
 * Va en claro y sin firmar a propósito: no es una credencial. Lo peor que se
 * consigue manipulándola es pedir a una mesa equivocada del mismo local, que es
 * exactamente lo que ya se puede hacer escaneando el QR de la mesa de al lado.
 * Firmarla añadiría criptografía para proteger algo que no lo necesita.
 *
 * Lo que sí se hace es NO fiarse del `accountId` que venga en ella al crear el
 * pedido: se revalida el token contra la base. Ver crearPedido().
 */
export function serializar(c: ContextoMesa): string {
  return JSON.stringify({ t: c.qrToken, a: c.accountId, m: c.mesa, l: c.local });
}

export function deserializar(valor: string | undefined): { qrToken: string; mesa: string; local: string } | null {
  if (!valor) return null;
  try {
    const d = JSON.parse(valor);
    if (!d?.t || !d?.m) return null;
    return { qrToken: String(d.t), mesa: String(d.m), local: String(d.l ?? '') };
  } catch {
    return null;
  }
}
