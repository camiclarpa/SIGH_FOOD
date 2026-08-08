import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy de Next.js que protege las rutas /admin
 *
 * (En Next.js 16 el convenio `middleware` se renombró a `proxy`; el
 * comportamiento es el mismo.)
 *
 * Flujo:
 * 1. Si la ruta es /admin/login → permitir acceso (para poder autenticarse)
 * 2. Si la ruta es /admin/* → verificar cookie de sesión
 * 3. Si la cookie es válida → permitir acceso
 * 4. Si la cookie no existe o es inválida → redirigir a /admin/login
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo proteger rutas que empiecen con /admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Permitir acceso a la página de login
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Verificar la cookie de sesión
  const cookieName = process.env.ADMIN_COOKIE_NAME || 'sighfood_admin_session';
  const sessionCookie = request.cookies.get(cookieName);

  // Si no hay cookie o el valor no coincide con el token esperado
  if (!sessionCookie || sessionCookie.value !== process.env.ADMIN_TOKEN) {
    // Redirigir al login, conservando la URL original para volver después
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);

    const response = NextResponse.redirect(loginUrl);
    return response;
  }

  // Cookie válida → permitir acceso
  return NextResponse.next();
}

// Configurar qué rutas ejecutan el proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
