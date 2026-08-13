// =============================================================================
// SIGH_FOOD - Database Client (Hybrid: Local + Cloudflare Hyperdrive)
// =============================================================================

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Type for Cloudflare Hyperdrive binding
interface Hyperdrive {
  connectionString: string;
}

// Type for Cloudflare environment
export interface CloudflareEnv {
  HYPERDRIVE: Hyperdrive;
  DATABASE_URL?: string;
  /** Secreto de firma de sesiones. En Workers llega por el binding, no por process.env. */
  AUTH_SECRET?: string;
}

// Database client type
export type Database = ReturnType<typeof drizzle>;

/**
 * Instancias cacheadas por cadena de conexión — SOLO fuera de Workers.
 *
 * Antes era un único `globalDb`: la primera llamada fijaba la conexión y todas
 * las siguientes recibían esa, ignorando sus argumentos. Si algo llamaba a
 * getDb() sin el entorno de Cloudflare antes que una ruta con él —el login,
 * por ejemplo— el Worker entero quedaba atado a DATABASE_URL, que en producción
 * no existe. Cachear por cadena elimina ese acoplamiento al orden de llamada.
 */
const INSTANCIAS = new Map<string, Database>();

function opcionesDeConexion(esHyperdrive: boolean) {
  return {
    // Con Hyperdrive el pooling lo hace Cloudflare: cada isolate solo necesita
    // unas pocas conexiones. Pedir 10 por isolate multiplica el consumo por el
    // número de isolates activos y agota el límite de Neon.
    // Con Hyperdrive el pooling lo hace Cloudflare: cada isolate solo necesita
    // unas pocas conexiones. Pedir 10 por isolate multiplica el consumo por el
    // número de isolates activos y agota el límite de Neon.
    max: esHyperdrive ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // postgres.js consulta el catálogo de tipos al abrir la conexión. En el
    // edge, donde los arranques en frío son constantes, ese viaje extra se paga
    // en cada uno.
    fetch_types: !esHyperdrive,
  };
}

/**
 * Contexto de ejecución de Workers, lo mínimo que necesitamos de él.
 */
export interface ContextoWorker {
  waitUntil(promesa: Promise<unknown>): void;
}

/**
 * Cliente para Cloudflare Workers: uno por petición, y cerrado al terminar.
 *
 * Workers aísla la E/S por invocación, así que un socket abierto en una
 * petición no sirve en la siguiente. Con el cliente cacheado, una de cada dos
 * peticiones moría con
 *
 *   "The Workers runtime canceled this request because it detected that your
 *    Worker's code had hung and would never generate a response"
 *
 * Pero crear uno nuevo sin cerrarlo es peor: la conexión queda abierta, el
 * Worker nunca da por terminada su E/S y la petición se cuelga hasta el
 * timeout. De ahí el `ctx.waitUntil(cliente.end())`: la respuesta se envía
 * enseguida y el cierre ocurre después, sin bloquearla.
 *
 * Nada de esto se reproduce con `next dev`, que es un proceso Node normal donde
 * el pool sobrevive entre peticiones. Solo aparece en workerd.
 */
function crearClienteWorker(connectionString: string): {
  db: Database;
  cerrar: () => Promise<void>;
} {
  const cliente = postgres(connectionString, opcionesDeConexion(true));
  return {
    db: drizzle(cliente, { schema }),
    cerrar: () => cliente.end({ timeout: 5 }),
  };
}

/**
 * Ejecuta `trabajo` con una conexión válida y la cierra cuando termina.
 *
 * Es la única forma correcta de hablar con Postgres desde un Worker, y el
 * motivo de que exista este envoltorio en vez de un simple getDb():
 *
 *   · Reutilizar el cliente entre peticiones falla, porque Workers aísla la
 *     E/S por invocación (una de cada dos peticiones moría con "your Worker's
 *     code had hung and would never generate a response").
 *   · Crear uno nuevo y no cerrarlo también falla: queda E/S pendiente y la
 *     petición se cuelga hasta el timeout.
 *   · Y cerrarlo al crearlo —`ctx.waitUntil(cliente.end())` junto al
 *     `postgres()`— cierra la conexión ANTES de las consultas, porque
 *     `cliente.end()` se ejecuta en ese mismo instante y waitUntil solo espera
 *     la promesa resultante.
 *
 * De ahí el finally: el cierre se registra cuando el trabajo ya terminó, así la
 * respuesta sale enseguida y la conexión se libera después sin bloquearla.
 *
 * Fuera de Workers reutiliza el cliente cacheado y no cierra nada: ahí es un
 * proceso de vida larga y el pool debe sobrevivir entre peticiones.
 */
export async function conDb<T>(
  trabajo: (db: Database) => Promise<T>,
  cloudflareEnv?: CloudflareEnv,
  ctx?: ContextoWorker
): Promise<T> {
  if (cloudflareEnv?.HYPERDRIVE?.connectionString) {
    const { db, cerrar } = crearClienteWorker(cloudflareEnv.HYPERDRIVE.connectionString);
    try {
      return await trabajo(db);
    } finally {
      // Cierre diferido: la respuesta sale ya y la conexión se libera después.
      // Es lo que documenta Cloudflare para Hyperdrive + postgres.js.
      //
      // Nota de campo: en `opennextjs-cloudflare preview` sobre Windows las
      // peticiones con base de datos alternan 200/500 ("your Worker's code had
      // hung"). Se midió con cuatro variantes —cliente cacheado, uno por
      // petición sin cerrar, cerrando con await y cerrando con waitUntil, y con
      // max 1 y 5— y las cuatro dan exactamente 4 de 8, así que el patrón no
      // depende de esta gestión. Las rutas que no tocan la base van 6/6 en el
      // mismo servidor. OpenNext avisa al arrancar de que no es plenamente
      // compatible con Windows; queda por confirmar en un despliegue real o
      // desde WSL si también ocurre fuera del emulador.
      if (ctx?.waitUntil) ctx.waitUntil(cerrar());
      else await cerrar();
    }
  }

  return trabajo(getDb(cloudflareEnv));
}

/** Cliente para procesos de vida larga (next dev, next start, scripts). */
function crearClienteLocal(connectionString: string): Database {
  const cacheada = INSTANCIAS.get(connectionString);
  if (cacheada) return cacheada;

  const cliente = postgres(connectionString, opcionesDeConexion(false));
  const db = drizzle(cliente, { schema });
  INSTANCIAS.set(connectionString, db);
  return db;
}

/**
 * Get database connection
 *
 * In local development: Uses process.env.DATABASE_URL (Neon PostgreSQL)
 * In Cloudflare Workers: Uses env.HYPERDRIVE (Cloudflare Hyperdrive)
 *
 * @param cloudflareEnv - Optional Cloudflare environment (only needed in Workers)
 * @returns Database instance
 */
export function getDb(cloudflareEnv?: CloudflareEnv): Database {
  // Producción sobre Workers: Hyperdrive tiene prioridad.
  //
  // Ojo: por aquí la conexión no se cierra nunca, así que en Workers hay que
  // usar conDb() en su lugar. Esta rama queda para wrangler dev con scripts y
  // para no romper llamadas existentes.
  if (cloudflareEnv?.HYPERDRIVE?.connectionString) {
    return crearClienteWorker(cloudflareEnv.HYPERDRIVE.connectionString).db;
  }

  // Desarrollo local: conexión directa a Neon.
  const databaseUrl = cloudflareEnv?.DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'No hay conexión a la base de datos: falta el binding HYPERDRIVE ' +
      '(Cloudflare Workers) y la variable DATABASE_URL (local). ' +
      'Define DATABASE_URL en apps/web/.env.local para desarrollo.'
    );
  }

  // `postgres()` no abre la conexión aquí: es perezoso y solo conecta en la
  // primera consulta. Por eso no se anuncia "conectado" — antes se hacía, y el
  // log decía "Connected" justo antes de que la primera query fallara con
  // ENOTFOUND, apuntando en la dirección equivocada al diagnosticar.
  return crearClienteLocal(databaseUrl);
}

/**
 * Cierra las conexiones abiertas. Úsalo al apagar la aplicación o entre tests.
 *
 * Antes solo ponía la referencia a null: el pool de postgres.js seguía vivo con
 * sus sockets abiertos, así que llamarlo repetidamente filtraba conexiones.
 */
export async function closeDb(): Promise<void> {
  INSTANCIAS.clear();
}

// Export schema for convenience
export { schema };
