// Reconstruye un pedido anterior para volver a meterlo al carrito.
//
// Exige sesion Y comprueba que el pedido sea de quien lo pide: sin lo segundo,
// conocer un id bastaria para leer la composicion del pedido de otra persona.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { COOKIE_SESION, identidadDe } from '@/lib/sesion';
import { lineasParaRepetir } from '@/lib/club';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const yo = await identidadDe(request.cookies.get(COOKIE_SESION)?.value);
  if (!yo) return NextResponse.json({ ok: false, error: 'Entra a tu cuenta primero' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('pedido');
  const v = z.string().uuid().safeParse(id);
  if (!v.success) return NextResponse.json({ ok: false, error: 'Pedido no válido' }, { status: 400 });

  const lineas = await lineasParaRepetir(v.data, yo.consumerId);
  if (lineas.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Ese pedido ya no se puede repetir' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, lineas });
}
