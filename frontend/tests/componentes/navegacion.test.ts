// =============================================================================
// El menú del CRM
// =============================================================================
//
// Existe por un fallo que estuvo desplegado: la entrada de Pedidos se escribió
// como `{ href: '/pedidos', etiqueta: 'Pedidos' }`, pero el componente pinta
// `e.texto` y `e.icono`. Ambos valían undefined, así que el menú renderizaba un
// enlace sin texto ni símbolo — un hueco en blanco entre Panel y Comensales.
//
// TypeScript no lo detectó porque el array es literal y su tipo se infiere de la
// unión de los objetos que contiene: una clave de más no es un error, y las que
// faltan quedan opcionales. La forma correcta no la puede vigilar el compilador
// aquí, así que la vigila esta prueba.
//
// Lo caro no fue el hueco: fue que la cola de cocina quedó inalcanzable desde el
// menú con pedidos pagados esperando dentro.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FUENTE = readFileSync(
  resolve(__dirname, '../../apps/web/src/components/Navegacion.tsx'),
  'utf8'
);

/** Cada `{ href: ... }` del archivo, con las claves que trae. */
function entradasDelMenu(): Array<{ crudo: string; claves: string[] }> {
  const entradas: Array<{ crudo: string; claves: string[] }> = [];
  for (const m of FUENTE.matchAll(/\{\s*href:\s*'[^']+'[^}]*\}/g)) {
    const crudo = m[0];
    const claves = [...crudo.matchAll(/(\w+):/g)].map((c) => c[1]);
    entradas.push({ crudo, claves });
  }
  return entradas;
}

describe('menú del CRM', () => {
  const entradas = entradasDelMenu();

  it('encuentra las entradas del menú', () => {
    expect(entradas.length).toBeGreaterThanOrEqual(12);
  });

  it('todas tienen href, texto e icono', () => {
    for (const e of entradas) {
      // El mensaje incluye la entrada entera: al fallar, lo que se quiere ver es
      // cuál se escribió mal, no que "una" está mal.
      expect(e.claves, e.crudo).toContain('texto');
      expect(e.claves, e.crudo).toContain('icono');
    }
  });

  it('ninguna usa claves que el componente no pinta', () => {
    // `etiqueta` fue la que causó el fallo. Cualquier clave desconocida es el
    // mismo error con otro nombre: se escribe, compila, y no se pinta.
    const permitidas = new Set(['href', 'texto', 'icono']);
    for (const e of entradas) {
      const sobran = e.claves.filter((c) => !permitidas.has(c));
      expect(sobran, `${e.crudo} usa claves que nadie lee`).toEqual([]);
    }
  });

  it('Pedidos está en el menú', () => {
    // La cola de cocina: si se vuelve a caer del menú, entran pedidos pagados
    // que nadie ve.
    const pedidos = entradas.find((e) => e.crudo.includes("'/pedidos'"));
    expect(pedidos, 'no hay entrada para /pedidos').toBeDefined();
    expect(pedidos!.crudo).toContain('texto');
    expect(pedidos!.crudo).toContain('icono');
  });

  it('el componente sigue leyendo texto e icono', () => {
    // Si alguien renombra las props al pintar, las pruebas de arriba pasarían
    // vigilando el nombre viejo.
    expect(FUENTE).toContain('{e.icono}');
    expect(FUENTE).toContain('{e.texto}');
  });

  it('no hay dos entradas con el mismo href', () => {
    const hrefs = entradas.map((e) => e.crudo.match(/href:\s*'([^']+)'/)![1]);
    expect(new Set(hrefs).size, `hrefs repetidos en ${hrefs.join(', ')}`).toBe(hrefs.length);
  });
});
