// =============================================================================
// SIGH_FOOD - Destino de los códigos QR de mesa
// Ruta: GET /m/<token>
// =============================================================================
//
// Es la URL que va impresa en el adhesivo, y por eso nunca cambia. Adónde lleva
// sí: si el QR tiene `destino_url`, se redirige ahí; si no, al flujo normal de
// escaneo.
//
// Esa indirección es todo el motivo de que exista esta ruta. Si el adhesivo
// llevara impresa la URL final, cambiar de campaña obligaría a reimprimir y
// sustituir físicamente cada pegatina del local.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { qrCodes, accounts } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';

export const GET = conTrazas('/m/[token]', async (
  request: NextRequest,
  contexto: { params: Promise<{ token: string }> }
) => {
  const { token } = await contexto.params;

  if (!token || token.length < 8) {
    return NextResponse.redirect(new URL('/', request.url), 302);
  }

  const qr = await conBaseDeDatos(async (db) => {
    const [fila] = await db
      .select({
        id: qrCodes.id,
        activo: qrCodes.isActive,
        destino: qrCodes.destinoUrl,
        campana: qrCodes.campana,
        mesa: qrCodes.tableNumber,
        bar: accounts.name,
      })
      .from(qrCodes)
      .leftJoin(accounts, eq(accounts.id, qrCodes.accountId))
      .where(eq(qrCodes.qrToken, token))
      .limit(1);
    return fila;
  });

  // Token desconocido o QR retirado: a la portada, sin explicar por qué. Decir
  // "ese código no existe" ayudaría a quien esté probando tokens al azar.
  if (!qr || !qr.activo) {
    log.warn('Escaneo de QR no válido', { ruta: '/m/[token]' });
    return NextResponse.redirect(new URL('/', request.url), 302);
  }

  if (qr.destino) {
    let destino: URL;
    try {
      destino = new URL(qr.destino);
    } catch {
      // Una URL corrupta en la base no debe dejar la mesa sin salida: se cae al
      // flujo normal, que siempre funciona.
      log.error('destino_url no es una URL válida', new Error(qr.destino), { ruta: '/m/[token]' });
      return NextResponse.redirect(new URL(`/escanear?qr=${token}`, request.url), 302);
    }

    // Se arrastran mesa y campaña: sin ellas, la landing de destino no puede
    // saber de qué mesa vino el comensal ni qué adhesivo lo trajo.
    destino.searchParams.set('qr', token);
    if (qr.mesa) destino.searchParams.set('mesa', qr.mesa);
    if (qr.campana) destino.searchParams.set('campana', qr.campana);

    // 302 y no 301: un 301 lo cachea el navegador para siempre, y el adhesivo
    // dejaría de poder redirigirse a otro sitio nunca más.
    return NextResponse.redirect(destino, 302);
  }

  const escanear = new URL(`/escanear?qr=${token}`, request.url);
  if (qr.mesa) escanear.searchParams.set('mesa', qr.mesa);
  if (qr.bar) escanear.searchParams.set('bar', qr.bar);
  return NextResponse.redirect(escanear, 302);
});
