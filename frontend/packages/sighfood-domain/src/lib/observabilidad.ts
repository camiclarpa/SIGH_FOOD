// =============================================================================
// SIGH_FOOD - Logging estructurado y trazas de petición
// =============================================================================
//
// Hasta ahora el diagnóstico eran `console.log` sueltos con emojis. Eso sirve
// mirando una terminal, pero con 1000 clientes nadie está mirando: hay que
// poder responder "¿qué endpoint se degradó anoche?" sin reproducirlo a mano.
//
// Salida en JSON por línea, que es lo que ingieren Cloudflare Workers Logs,
// Datadog o BetterStack sin configuración adicional. Cada entrada lleva un
// requestId para poder seguir una petición a través de sus etapas.

export type NivelLog = 'debug' | 'info' | 'warn' | 'error';

const PRIORIDAD: Record<NivelLog, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function nivelMinimo(): NivelLog {
  const configurado = (process.env.LOG_LEVEL || '').toLowerCase();
  return (['debug', 'info', 'warn', 'error'] as const).includes(configurado as NivelLog)
    ? (configurado as NivelLog)
    : 'info';
}

/**
 * Campos que nunca deben aparecer en un log.
 *
 * Un `console.log(body)` con el cuerpo de un formulario acaba escribiendo
 * teléfonos y correos en un sistema de terceros, y con Habeas Data eso es
 * exactamente lo que la tabla data_consents intenta acreditar que no ocurre.
 */
const CLAVES_SENSIBLES = /^(password|passwordHash|token|secret|authorization|cookie|apiKey|whatsapp|phone|email)$/i;

function saneado(valor: unknown, profundidad = 0): unknown {
  if (profundidad > 4) return '[profundidad máxima]';
  if (valor === null || typeof valor !== 'object') return valor;
  if (Array.isArray(valor)) return valor.slice(0, 20).map((v) => saneado(v, profundidad + 1));

  const salida: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
    salida[clave] = CLAVES_SENSIBLES.test(clave) ? '[oculto]' : saneado(v, profundidad + 1);
  }
  return salida;
}

export interface ContextoLog {
  requestId?: string;
  ruta?: string;
  metodo?: string;
  duracionMs?: number;
  estado?: number;
  [clave: string]: unknown;
}

function emitir(nivel: NivelLog, mensaje: string, contexto?: ContextoLog, error?: unknown): void {
  if (PRIORIDAD[nivel] < PRIORIDAD[nivelMinimo()]) return;

  const entrada: Record<string, unknown> = {
    ts: new Date().toISOString(),
    nivel,
    mensaje,
    ...(contexto ? (saneado(contexto) as Record<string, unknown>) : {}),
  };

  if (error !== undefined) {
    entrada.error =
      error instanceof Error
        ? { nombre: error.name, mensaje: error.message, stack: error.stack }
        : { valor: String(error) };
  }

  const linea = JSON.stringify(entrada);
  if (nivel === 'error') console.error(linea);
  else if (nivel === 'warn') console.warn(linea);
  else console.log(linea);
}

export const log = {
  debug: (mensaje: string, contexto?: ContextoLog) => emitir('debug', mensaje, contexto),
  info: (mensaje: string, contexto?: ContextoLog) => emitir('info', mensaje, contexto),
  warn: (mensaje: string, contexto?: ContextoLog) => emitir('warn', mensaje, contexto),
  error: (mensaje: string, error?: unknown, contexto?: ContextoLog) =>
    emitir('error', mensaje, contexto, error),
};

/**
 * Envuelve un handler de ruta para medir su duración y registrar el resultado.
 *
 * Registra siempre: éxito, error controlado y excepción no capturada. Un
 * envoltorio que solo loguea el camino feliz deja invisible justo lo que hace
 * falta investigar.
 */
export function conTrazas<T extends unknown[]>(
  nombreRuta: string,
  handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
  return async (...args: T): Promise<Response> => {
    const peticion = args[0] as Request | undefined;
    const requestId =
      peticion?.headers?.get?.('cf-ray') ??
      peticion?.headers?.get?.('x-request-id') ??
      crypto.randomUUID();
    const inicio = Date.now();

    try {
      const respuesta = await handler(...args);
      const duracionMs = Date.now() - inicio;

      log[respuesta.status >= 500 ? 'error' : respuesta.status >= 400 ? 'warn' : 'info'](
        'peticion completada',
        { requestId, ruta: nombreRuta, metodo: peticion?.method, estado: respuesta.status, duracionMs }
      );

      respuesta.headers.set('x-request-id', requestId);
      return respuesta;
    } catch (error) {
      log.error('excepción no controlada', error, {
        requestId,
        ruta: nombreRuta,
        metodo: peticion?.method,
        duracionMs: Date.now() - inicio,
      });
      throw error;
    }
  };
}
