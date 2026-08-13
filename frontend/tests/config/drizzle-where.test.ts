/**
 * tests/config/drizzle-where.test.ts
 *
 * Impide que vuelva un bug que se detectó probando contra producción.
 *
 * En qr-codes el filtro estaba escrito así:
 *
 *   .where(
 *     eq(qrCodes.accountId, x) &&
 *     eq(qrCodes.tableNumber, y) &&
 *     eq(qrCodes.isActive, true)
 *   )
 *
 * Con el `&&` de JavaScript, `a && b && c` devuelve `c` porque los objetos SQL
 * de Drizzle son truthy. El WHERE quedaba reducido a `is_active = true`, así
 * que la comprobación de duplicados encontraba el QR de CUALQUIER cuenta y
 * mesa: en cuanto existía un QR activo en el sistema, ningún restaurante podía
 * crear otro y el endpoint respondía 409 siempre.
 *
 * Compila sin avisos y el tipo es válido, así que ni TypeScript ni ESLint lo
 * detectan: hace falta esta comprobación explícita.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// vitest se ejecuta desde la raíz del proyecto (frontend/), donde vive su
// configuración; import.meta.url no resuelve a file:// en este entorno.
const RAIZ = process.cwd();

function archivosTs(dir: string, acumulado: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return acumulado;
  }

  for (const entrada of entradas) {
    if (['node_modules', '.next', '.open-next', '.wrangler'].includes(entrada)) continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) archivosTs(ruta, acumulado);
    else if (ruta.endsWith('.ts') || ruta.endsWith('.tsx')) acumulado.push(ruta);
  }
  return acumulado;
}

const FUENTES = [
  join(RAIZ, 'apps', 'web', 'src'),
  join(RAIZ, 'packages', 'sighfood-domain', 'src'),
  join(RAIZ, 'src'),
].flatMap((d) => archivosTs(d));

describe('condiciones WHERE de Drizzle', () => {
  it('encuentra archivos que revisar', () => {
    expect(FUENTES.length).toBeGreaterThan(0);
  });

  it('nunca combina condiciones con && en lugar de and()', () => {
    const infractores: string[] = [];

    for (const archivo of FUENTES) {
      const contenido = readFileSync(archivo, 'utf8');
      // eq(...) / gt(...) / lt(...) seguido de && — el operador de JavaScript
      // silenciosamente descarta todas las condiciones menos la última.
      const patron = /\b(eq|ne|gt|gte|lt|lte|like|ilike|inArray)\s*\([^)]*\)\s*&&/g;
      const encontrados = contenido.match(patron);
      if (encontrados) {
        infractores.push(`${archivo.replace(RAIZ, '')}: ${encontrados[0].trim()}`);
      }
    }

    expect(infractores, 'usa and(...) de drizzle-orm para combinar condiciones').toEqual([]);
  });
});
