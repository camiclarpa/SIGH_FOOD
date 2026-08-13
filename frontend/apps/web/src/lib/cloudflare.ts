// =============================================================================
// SIGH_FOOD - Acceso a la base de datos desde las rutas
// =============================================================================

import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  conDb,
  getDb,
  type CloudflareEnv,
  type ContextoWorker,
  type Database,
} from '@sighfood/domain/db';

/**
 * Entorno y contexto de Workers, o vacío si no estamos en Cloudflare.
 *
 * Se resuelve aparte del trabajo a propósito: si el try envolviera también la
 * consulta, un error de base de datos se confundiría con "no estamos en
 * Workers" y acabaría reintentándose contra la conexión equivocada.
 */
async function contextoCloudflare(): Promise<{
  env?: CloudflareEnv;
  ctx?: ContextoWorker;
}> {
  try {
    const { env, ctx } = await getCloudflareContext({ async: true });
    return { env: env as CloudflareEnv, ctx: ctx as unknown as ContextoWorker };
  } catch {
    return {};
  }
}

/**
 * Ejecuta `trabajo` con una conexión válida, cerrándola si estamos en Workers.
 *
 * Toda ruta que toque la base debe usar esto en lugar de getDb(): en Cloudflare
 * la conexión se abre por petición y hay que cerrarla cuando el trabajo acaba.
 * Sin ese cierre la petición se cuelga hasta el timeout; reutilizando el
 * cliente entre peticiones falla una de cada dos. Ver conDb() en el paquete de
 * dominio para el detalle.
 *
 * En local (next dev, next start, tests) no hay contexto de Cloudflare y conDb
 * cae al cliente cacheado de DATABASE_URL, que es lo correcto ahí.
 */
export async function conBaseDeDatos<T>(trabajo: (db: Database) => Promise<T>): Promise<T> {
  const { env, ctx } = await contextoCloudflare();
  return conDb(trabajo, env, ctx);
}

// Aquí vivía obtenerDb(), la forma antigua que devolvía una conexión sin
// cerrarla al terminar la petición. Ya no existe: las cinco rutas que tocan la
// base usan conBaseDeDatos(), así que mantenerla solo invitaba a volver al
// patrón que no libera la conexión en Workers.
