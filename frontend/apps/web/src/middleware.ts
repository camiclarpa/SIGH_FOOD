// =============================================================================
// SIGH_FOOD - Proteccion de rutas del CRM (middleware de Next)
// =============================================================================
//
// Regla: /api/* está cerrado por defecto. Abrir una ruta al público exige
// añadirla a RUTAS_PUBLICAS de forma deliberada, no olvidarse de protegerla.
// Antes ocurría lo contrario —todo abierto— y bastaba conocer la URL para
// leer métricas de negocio o alterar el inventario en consignación.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Se instancia con la configuración edge-safe, NO con la de `@/auth`: esa
// arrastra postgres.js y @opennextjs/cloudflare al bundle del middleware y
// Next falla al cargarlo con "adapterFn is not a function", devolviendo 500
// en todas las rutas de la aplicación.
const { auth } = NextAuth(authConfig);

/**
 * Rutas accesibles sin sesión, y por qué:
 *
 *   /api/auth/*        el propio flujo de login; cerrarlo impediría entrar.
 *   /api/leads/b2b     lo invoca el formulario de la landing pública.
 *   /api/moments/scan  lo invoca el comensal al escanear el QR de la mesa.
 *
 * Ambas rutas de negocio son de ESCRITURA y validan su entrada con Zod, pero
 * al ser públicas necesitan rate limiting (ver limitarPeticiones más abajo).
 */
const RUTAS_PUBLICAS = [
  '/api/auth',
  '/api/leads/b2b',
  '/api/moments/scan',
  // Público a propósito: comprobar la salud a través de la sesión no sirve
  // cuando lo roto ES la sesión. Fue el caso real —el Worker sin AUTH_SECRET— y
  // por eso este endpoint no puede depender de poder autenticarse.
  '/api/health',
];

/** Rutas de página que no requieren sesión. */
const PAGINAS_PUBLICAS = ['/', '/b2b', '/login'];

// -----------------------------------------------------------------------------
// Rate limiting
// -----------------------------------------------------------------------------
//
// El límite lo cuenta Cloudflare en el borde, mediante el binding declarado en
// wrangler.jsonc (`ratelimits`). Antes era un Map en memoria, y como cada
// isolate tiene el suyo, el límite efectivo era el configurado MULTIPLICADO por
// el número de isolates activos: con tráfico repartido, un atacante obtenía
// varias veces las 20 peticiones por minuto que decía permitir.
//
// El contador en memoria se conserva SOLO como respaldo para `next dev` y los
// tests, donde el binding no existe. En Workers nunca se usa.

const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 20;

const CONTADORES = new Map<string, { total: number; reinicioEn: number }>();

/** Contador local. No sirve en producción: no se comparte entre isolates. */
function limitarEnMemoria(ip: string): boolean {
  const ahora = Date.now();
  const actual = CONTADORES.get(ip);

  if (!actual || ahora > actual.reinicioEn) {
    CONTADORES.set(ip, { total: 1, reinicioEn: ahora + VENTANA_MS });
    return true;
  }

  actual.total += 1;
  if (actual.total > MAX_POR_VENTANA) return false;

  // Evita que el mapa crezca sin límite en procesos de vida larga
  if (CONTADORES.size > 10_000) {
    for (const [clave, valor] of CONTADORES) {
      if (ahora > valor.reinicioEn) CONTADORES.delete(clave);
    }
  }
  return true;
}

/** Forma del binding de rate limiting de Workers. */
interface Limitador {
  limit(opciones: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Comprueba el límite para una IP.
 *
 * Usa el binding si está disponible y cae al contador local si no. El acceso al
 * entorno va dentro de un try: en `next dev` no hay contexto de Cloudflare y
 * `getCloudflareContext` lanza, que es justo el caso del respaldo.
 */
async function dentroDelLimite(ip: string): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const limitador = (env as unknown as { LIMITADOR_PUBLICO?: Limitador }).LIMITADOR_PUBLICO;

    if (limitador) {
      const { success } = await limitador.limit({ key: ip });
      return success;
    }
  } catch {
    // Sin contexto de Cloudflare: se sigue con el contador local.
  }

  return limitarEnMemoria(ip);
}

function esPublica(pathname: string): boolean {
  return RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Rutas públicas de API: sin sesión, pero con límite de peticiones ---
  if (esPublica(pathname)) {
    // Sin límite: /api/auth es el propio login, y /api/health debe responder
    // durante un incidente. Un endpoint de salud al que se puede acallar con
    // un 429 no sirve justo cuando hace falta, y su coste es un `SELECT 1`.
    if (pathname.startsWith('/api/auth') || pathname === '/api/health') {
      return NextResponse.next();
    }

    const ip =
      request.headers.get('cf-connecting-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      'desconocida';

    if (!(await dentroDelLimite(ip))) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas peticiones. Inténtalo en un minuto.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
    return NextResponse.next();
  }

  // --- Resto de /api/*: exige sesión ---
  if (pathname.startsWith('/api/')) {
    const sesion = await auth();
    if (!sesion?.user) {
      return NextResponse.json(
        { success: false, error: 'No autenticado', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // --- Páginas del CRM: redirigir al login ---
  if (!PAGINAS_PUBLICAS.includes(pathname)) {
    const sesion = await auth();
    if (!sesion?.user) {
      const login = new URL('/login', request.url);
      login.searchParams.set('redirect', pathname);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Este archivo NO debe migrarse al convenio `proxy` de Next 16, aunque Next
  // avise de que `middleware` está deprecado: OpenNext para Cloudflare solo
  // admite middleware en Edge Runtime, y `proxy` es Node.js only —Next rechaza
  // incluso declararle `runtime: 'edge'`—. Con proxy.ts el build del Worker
  // muere con "Node.js middleware is not currently supported".
  //
  // Todo lo que hay aquí es compatible con Edge: la sesión se valida leyendo el
  // JWT, sin tocar la base de datos, gracias a la config partida de auth.config.ts.
  matcher: [
    // Todo salvo estáticos de Next y el favicon
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
