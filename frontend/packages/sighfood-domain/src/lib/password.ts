// =============================================================================
// SIGH_FOOD - Hashing de contraseñas
// =============================================================================
//
// Usa PBKDF2 sobre la Web Crypto API, no bcrypt/argon2: esas librerías son
// binarios nativos y no se ejecutan en Cloudflare Workers, que es donde vive
// este CRM en producción. Web Crypto está disponible tanto en Workers como en
// Node 18+, así que el mismo código sirve en local y en el edge.

/**
 * Cloudflare Workers rechaza más de 100.000 iteraciones en PBKDF2:
 *
 *   NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not
 *   supported (requested 210000)
 *
 * OWASP recomienda 210.000 para PBKDF2-SHA256 y ese era el valor original, que
 * funcionaba en Node y hacía fallar todo login en producción. 100.000 es el
 * techo de la plataforma, no una elección: si algún día se necesita más margen,
 * la vía es cambiar de algoritmo (scrypt/argon2 vía WASM), no subir este número.
 */
const ITERACIONES = 100_000;
const LONGITUD_SAL = 16;
const LONGITUD_CLAVE = 32;

function aHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function desdeHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derivar(password: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: iteraciones, hash: 'SHA-256' },
    material,
    LONGITUD_CLAVE * 8
  );
  return new Uint8Array(bits);
}

/**
 * Genera el hash de una contraseña.
 * @returns cadena `iteraciones:salHex:hashHex`, lista para guardar en la BD.
 */
export async function hashearPassword(password: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(LONGITUD_SAL));
  const hash = await derivar(password, sal, ITERACIONES);
  return `${ITERACIONES}:${aHex(sal)}:${aHex(hash)}`;
}

/**
 * Comprueba una contraseña contra su hash almacenado.
 *
 * La comparación es en tiempo constante: salir antes al primer byte distinto
 * filtraría, por diferencia de tiempos, cuánto prefijo se acertó.
 */
export async function verificarPassword(password: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split(':');
  if (partes.length !== 3) return false;

  const iteraciones = Number.parseInt(partes[0], 10);
  if (!Number.isFinite(iteraciones) || iteraciones <= 0) return false;

  const sal = desdeHex(partes[1]);
  const esperado = desdeHex(partes[2]);
  const calculado = await derivar(password, sal, iteraciones);

  if (calculado.length !== esperado.length) return false;

  let diferencia = 0;
  for (let i = 0; i < calculado.length; i++) {
    diferencia |= calculado[i] ^ esperado[i];
  }
  return diferencia === 0;
}
