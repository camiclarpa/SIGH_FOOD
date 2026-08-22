// =============================================================================
// Entrada del QR de la mesa
// =============================================================================
//
// Es a donde apunta el adhesivo: /mesa?qr=TOKEN.
//
// POR QUE UN ROUTE HANDLER Y NO LA PORTADA
// ----------------------------------------
// En Next, un componente de servidor NO puede escribir cookies: solo pueden
// hacerlo los route handlers y las server actions. Intentarlo desde la portada
// devolvia 500 — y solo con un token VALIDO, porque con uno invalido no se
// llegaba a escribir nada. Un fallo que aparece unicamente en el camino bueno
// es de los peores: se descubre con un cliente delante.
//
// Tampoco va en el middleware: los matchers no ven la cadena de consulta, asi
// que habria que hacerlo correr en '/' y eso convertiria cada visita al
// catalogo —que se sirve del borde— en una invocacion de funcion.
//
// Se redirige SIEMPRE, valga el token o no. Dejarlo en la barra de direcciones
// solo sirve para que alguien comparta el enlace y el que lo reciba acabe
// pidiendo a una mesa que no es la suya.

import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_MESA, HORAS_MESA, resolverQr, serializar } from '@/lib/mesa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('qr');
  const destino = new URL('/', request.url);

  if (!token) return NextResponse.redirect(destino);

  const ctx = await resolverQr(token);

  // Token desconocido o QR desactivado: se lleva al catalogo normal, sin
  // contexto. Desactivar un QR es la forma de retirar un adhesivo sin ir a
  // despegarlo, y a partir de ahi tiene que comportarse como un enlace normal.
  if (!ctx) return NextResponse.redirect(destino);

  const respuesta = NextResponse.redirect(destino);
  respuesta.cookies.set(COOKIE_MESA, serializar(ctx), {
    // Sin httpOnly: la interfaz la lee para saber que ensenar, y no contiene
    // nada que proteger — el pedido revalida el token contra la base igual.
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: HORAS_MESA * 3600,
  });
  return respuesta;
}
