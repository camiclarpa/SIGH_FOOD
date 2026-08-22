// =============================================================================
// Acceso a la cuenta: pedir código y verificarlo
// =============================================================================
//
// Público por definición: es la puerta. Lo protegen tres cosas, y ninguna es
// una contraseña:
//
//   · El límite de peticiones del borde (binding de Cloudflare).
//   · El código caduca a los diez minutos.
//   · Cinco intentos fallidos y muere.
//
// El código se manda por WhatsApp, nunca se devuelve en la respuesta. Eso es lo
// que hace que poseer el teléfono sea la prueba de identidad: si la API lo
// devolviera, cualquiera podría entrar con un número ajeno.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { COOKIE_SESION, cerrarSesion, pedirCodigo, verificarCodigo } from '@/lib/sesion';
import { enviarCodigo } from '@/lib/avisos';

export const dynamic = 'force-dynamic';

const pedir = z.object({
  accion: z.literal('pedir'),
  telefono: z.string().min(7, 'Escribe tu número').max(30),
});

const verificar = z.object({
  accion: z.literal('verificar'),
  telefono: z.string().min(7).max(30),
  codigo: z.string().length(6, 'El código son seis dígitos'),
});

const esquema = z.discriminatedUnion('accion', [pedir, verificar]);

export async function POST(request: NextRequest) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Petición ilegible' }, { status: 400 });
  }

  const v = esquema.safeParse(cuerpo);
  if (!v.success) {
    return NextResponse.json(
      { ok: false, error: v.error.issues[0]?.message ?? 'Datos incompletos' },
      { status: 400 }
    );
  }

  if (v.data.accion === 'pedir') {
    const r = await pedirCodigo(v.data.telefono);
    if (!r.ok) return NextResponse.json(r, { status: 400 });

    const enviado = await enviarCodigo(r.telefono, r.codigo);

    // La respuesta es la MISMA haya llegado o no. Decir "ese número no existe"
    // convertiría este endpoint en una forma de averiguar qué teléfonos son
    // clientes del negocio.
    return NextResponse.json({
      ok: true,
      enviado,
      // Si WhatsApp no pudo entregarlo se dice, porque si no la persona espera
      // un mensaje que no va a llegar. Pero no se revela por qué.
      aviso: enviado ? null : 'No pudimos enviarlo por WhatsApp. Escríbenos y te ayudamos.',
    });
  }

  const r = await verificarCodigo(v.data.telefono, v.data.codigo);
  if (!r.ok) return NextResponse.json(r, { status: 401 });

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(COOKIE_SESION, r.token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: r.expiraEn,
  });
  return respuesta;
}

/** Cerrar sesión: invalida el token en la base, no solo la cookie. */
export async function DELETE(request: NextRequest) {
  await cerrarSesion(request.cookies.get(COOKIE_SESION)?.value);

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.delete(COOKIE_SESION);
  return respuesta;
}
