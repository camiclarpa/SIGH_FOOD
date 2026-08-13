/**
 * tests/config/middleware-convencion.test.ts
 *
 * Impide que se vuelva a migrar `middleware.ts` al convenio `proxy` de Next 16.
 *
 * Next 16 marca `middleware` como deprecado y sugiere `proxy`, y seguir ese
 * aviso parece lo correcto — pero rompe el despliegue a Cloudflare:
 *
 *   · OpenNext solo admite middleware en Edge Runtime.
 *   · El convenio `proxy` es Node.js only; Next rechaza incluso declararle
 *     `runtime: 'edge'` ("Proxy does not support Edge runtime").
 *
 * Resultado: `opennextjs-cloudflare build` muere con "Node.js middleware is not
 * currently supported" y el Worker no se publica. Fue exactamente lo que dejó a
 * sigh-bocazo con "Latest build failed" en el panel de Cloudflare.
 *
 * Cuando OpenNext soporte el convenio `proxy`, bórrense estos tests y hágase la
 * migración; hasta entonces, el aviso de deprecación es el mal menor.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// process.cwd() y no import.meta.url: bajo el entorno jsdom de Vitest
// import.meta.url no es una URL file:// y fileURLToPath lanza, lo que hacía que
// la suite entera no se cargara y el fallo pasara desapercibido.
const RAIZ = process.cwd();

const PROYECTOS = [
  { nombre: 'landing (sigh-bocazo)', dir: path.join(RAIZ, 'src') },
  { nombre: 'CRM (sighfood-crm)', dir: path.join(RAIZ, 'apps', 'web', 'src') },
];

describe.each(PROYECTOS)('$nombre', ({ dir }) => {
  it('usa middleware.ts, no proxy.ts', () => {
    expect(
      existsSync(path.join(dir, "middleware.ts")),
      'falta middleware.ts: si se renombró a proxy.ts, el build de Cloudflare fallará'
    ).toBe(true);

    expect(
      existsSync(path.join(dir, "proxy.ts")),
      'existe proxy.ts: OpenNext no lo soporta, hay que volver a middleware.ts'
    ).toBe(false);
  });

  it('exporta la función con el nombre que Next espera para middleware', () => {
    const contenido = readFileSync(path.join(dir, "middleware.ts"), 'utf8');
    expect(contenido).toMatch(/export (async )?function middleware\s*\(/);
  });

  it('no declara runtime en el config (middleware ya es Edge por defecto)', () => {
    const contenido = readFileSync(path.join(dir, "middleware.ts"), 'utf8');
    // Declarar runtime aquí es el síntoma de haber intentado la migración a proxy.
    expect(contenido).not.toMatch(/^\s*runtime:\s*['"]/m);
  });
});
