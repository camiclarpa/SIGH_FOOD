/**
 * tests/config/cliente-servidor.test.ts
 *
 * Impide dos errores que solo aparecen al construir el Worker, nunca en
 * `tsc` ni en los tests, y cuyo mensaje señala el sitio equivocado.
 *
 * 1. Un componente 'use client' que importa un módulo del servidor arrastra
 *    postgres.js entero al bundle del navegador. El build falla listando la
 *    cadena de imports, y el archivo culpable es el del medio, no el que
 *    encabeza la lista.
 *
 * 2. En un archivo 'use server', TODO lo exportado debe ser una función async.
 *    Una constante o un ayudante síncrono rompen el build con "Server Actions
 *    must be async functions", y el error apunta a la línea del export, no a la
 *    directiva que lo obliga.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const WEB = path.join(RAIZ, 'apps', 'web', 'src');

function archivos(dir: string, extensiones: string[]): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada);
    if (statSync(completo).isDirectory()) salida.push(...archivos(completo, extensiones));
    else if (extensiones.some((e) => entrada.endsWith(e))) salida.push(completo);
  }
  return salida;
}

const todos = archivos(WEB, ['.ts', '.tsx']);
const relativo = (f: string) => path.relative(RAIZ, f);

/**
 * Raíces que arrastran la base de datos por sí solas.
 *
 * A partir de aquí la lista se DEDUCE: cualquier módulo de @/lib que importe
 * una de estas —o algo que las importe— queda marcado también.
 *
 * Antes esta lista se escribía a mano, y por eso se coló @/lib/cocina: nadie se
 * acordó de añadirlo, el guard pasó, y el fallo apareció al compilar el Worker
 * con un "Module not found" que señalaba al componente, no al módulo del medio.
 */
const RAICES: Record<string, string> = {
  '@/auth': 'arrastra postgres.js',
  '@/lib/cloudflare': 'abre la conexión a la base',
  '@sighfood/domain/db': 'es el cliente de Postgres',
  '@sighfood/domain/db/schema': 'define las tablas y trae drizzle',
};

/** Importaciones de valor de un archivo. `import type` se borra al compilar. */
function importaciones(contenido: string): string[] {
  return [...contenido.matchAll(/^import\s+(?!type\s)[^;]*?from\s+['"]([^'"]+)['"]/gm)].map(
    (m) => m[1]
  );
}


/**
 * Cierre transitivo: qué módulos acaban trayendo la base.
 *
 * Se recorre hasta que deja de crecer, así que da igual cuántos saltos haya
 * entre el componente y postgres.
 */
function calcularSoloServidor(): Record<string, string> {
  const marcados: Record<string, string> = { ...RAICES };

  let cambio = true;
  while (cambio) {
    cambio = false;

    for (const archivo of todos) {
      const contenido = readFileSync(archivo, 'utf8');
      // Un componente de cliente nunca es "solo servidor": es justo lo que se
      // está comprobando que no importe cosas del servidor.
      if (/^\s*['"]use client['"]/.test(contenido)) continue;

      // Un archivo 'use server' TAMPOCO cuenta, aunque toque la base. Es
      // exactamente lo contrario: una Server Action está hecha para importarse
      // desde el cliente. Next sustituye la implementación por una referencia
      // de red, así que postgres nunca cruza. Sin esta excepción el guard
      // marcaría como error el patrón que la aplicación entera usa.
      if (/^\s*['"]use server['"]/.test(contenido)) continue;

      // En Windows path.relative devuelve barras invertidas; los imports usan
      // barras normales.
      const rel = path.relative(WEB, archivo).split(path.sep).join('/').replace(/\.tsx?$/, '');
      const nombre = `@/${rel}`;
      if (marcados[nombre]) continue;

      const culpable = importaciones(contenido).find((m) => marcados[m]);
      if (culpable) {
        marcados[nombre] = `importa ${culpable}, que ${marcados[culpable]}`;
        cambio = true;
      }
    }
  }

  return marcados;
}

const SOLO_SERVIDOR = calcularSoloServidor();

describe("componentes 'use client'", () => {
  const clientes = todos.filter((f) => {
    const contenido = readFileSync(f, 'utf8');
    // La directiva tiene que ser lo primero del archivo para contar.
    return /^\s*['"]use client['"]/.test(contenido);
  });

  it('hay componentes cliente que comprobar', () => {
    expect(clientes.length).toBeGreaterThan(0);
  });

  it('la lista de módulos de servidor se deduce, no se escribe a mano', () => {
    // Si esto baja al número de raíces, el cierre transitivo dejó de funcionar
    // y el guard volvería a depender de que alguien se acuerde de la lista.
    expect(Object.keys(SOLO_SERVIDOR).length).toBeGreaterThan(Object.keys(RAICES).length);
  });

  it.each(clientes.map((f) => [path.basename(f), f]))(
    '%s no importa módulos de servidor',
    (_nombre, ruta) => {
      const contenido = readFileSync(ruta, 'utf8');
      const culpables: string[] = [];

      for (const [modulo, porque] of Object.entries(SOLO_SERVIDOR)) {
        // Solo importaciones de valor: `import type` se borra al compilar y no
        // llega al bundle.
        const patron = new RegExp(`^import\\s+(?!type\\s)[^;]*from\\s+['"]${modulo.replace(/[/@]/g, '\\$&')}['"]`, 'm');
        if (patron.test(contenido)) culpables.push(`${modulo} (${porque})`);
      }

      expect(culpables, `${relativo(ruta)} importa: ${culpables.join(', ')}`).toEqual([]);
    }
  );
});

describe("archivos 'use server'", () => {
  const servidores = todos.filter((f) => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf8')));

  it('hay Server Actions que comprobar', () => {
    expect(servidores.length).toBeGreaterThan(0);
  });

  it.each(servidores.map((f) => [path.basename(f), f]))(
    '%s solo exporta funciones async',
    (_nombre, ruta) => {
      const contenido = readFileSync(ruta, 'utf8');
      const malos: string[] = [];

      for (const linea of contenido.split('\n')) {
        if (!linea.startsWith('export ')) continue;

        // Los tipos se borran al compilar: no llegan al runtime.
        if (/^export\s+(type|interface)\s/.test(linea)) continue;
        // Re-exportar tipos tampoco cuenta.
        if (/^export\s+type\s*\{/.test(linea)) continue;

        if (!/^export\s+async\s+function\s/.test(linea)) {
          malos.push(linea.trim().slice(0, 70));
        }
      }

      expect(
        malos,
        `${relativo(ruta)} exporta algo que no es una función async: ${malos.join(' | ')}`
      ).toEqual([]);
    }
  );
});
