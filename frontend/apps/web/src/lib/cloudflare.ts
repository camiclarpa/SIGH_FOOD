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

/**
 * Conexión suelta, sin cierre gestionado.
 *
 * Es la forma antigua y queda para las rutas que todavía no se han migrado a
 * conBaseDeDatos(); la diferencia es que aquí nadie cierra la conexión al
 * terminar la petición. Hoy no se observa diferencia de comportamiento —el
 * patrón 200/500 del preview en Windows es idéntico con y sin cierre— pero la
 * forma correcta para Workers es conBaseDeDatos, y las rutas deberían migrarse
 * a ella cuando se toquen.
 */
export async function obtenerDb(): Promise<Database> {
  const { env } = await contextoCloudflare();
  return getDb(env);
}
