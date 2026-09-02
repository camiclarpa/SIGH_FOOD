// =============================================================================
// Modo degradado de solo lectura
// =============================================================================
//
// Si Neon se cae, el CRM se cae entero: cada pantalla lanza su consulta y todas
// fallan a la vez. Es el punto único de fallo más grande que tiene el sistema.
//
// Esto no lo elimina —para eso hace falta una réplica, que cuesta dinero— pero
// cambia lo que ocurre: en vez de una pantalla de error, el CRM sigue en pie
// mostrando la última copia buena, avisando de que los datos son de hace un
// rato. Solo dejan de funcionar las escrituras.
//
// Dos decisiones importantes:
//
//   · La consulta va SIEMPRE a Postgres primero. Esto no es una caché de
//     rendimiento: si sirviera de caché, el CRM mostraría datos viejos en
//     funcionamiento normal, que es justo lo que no se quiere en un sistema
//     donde alguien decide sobre stock y cobros.
//
//   · El respaldo se escribe con `waitUntil`, fuera del camino de la respuesta.
//     Escribirlo antes de responder añadiría la latencia de KV a cada carga de
//     pantalla para proteger de un caso que casi nunca ocurre.

import { contextoCloudflare } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';

/** Namespace KV donde vive la última copia buena de cada consulta. */
interface AlmacenRespaldo {
  get(clave: string, tipo: 'text'): Promise<string | null>;
  put(clave: string, valor: string, opciones?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Cuánto se conserva un respaldo. Pasado ese tiempo KV lo borra solo.
 *
 * Doce horas: suficiente para cubrir una caída larga sin que el CRM acabe
 * enseñando cifras de ayer como si fueran de hoy.
 */
const VIDA_RESPALDO_S = 12 * 60 * 60;

/**
 * Cada cuánto se refresca el respaldo de una clave.
 *
 * KV en el plan gratuito admite 1.000 escrituras al día. Sin este freno, cada
 * carga del panel sería una escritura y se agotaría la cuota en una mañana,
 * dejando de escribirse justo lo que hace falta cuando llegue la caída.
 */
const REFRESCO_S = 5 * 60;

interface Envoltorio<T> {
  guardado: number;
  datos: T;
}

export interface ResultadoConRespaldo<T> {
  datos: T;
  /** true si Postgres falló y esto viene del respaldo. */
  degradado: boolean;
  /** Antigüedad del respaldo en segundos. Solo cuando `degradado` es true. */
  edadSegundos?: number;
}

async function almacen(): Promise<AlmacenRespaldo | undefined> {
  const { env } = await contextoCloudflare();
  return (env as unknown as { RESPALDO_LECTURA?: AlmacenRespaldo })?.RESPALDO_LECTURA;
}

/**
 * Ejecuta `consulta` y, si la base no responde, devuelve la última copia buena.
 *
 * `clave` identifica la consulta Y sus parámetros: dos búsquedas distintas no
 * pueden compartir respaldo o una acabaría mostrando los resultados de la otra.
 */
export async function conRespaldo<T>(
  clave: string,
  consulta: () => Promise<T>
): Promise<ResultadoConRespaldo<T>> {
  const kv = await almacen();

  try {
    const datos = await consulta();

    // Guardar es best-effort: que falle KV no puede tumbar una petición que ya
    // tiene sus datos.
    if (kv) {
      const { ctx } = await contextoCloudflare();
      const guardar = async () => {
        try {
          const previo = await kv.get(clave, 'text');
          if (previo) {
            const { guardado } = JSON.parse(previo) as Envoltorio<T>;
            if (Date.now() - guardado < REFRESCO_S * 1000) return;
          }
          const envoltorio: Envoltorio<T> = { guardado: Date.now(), datos };
          await kv.put(clave, JSON.stringify(envoltorio), { expirationTtl: VIDA_RESPALDO_S });
        } catch (e) {
          log.warn('No se pudo guardar el respaldo de lectura', { clave, detalle: String(e).slice(0, 200) });
        }
      };

      if (ctx?.waitUntil) ctx.waitUntil(guardar());
      else await guardar();
    }

    return { datos, degradado: false };
  } catch (errorConsulta) {
    if (!kv) throw errorConsulta;

    let crudo: string | null = null;
    try {
      crudo = await kv.get(clave, 'text');
    } catch {
      // KV tampoco responde: se propaga el fallo original, que es el relevante.
      throw errorConsulta;
    }

    // Sin respaldo no hay nada que enseñar: es preferible el error a inventarse
    // una pantalla vacía que parezca "no hay datos".
    if (!crudo) throw errorConsulta;

    const { guardado, datos } = JSON.parse(crudo) as Envoltorio<T>;
    const edadSegundos = Math.round((Date.now() - guardado) / 1000);

    log.warn('Base de datos no disponible: se sirve el respaldo', {
      clave,
      edadSegundos,
      detalle: errorConsulta instanceof Error ? errorConsulta.message.slice(0, 200) : String(errorConsulta),
    });

    return { datos, degradado: true, edadSegundos };
  }
}
