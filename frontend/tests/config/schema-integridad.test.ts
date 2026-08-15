/**
 * tests/config/schema-integridad.test.ts
 *
 * Impide que schema.ts vuelva a acumular declaraciones duplicadas.
 *
 * El archivo llegó a tener 76 bloques repetidos —32 tablas y 13 enums, cada uno
 * declarado dos veces— porque las tablas nuevas se fueron pegando al final sin
 * comprobar si ya existían. TypeScript lo rechazaba con 383 errores
 * (TS2451 "Cannot redeclare block-scoped variable", TS2300 "Duplicate
 * identifier") y el proyecto entero dejó de compilar.
 *
 * Un `tsc` los detecta, sí, pero entre 383 errores encadenados la causa real no
 * se distingue. Estos tests la señalan directamente.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const RUTA = path.join(process.cwd(), 'packages', 'sighfood-domain', 'src', 'db', 'schema.ts');
const contenido = readFileSync(RUTA, 'utf8');

function repetidos(nombres: string[]): string[] {
  const cuenta = new Map<string, number>();
  for (const n of nombres) cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
  return [...cuenta.entries()].filter(([, n]) => n > 1).map(([nombre]) => nombre);
}

function capturar(patron: RegExp): string[] {
  return [...contenido.matchAll(patron)].map((m) => m[1]);
}

describe('schema.ts', () => {
  it('no declara la misma tabla dos veces', () => {
    const dup = repetidos(capturar(/^export const (\w+) = pgTable\(/gm));
    expect(dup, `tablas declaradas más de una vez: ${dup.join(', ')}`).toEqual([]);
  });

  it('no repite el nombre SQL de ninguna tabla', () => {
    const dup = repetidos(capturar(/^export const \w+ = pgTable\('([^']+)'/gm));
    expect(dup, `nombres de tabla repetidos: ${dup.join(', ')}`).toEqual([]);
  });

  it('no declara el mismo enum dos veces', () => {
    const dup = repetidos(capturar(/^export const (\w+) = pgEnum\(/gm));
    expect(dup, `enums declarados más de una vez: ${dup.join(', ')}`).toEqual([]);
  });

  it('no repite ningún `export type`', () => {
    const dup = repetidos(capturar(/^export type (\w+)\s*=/gm));
    expect(dup, `tipos exportados más de una vez: ${dup.join(', ')}`).toEqual([]);
  });

  it('declara todos los pgEnum antes del primer pgTable', () => {
    // Varias tablas referenciaban enums declarados más abajo (TS2448
    // "used before its declaration"). En tiempo de ejecución eso es un
    // ReferenceError, no un aviso.
    const primeraTabla = contenido.search(/^export const \w+ = pgTable\(/m);
    const ultimoEnum = contenido.lastIndexOf('\nexport const ');
    const enums = [...contenido.matchAll(/^export const \w+ = pgEnum\(/gm)];
    const tardios = enums.filter((m) => m.index! > primeraTabla);
    expect(
      tardios.length,
      `${tardios.length} enums declarados después de la primera tabla; súbanlos al bloque ENUMS`
    ).toBe(0);
    expect(ultimoEnum).toBeGreaterThan(-1);
  });

  it('no contiene restos de corrupción de codificación (mojibake)', () => {
    // El archivo se guardó una vez como cp1252 leído en utf8 y los acentos
    // acabaron como "DefiniciÃƒÂ³n". En comentarios es feo; si llega a un
    // literal, viaja hasta la respuesta de la API.
    expect(contenido).not.toMatch(/Ã[ƒ‚¢]/);
  });
});
