// =============================================================================
// SIGH_FOOD - Acceso a la base de datos desde las rutas
// =============================================================================

import { getCloudflareContext } from '@opennextjs/cloudflare';
import {
  conDb,
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
export async function contextoCloudflare(): Promise<{
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
/**
 * Fallos que merecen un reintento: los de conexión, no los de la consulta.
 *
 * Reintentar un error de sintaxis o una violación de restricción no lo arregla,
 * solo lo repite y multiplica la latencia del fallo. Se reintenta lo que es
 * transitorio por naturaleza en una base serverless: el arranque en frío de
 * Neon, un socket reciclado, un pico de Hyperdrive.
 */
function esTransitorio(error: unknown): boolean {
  const codigo = (error as { code?: string })?.code ?? '';
  const mensaje = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // Códigos de postgres.js y de red.
  const CODIGOS = [
    'CONNECTION_CLOSED',
    'CONNECTION_ENDED',
    'CONNECTION_DESTROYED',
    'CONNECT_TIMEOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EPIPE',
    // Postgres: el administrador terminó la conexión / apagado en curso.
    '57P01',
    '57P03',
    // Demasiadas conexiones: cede y reintenta en vez de fallar de inmediato.
    '53300',
  ];
  if (CODIGOS.includes(codigo)) return true;

  return [
    'connection closed',
    'connection terminated',
    'connection reset',
    'timeout',
    'socket',
    'network',
    'fetch failed',
  ].some((t) => mensaje.includes(t));
}

const REINTENTOS = 2;
const ESPERA_BASE_MS = 120;

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
 *
 * Reintenta los fallos de conexión. Neon es serverless: un arranque en frío o
 * un socket reciclado producen errores momentáneos que no significan que la
 * base esté caída. Sin reintento, cada uno de ellos era una pantalla de error
 * para quien estuviera usando el CRM en ese instante.
 *
 * IMPORTANTE: `trabajo` debe poder ejecutarse dos veces. Todas las lecturas lo
 * cumplen; una escritura que no sea idempotente no debe pasar por aquí sin
 * envolverse en una transacción, o podría aplicarse dos veces.
 */
export async function conBaseDeDatos<T>(trabajo: (db: Database) => Promise<T>): Promise<T> {
  const { env, ctx } = await contextoCloudflare();

  let ultimo: unknown;

  for (let intento = 0; intento <= REINTENTOS; intento++) {
    try {
      return await conDb(trabajo, env, ctx);
    } catch (e) {
      ultimo = e;

      if (!esTransitorio(e) || intento === REINTENTOS) break;

      // Espera creciente: si el problema es saturación, reintentar de inmediato
      // la empeora.
      await new Promise((r) => setTimeout(r, ESPERA_BASE_MS * 2 ** intento));
    }
  }

  throw ultimo;
}

/**
 * Lee una variable de entorno funcione donde funcione.
 *
 * En Workers las variables y secretos llegan en el `env` del binding, no en
 * `process.env`, que allí está prácticamente vacío. Es el mismo tropiezo que ya
 * dejó AUTH_SECRET sin valor en producción y tumbó `/api/auth/*` con "There was
 * a problem with the server configuration": el código leía process.env y en
 * local funcionaba, así que el fallo solo aparecía desplegado.
 *
 * Se consulta primero el binding y process.env después, para que local y
 * `next dev` sigan funcionando sin cambios.
 */
export async function variableDeEntorno(nombre: string): Promise<string | undefined> {
  const { env } = await contextoCloudflare();
  const desdeBinding = (env as unknown as Record<string, unknown> | undefined)?.[nombre];
  if (typeof desdeBinding === 'string' && desdeBinding !== '') return desdeBinding;
  return process.env[nombre];
}

// Aquí vivía obtenerDb(), la forma antigua que devolvía una conexión sin
// cerrarla al terminar la petición. Ya no existe: las cinco rutas que tocan la
// base usan conBaseDeDatos(), así que mantenerla solo invitaba a volver al
// patrón que no libera la conexión en Workers.
