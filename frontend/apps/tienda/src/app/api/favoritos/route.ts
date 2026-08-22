// Favoritos: guardar y quitar. Exige sesión — son de alguien.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { COOKIE_SESION, identidadDe } from '@/lib/sesion';
import { guardarFavorito, quitarFavorito } from '@/lib/club';

export const dynamic = 'force-dynamic';

const guardar = z.object({
  slug: z.string().min(1).max(120),
  opcionIds: z.array(z.string().uuid()).max(20).default([]),
  etiqueta: z.string().max(60).optional(),
});

export async function POST(request: NextRequest) {
  const yo = await identidadDe(request.cookies.get(COOKIE_SESION)?.value);
  if (!yo) return NextResponse.json({ ok: false, error: 'Entra a tu cuenta primero' }, { status: 401 });

  const v = guardar.safeParse(await request.json().catch(() => null));
  if (!v.success) return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });

  const ok = await guardarFavorito({ consumerId: yo.consumerId, ...v.data });
  return NextResponse.json({ ok }, { status: ok ? 201 : 404 });
}

export async function DELETE(request: NextRequest) {
  const yo = await identidadDe(request.cookies.get(COOKIE_SESION)?.value);
  if (!yo) return NextResponse.json({ ok: false, error: 'Entra a tu cuenta primero' }, { status: 401 });

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Falta el favorito' }, { status: 400 });

  const ok = await quitarFavorito(yo.consumerId, id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
