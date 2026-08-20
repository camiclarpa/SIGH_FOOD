/**
 * tests/config/escalado-ia.test.ts
 *
 * Guarda los cuatro arreglos que permiten a la capa de IA llegar a 1000
 * clientes. Los cuatro comparten una propiedad incómoda: funcionan igual de
 * bien con 45 cuentas que estando rotos, así que una regresión no se nota hasta
 * que el volumen ya es real.
 *
 *   1. Embeddings aleatorios. `Math.random()` producía un índice lleno de ruido
 *      con aspecto de datos; la búsqueda respondía sin sentido y sin avisar.
 *   2. Sin índice vectorial, cada búsqueda por similitud recorre la tabla.
 *   3. Consultas dentro de bucles: N nodos = 2N+1 viajes a la base por petición.
 *   4. Rate limiting en memoria: cada isolate con su contador, así que el límite
 *      real era el configurado por el número de isolates.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const WEB = path.join(RAIZ, 'apps', 'web', 'src');
const ARQUITECTURAS = path.join(WEB, 'lib', 'ai', 'architectures');

function archivosTs(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada);
    if (statSync(completo).isDirectory()) salida.push(...archivosTs(completo));
    else if (entrada.endsWith('.ts')) salida.push(completo);
  }
  return salida;
}

function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('1. embeddings reales', () => {
  it('el motor no fabrica vectores aleatorios', () => {
    const texto = sinComentarios(readFileSync(path.join(ARQUITECTURAS, 'embedding-engine.ts'), 'utf8'));
    expect(
      /Math\.random/.test(texto),
      'un embedding aleatorio llena el índice de ruido: la búsqueda responde sin sentido y nada lo delata'
    ).toBe(false);
  });

  it('el servicio de embeddings falla en vez de inventarse un vector', () => {
    const ruta = path.join(WEB, 'lib', 'ai', 'services', 'embeddings-service.ts');
    const texto = readFileSync(ruta, 'utf8');
    expect(/Math\.random/.test(sinComentarios(texto))).toBe(false);
    // Sin proveedor debe lanzar: un índice vacío se detecta, uno con ruido no.
    expect(texto).toMatch(/throw new Error\(\s*\n?\s*['"`]No hay proveedor de embeddings/);
  });

  it('la dimensión declarada coincide con la de las columnas vector del esquema', () => {
    const servicio = readFileSync(path.join(WEB, 'lib', 'ai', 'services', 'embeddings-service.ts'), 'utf8');
    const declarada = Number(servicio.match(/DIMENSIONES\s*=\s*(\d+)/)?.[1]);

    const esquema = readFileSync(
      path.join(RAIZ, 'packages', 'sighfood-domain', 'src', 'db', 'schema.ts'),
      'utf8'
    );
    const dimensiones = [...esquema.matchAll(/vector\('[^']+',\s*\{\s*dimensions:\s*(\d+)/g)].map((m) => Number(m[1]));

    expect(dimensiones.length).toBeGreaterThan(0);
    for (const d of dimensiones) {
      expect(d, `columna vector(${d}) frente a DIMENSIONES=${declarada}`).toBe(declarada);
    }
  });
});

describe('2. índices vectoriales', () => {
  it('existe la migración que los crea con HNSW y distancia coseno', () => {
    const sql = readFileSync(
      path.join(RAIZ, 'packages', 'sighfood-domain', 'drizzle', '0002_indices_vectoriales.sql'),
      'utf8'
    );
    expect(sql).toMatch(/USING hnsw \(embedding vector_cosine_ops\)/);
    // La clase de operador debe casar con el operador de la consulta (<=>).
    // Con otra clase el índice existe pero Postgres no lo usa, y la búsqueda
    // vuelve al recorrido secuencial sin dar ningún aviso.
    expect(sql).not.toMatch(/vector_l2_ops|vector_ip_ops/);
  });
});

describe('3. sin consultas dentro de bucles', () => {
  const patrones = [
    /for\s*\([^)]*\)\s*\{[^}]*await\s+(?:db|tx)\s*\n?\s*\./s,
    /\.forEach\s*\(\s*async[^)]*\)\s*=>\s*\{[^}]*await\s+(?:db|tx)\s*\./s,
  ];

  it.each(archivosTs(ARQUITECTURAS).map((f) => [path.basename(f), f]))(
    '%s no consulta la base dentro de un bucle',
    (_nombre, ruta) => {
      const texto = sinComentarios(readFileSync(ruta, 'utf8'));
      for (const p of patrones) {
        expect(
          p.test(texto),
          'una consulta por elemento convierte N filas en N viajes a la base dentro de una sola petición'
        ).toBe(false);
      }
    }
  );
});

describe('4. rate limiting global', () => {
  const middleware = readFileSync(path.join(WEB, 'middleware.ts'), 'utf8');

  it('el middleware usa el binding de Cloudflare', () => {
    expect(middleware).toMatch(/LIMITADOR_PUBLICO/);
    expect(middleware).toMatch(/\.limit\(\s*\{\s*key:/);
  });

  it('el contador en memoria ya no es el camino principal', () => {
    // Sigue existiendo como respaldo local, pero la ruta pública debe pasar por
    // dentroDelLimite(), que consulta el binding primero.
    expect(middleware).toMatch(/await dentroDelLimite\(/);
  });

  it('el binding está declarado en wrangler.jsonc con un period admitido', () => {
    const wrangler = readFileSync(path.join(RAIZ, 'apps', 'web', 'wrangler.jsonc'), 'utf8');
    expect(wrangler).toMatch(/"ratelimits"/);
    expect(wrangler).toMatch(/"name":\s*"LIMITADOR_PUBLICO"/);

    // El esquema de wrangler solo acepta 10 o 60 segundos; cualquier otro valor
    // hace fallar el despliegue, no el build.
    const period = Number(wrangler.match(/"period":\s*(\d+)/)?.[1]);
    expect([10, 60]).toContain(period);
  });
});
