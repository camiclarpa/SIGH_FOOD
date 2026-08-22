import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ============================================================================
 * Middleware de la tienda
 * ============================================================================
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * ---------------------------
 * Sin él, Next sube por el árbol del monorepo y empaqueta el middleware de la
 * aplicación raíz —el que protege /admin de la landing— dentro del Worker de la
 * tienda. Se comprobó en el build: la cadena "admin/login" aparecía en el chunk
 * de edge de esta app.
 *
 * Hoy sería inofensivo, porque aquel deja pasar todo lo que no empiece por
 * /admin. Pero cuesta una invocación de borde en CADA visita, y deja una trampa
 * puesta: el día que la tienda tenga una ruta /admin, quedaría protegida por la
 * lógica de cookies de OTRA aplicación, con otro secreto y otra sesión.
 *
 * Declararlo aquí, aunque sea mínimo, corta esa herencia.
 *
 * POR QUÉ NO SE MIGRA A proxy.ts
 * ------------------------------
 * El convenio `proxy` de Next 16 es solo Node.js, y OpenNext para Cloudflare
 * únicamente admite middleware en Edge Runtime. Migrarlo quita un aviso de
 * deprecación a cambio de romper el despliegue con "Node.js middleware is not
 * currently supported" — que es exactamente lo que ya dejó a la landing con el
 * build fallido en el panel de Cloudflare.
 */
export function middleware(request: NextRequest) {
  const respuesta = NextResponse.next();

  // El checkout y el seguimiento llevan datos personales: nombre, teléfono y
  // dirección. No deben quedar en ninguna caché intermedia ni filtrarse por el
  // Referer al salir hacia otro sitio.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/checkout') || pathname.startsWith('/pedido')) {
    respuesta.headers.set('Cache-Control', 'no-store, must-revalidate');
    respuesta.headers.set('Referrer-Policy', 'no-referrer');
  }

  return respuesta;
}

export const config = {
  // Solo donde hace falta. Un matcher amplio convertiría cada visita al
  // catálogo —que se sirve estático desde el borde— en una invocación de
  // función, que es justo lo que se quiere evitar.
  matcher: ['/checkout/:path*', '/pedido/:path*'],
};
