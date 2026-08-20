// =============================================================================
// SIGH_FOOD - Comprobación de salud del CRM
// Endpoint: GET /api/health
// =============================================================================
//
// Existe por una caída concreta: el Worker se desplegó sin AUTH_SECRET y todo
// /api/auth/* devolvió 500 con "There was a problem with the server
// configuration". El CRM quedó inaccesible —ninguna contraseña habría
// funcionado— y nada lo detectó: se descubrió cuando alguien intentó entrar.
//
// De ahí las dos decisiones de diseño:
//
//   · Es público. Comprobar la salud a través de la sesión no sirve cuando lo
//     que está roto ES la sesión, que es justo el caso que motivó esto.
//   · Informa de presencia, nunca de valores. Un endpoint sin autenticar que
//     dijera cuánto mide un secreto o a qué host apunta la base sería un regalo
//     para quien esté buscando por dónde entrar.

import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { conBaseDeDatos, variableDeEntorno, contextoCloudflare } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';

/** Una comprobación no debe colgar la respuesta si su dependencia no responde. */
const TIEMPO_LIMITE_MS = 5_000;

type Estado = 'ok' | 'degradado' | 'caido';

interface Comprobacion {
  nombre: string;
  estado: Estado;
  /** Por qué falla. Nunca incluye credenciales ni cadenas de conexión. */
  detalle?: string;
  ms: number;
  /** Si es true, que falle significa que el CRM no se puede usar. */
  critica: boolean;
}

async function conLimite<T>(trabajo: () => Promise<T>): Promise<T> {
  return Promise.race([
    trabajo(),
    new Promise<never>((_, rechazar) =>
      setTimeout(() => rechazar(new Error(`sin respuesta en ${TIEMPO_LIMITE_MS}ms`)), TIEMPO_LIMITE_MS)
    ),
  ]);
}

async function medir(
  nombre: string,
  critica: boolean,
  trabajo: () => Promise<string | undefined>
): Promise<Comprobacion> {
  const t0 = Date.now();
  try {
    const detalle = await conLimite(trabajo);
    return { nombre, estado: 'ok', detalle, ms: Date.now() - t0, critica };
  } catch (e) {
    return {
      nombre,
      estado: critica ? 'caido' : 'degradado',
      detalle: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0,
      critica,
    };
  }
}

export const GET = conTrazas('/api/health', async () => {
  const { env } = await contextoCloudflare();
  const enWorkers = env !== undefined;

  const comprobaciones = await Promise.all([
    // 1. El secreto de sesión. Sin él nadie puede entrar, y es exactamente lo
    //    que faltó. Se comprueba que exista y que no esté vacío, nada más.
    medir('auth_secret', true, async () => {
      const secreto = (await variableDeEntorno('AUTH_SECRET'))?.trim();
      if (!secreto) {
        throw new Error(
          'ausente. En Cloudflare se sube con `wrangler secret put AUTH_SECRET`; ' +
          'sin él Auth.js rechaza toda petición a /api/auth/* con 500.'
        );
      }
      // Un secreto corto es tan inútil como no tenerlo, y el fallo sería igual
      // de silencioso.
      if (secreto.length < 32) throw new Error('demasiado corto (mínimo 32 caracteres)');
      return 'presente';
    }),

    // 2. La base de datos. Se hace una consulta real, no solo abrir conexión:
    //    Hyperdrive puede dar un cliente que falle al primer SELECT.
    medir('base_de_datos', true, async () => {
      const filas = await conBaseDeDatos(async (db) => db.execute(sql`SELECT 1 AS vivo`));
      const n = Array.isArray(filas) ? filas.length : (filas as { rows?: unknown[] }).rows?.length;
      if (!n) throw new Error('la consulta de prueba no devolvió filas');
      return 'responde';
    }),

    // 3. Conexión a la base desde el Worker. Fuera de Cloudflare no aplica.
    medir('hyperdrive', enWorkers, async () => {
      if (!enWorkers) return 'no aplica (fuera de Cloudflare)';
      const tiene = Boolean((env as unknown as { HYPERDRIVE?: unknown }).HYPERDRIVE);
      if (!tiene) throw new Error('binding HYPERDRIVE ausente en wrangler.jsonc');
      return 'enlazado';
    }),

    // 4. Workers AI. No es crítico: sin él la búsqueda semántica deja de
    //    funcionar, pero el CRM se sigue usando.
    medir('workers_ai', false, async () => {
      if (!enWorkers) return 'no aplica (fuera de Cloudflare)';
      const tiene = Boolean((env as unknown as { AI?: unknown }).AI);
      if (!tiene) throw new Error('binding AI ausente: la búsqueda semántica no funcionará');
      return 'enlazado';
    }),

    // 5. Rate limiting. Tampoco es crítico, pero su ausencia deja los endpoints
    //    públicos sin más freno que el contador en memoria, que no se comparte
    //    entre isolates.
    medir('rate_limiting', false, async () => {
      if (!enWorkers) return 'no aplica (fuera de Cloudflare)';
      const tiene = Boolean((env as unknown as { LIMITADOR_PUBLICO?: unknown }).LIMITADOR_PUBLICO);
      if (!tiene) throw new Error('binding LIMITADOR_PUBLICO ausente: el límite no será global');
      return 'enlazado';
    }),
  ]);

  const caidas = comprobaciones.filter((c) => c.estado === 'caido');
  const degradadas = comprobaciones.filter((c) => c.estado === 'degradado');
  const estado: Estado = caidas.length ? 'caido' : degradadas.length ? 'degradado' : 'ok';

  if (caidas.length) {
    log.error('Health check en estado crítico', new Error(caidas.map((c) => `${c.nombre}: ${c.detalle}`).join(' | ')), {
      ruta: '/api/health',
    });
  }

  return NextResponse.json(
    {
      estado,
      entorno: enWorkers ? 'cloudflare' : 'local',
      comprobado: new Date().toISOString(),
      comprobaciones,
    },
    {
      // 503 y no 200: así un monitor externo, o el smoke de despliegue, lo
      // detecta sin tener que interpretar el cuerpo.
      status: caidas.length ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
});
