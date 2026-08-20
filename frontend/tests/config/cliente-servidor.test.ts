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

/** Módulos que solo pueden vivir en el servidor, y por qué. */
const SOLO_SERVIDOR: Record<string, string> = {
  '@/auth': 'arrastra postgres.js',
  '@/lib/permisos': 'importa @/auth, que arrastra postgres.js — usa @/lib/roles',
  '@/lib/cloudflare': 'abre la conexión a la base',
  '@/lib/consultas': 'consulta la base',
  '@/lib/consultas-b2c': 'consulta la base',
  '@/lib/configuracion': 'consulta la base',
  '@sighfood/domain/db': 'es el cliente de Postgres',
};

describe("componentes 'use client'", () => {
  const clientes = todos.filter((f) => {
    const contenido = readFileSync(f, 'utf8');
    // La directiva tiene que ser lo primero del archivo para contar.
    return /^\s*['"]use client['"]/.test(contenido);
  });

  it('hay componentes cliente que comprobar', () => {
    expect(clientes.length).toBeGreaterThan(0);
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
