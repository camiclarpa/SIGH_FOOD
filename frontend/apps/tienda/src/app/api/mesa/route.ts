// Guarda o borra el contexto de mesa.
//
// El POST recibe el TOKEN del QR y lo resuelve en el servidor. Nunca se acepta
// el local ni el numero de mesa que venga del navegador: con eso, cualquiera
// podria colar una comanda en un local ajeno.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { COOKIE_MESA, HORAS_MESA, resolverQr, serializar } from '@/lib/mesa';

export const dynamic = 'force-dynamic';

const esquema = z.object({ qr: z.string().min(4).max(255) });

export async function POST(request: NextRequest) {
  const v = esquema.safeParse(await request.json().catch(() => null));
  if (!v.success) return NextResponse.json({ ok: false, error: 'Código no válido' }, { status: 400 });

  const ctx = await resolverQr(v.data.qr);
  if (!ctx) {
    return NextResponse.json(
      { ok: false, error: 'Ese código de mesa no está activo' },
      { status: 404 }
    );
  }

  const respuesta = NextResponse.json({ ok: true, local: ctx.local, mesa: ctx.mesa });
  respuesta.cookies.set(COOKIE_MESA, serializar(ctx), {
    // Sin httpOnly: la interfaz necesita leerla para decidir qué enseñar, y no
    // contiene nada que proteger — el pedido revalida el token igualmente.
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: HORAS_MESA * 3600,
  });
  return respuesta;
}

/** Salir del modo mesa: quien escaneó y luego decidió pedir a domicilio. */
export async function DELETE() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.delete(COOKIE_MESA);
  return respuesta;
}
