// =============================================================================
// SIGH_FOOD - Caché en memoria con TTL
// =============================================================================
//
// Para métricas agregadas, que son caras de calcular y no necesitan estar al
// segundo. Un COUNT(*) sobre sensory_moments recorre la tabla entera: medido
// con 500.000 filas tarda ~90 ms, y crece en línea recta con el volumen. Sin
// caché, cada carga del panel lo repite.
//
// Límites conscientes: la caché vive en el proceso. En Cloudflare Workers cada
// isolate tiene la suya, así que el ratio de acierto es menor que con un Redis
// compartido — pero recorta igualmente la mayoría de las consultas y no añade
// infraestructura. Si algún día hace falta invalidación coordinada entre
// instancias, el reemplazo natural es Cloudflare KV o Redis.

interface Entrada<T> {
  valor: T;
  expiraEn: number;
}

const ALMACEN = new Map<string, Entrada<unknown>>();

/** Descarta las entradas vencidas para que el mapa no crezca sin límite. */
function purgar(ahora: number): void {
  for (const [clave, entrada] of ALMACEN) {
    if (ahora >= entrada.expiraEn) ALMACEN.delete(clave);
  }
}

/**
 * Devuelve el valor cacheado o ejecuta `calcular` y guarda el resultado.
 *
 * Las peticiones concurrentes con la misma clave comparten la promesa en vuelo,
 * de modo que un pico de tráfico con la caché fría no dispara N consultas
 * idénticas contra la base ("cache stampede").
 */
const EN_VUELO = new Map<string, Promise<unknown>>();

export async function conCache<T>(
  clave: string,
  ttlSegundos: number,
  calcular: () => Promise<T>
): Promise<T> {
  const ahora = Date.now();

  const cacheada = ALMACEN.get(clave);
  if (cacheada && ahora < cacheada.expiraEn) {
    return cacheada.valor as T;
  }

  const enCurso = EN_VUELO.get(clave);
  if (enCurso) return enCurso as Promise<T>;

  const promesa = (async () => {
    try {
      const valor = await calcular();
      ALMACEN.set(clave, { valor, expiraEn: Date.now() + ttlSegundos * 1000 });
      if (ALMACEN.size > 500) purgar(Date.now());
      return valor;
    } finally {
      EN_VUELO.delete(clave);
    }
  })();

  EN_VUELO.set(clave, promesa);
  return promesa;
}

/** Invalida una clave concreta o, sin argumento, la caché entera. */
export function invalidarCache(clave?: string): void {
  if (clave) ALMACEN.delete(clave);
  else ALMACEN.clear();
}
