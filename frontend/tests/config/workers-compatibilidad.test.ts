/**
 * tests/config/workers-compatibilidad.test.ts
 *
 * Impide reintroducir los dos patrones que funcionan en local y fallan en
 * Cloudflare Workers.
 *
 * 1. `getDb()` en rutas y servicios.
 *    getDb() sin el entorno de Cloudflare lee `process.env.DATABASE_URL` y lanza
 *    si falta. En Workers no existe, así que las 14 arquitecturas —que llamaban
 *    a getDb() en el constructor y se instanciaban a nivel de módulo— reventaban
 *    al importarse y devolvían 500 en cualquier ruta que las tocara. Además,
 *    getDb() no cierra la conexión: en Workers eso cuelga la petición hasta el
 *    timeout. La forma correcta es conBaseDeDatos().
 *
 * 2. `process.env` leído en el ámbito de módulo.
 *    En Workers las variables llegan por el binding `env`, y el ámbito global se
 *    evalúa cuando `process.env` está vacío. `const KEY = process.env.X` queda
 *    `undefined` para siempre: fue lo que dejó a DeepSeek, Gemini y Ollama sin
 *    credenciales en producción, y antes a AUTH_SECRET tumbando /api/auth/*.
 *    Debe leerse por petición con variableDeEntorno().
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const WEB = path.join(RAIZ, 'apps', 'web', 'src');

function archivosTs(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const completo = path.join(dir, entrada);
    if (statSync(completo).isDirectory()) salida.push(...archivosTs(completo));
    else if (entrada.endsWith('.ts') || entrada.endsWith('.tsx')) salida.push(completo);
  }
  return salida;
}

/** Quita comentarios para no dar falsos positivos con las notas explicativas. */
function sinComentarios(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('compatibilidad con Cloudflare Workers', () => {
  it('ninguna ruta de API llama a getDb()', () => {
    const rutas = archivosTs(path.join(WEB, 'app', 'api')).filter((f) => f.endsWith('route.ts'));
    const culpables = rutas.filter((f) => /\bgetDb\s*\(/.test(sinComentarios(readFileSync(f, 'utf8'))));
    expect(
      culpables.map((f) => path.relative(RAIZ, f)),
      'usen conBaseDeDatos(): getDb() no cierra la conexión y en Workers cuelga la petición'
    ).toEqual([]);
  });

  it('ninguna arquitectura de IA llama a getDb()', () => {
    const dir = path.join(WEB, 'lib', 'ai');
    const culpables = archivosTs(dir).filter((f) =>
      /\bgetDb\s*\(/.test(sinComentarios(readFileSync(f, 'utf8')))
    );
    expect(
      culpables.map((f) => path.relative(RAIZ, f)),
      'usen conBaseDeDatos(): getDb() en el constructor revienta al importar el módulo en Workers'
    ).toEqual([]);
  });

  it('las arquitecturas no abren conexión al construirse', () => {
    const dir = path.join(WEB, 'lib', 'ai', 'architectures');
    const culpables = archivosTs(dir).filter((f) => {
      const texto = sinComentarios(readFileSync(f, 'utf8'));
      return /constructor\s*\([^)]*\)\s*\{[^}]*this\.db\s*=/.test(texto);
    });
    expect(
      culpables.map((f) => path.relative(RAIZ, f)),
      'la conexión debe abrirse por método, no en el constructor'
    ).toEqual([]);
  });

  it('los servicios de IA no leen process.env en el ámbito de módulo', () => {
    const dir = path.join(WEB, 'lib', 'ai', 'services');
    const culpables: string[] = [];
    for (const f of archivosTs(dir)) {
      const texto = sinComentarios(readFileSync(f, 'utf8'));
      // `const X = process.env.Y` en columna 0: se evalúa al importar.
      if (/^(const|let|var)\s+\w+[^\n=]*=\s*[^\n]*process\.env/m.test(texto)) {
        culpables.push(path.relative(RAIZ, f));
      }
    }
    expect(
      culpables,
      'usen variableDeEntorno(): en Workers process.env está vacío al importar el módulo'
    ).toEqual([]);
  });
});
