/**
 * tests/config/build-config.test.ts
 *
 * Blindaje del fallo de build que costó varias sesiones localizar.
 *
 * La caché persistente de webpack en .next/cache se corrompe en este proyecto:
 * al reutilizarla, un módulo llega al hasher como `undefined` y el build muere
 * antes de compilar. Se manifestaba de dos formas según el algoritmo de hash
 * —"WasmHash._updateWithBuffer" con xxhash64, "ERR_INVALID_ARG_TYPE" con
 * sha256— lo que despistó el diagnóstico: parecían dos bugs distintos y era el
 * mismo. Cambiar el hash solo cambiaba el mensaje.
 *
 * Si alguien reactiva la caché buscando builds más rápidos, el fallo vuelve de
 * forma intermitente y difícil de atribuir. Estos tests lo impiden.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// next.config.js es CommonJS; createRequire permite cargarlo desde este módulo ESM.
const requerir = createRequire(import.meta.url);
const nextConfig = requerir('../../next.config.js');

describe('next.config.js — estabilidad del build', () => {
  it('define una función webpack', () => {
    expect(typeof nextConfig.webpack).toBe('function');
  });

  it('desactiva la caché persistente de webpack', () => {
    const config = nextConfig.webpack({ cache: { type: 'filesystem' }, output: {} });

    expect(config.cache).toBe(false);
  });

  it('declara config de turbopack para que `next dev` no choque con webpack', () => {
    // Sin esto, `next dev` aborta con:
    //   "This build is using Turbopack, with a `webpack` config and no
    //    `turbopack` config."
    expect(nextConfig.turbopack).toBeDefined();
  });
});

describe('next.config.js — cabeceras de caché', () => {
  it('nunca cachea las rutas de API', async () => {
    const headers = await nextConfig.headers();
    const api = headers.find((h: { source: string }) => h.source.startsWith('/api/'));

    expect(api, 'debe existir una regla específica para /api/').toBeDefined();

    const cacheControl = api.headers.find(
      (h: { key: string }) => h.key.toLowerCase() === 'cache-control'
    );
    expect(cacheControl.value).toContain('no-store');
    // `public` permitiría a un CDN guardar la respuesta de un usuario y
    // servírsela a otro.
    expect(cacheControl.value).not.toContain('public');
  });

  it('no marca las páginas HTML como immutable', async () => {
    const headers = await nextConfig.headers();

    for (const regla of headers) {
      const cc = regla.headers.find(
        (h: { key: string }) => h.key.toLowerCase() === 'cache-control'
      );
      if (!cc) continue;
      // Solo los assets con hash en el nombre pueden ser inmutables: en una
      // página HTML significa que un cambio de precio no llega nunca a quien
      // ya la visitó.
      if (cc.value.includes('immutable')) {
        expect(regla.source).toMatch(/assets|_next/);
      }
    }
  });

  it('aplica las cabeceras de seguridad a todas las rutas', async () => {
    const headers = await nextConfig.headers();
    const claves = headers
      .filter((h: { source: string }) => h.source === '/:path*')
      .flatMap((h: { headers: { key: string }[] }) => h.headers.map((x) => x.key));

    expect(claves).toContain('X-Content-Type-Options');
    expect(claves).toContain('X-Frame-Options');
  });
});
