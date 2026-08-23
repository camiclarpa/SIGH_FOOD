// =============================================================================
// De dónde vino quien está comprando
// =============================================================================
//
// Módulo PURO: no toca la base de datos ni importa nada del servidor. Los
// componentes que lo usan corren en el navegador, y un import que arrastre la
// conexión revienta el build del cliente.
//
// PRIMER TOQUE, NO ÚLTIMO
// -----------------------
// Se guarda el canal con el que la persona ENTRÓ a la visita, y no se
// sobrescribe después. Quien llega por un reel, mira, se va al menú y vuelve
// escribiendo la dirección a mano fue traído por el reel: si se guardara el
// último toque, ese pedido contaría como "directo" y el reel no aparecería en
// ningún informe. El resultado práctico de equivocarse aquí es apagar la
// inversión que sí estaba funcionando.
//
// DÓNDE SE GUARDA
// ---------------
// En sessionStorage, igual que la sesión anónima del embudo, y por la misma
// razón: muere al cerrar la pestaña. Es atribución dentro de la visita, no
// seguimiento entre visitas. Con localStorage se podría atribuir una compra de
// dentro de un mes, pero eso ya es rastrear a una persona a lo largo del tiempo,
// que no es lo que hace falta para decidir dónde invertir.

/** Lo que se sabe del origen de una visita. Todo opcional: lo normal es no saber nada. */
export interface Origen {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** El `ref` del enlace que comparte un comensal. */
  referidoPor?: string;
}

const CLAVE = 'bocazo:origen';

/** Tope de longitud, alineado con las columnas de la base. */
const LIMITES: Record<keyof Origen, number> = {
  utmSource: 80,
  utmMedium: 80,
  utmCampaign: 120,
  referidoPor: 120,
};

/**
 * Limpia un valor que viene de la URL.
 *
 * La cadena de consulta la escribe quien quiera: es entrada no confiable y
 * acaba en la base y en un informe que alguien lee. Se recorta a lo que cabe en
 * la columna y se restringe el alfabeto, porque un `utm_source` con saltos de
 * línea o etiquetas convierte el informe de canales en un desastre ilegible
 * —y, si algún día se pinta sin escapar, en algo peor.
 */
function limpiar(valor: string | null, maximo: number): string | undefined {
  if (!valor) return undefined;
  const limpio = valor
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ._\-|]/g, '')
    .slice(0, maximo)
    .trim();
  return limpio.length > 0 ? limpio : undefined;
}

/** Lee el origen de una cadena de consulta. Exportada aparte para poder probarla. */
export function leerDeParametros(parametros: URLSearchParams): Origen {
  const origen: Origen = {};

  const source = limpiar(parametros.get('utm_source'), LIMITES.utmSource);
  const medium = limpiar(parametros.get('utm_medium'), LIMITES.utmMedium);
  const campaign = limpiar(parametros.get('utm_campaign'), LIMITES.utmCampaign);
  const ref = limpiar(parametros.get('ref'), LIMITES.referidoPor);

  if (source) origen.utmSource = source;
  if (medium) origen.utmMedium = medium;
  if (campaign) origen.utmCampaign = campaign;
  if (ref) {
    origen.referidoPor = ref;
    // Un enlace de referido es un canal por derecho propio. Sin esto, los
    // pedidos que trae el boca a boca no aparecen en el informe de canales, que
    // es justo el canal más barato que tienes.
    if (!origen.utmSource) origen.utmSource = 'referido';
  }

  return origen;
}

/** ¿Trae algo? Un objeto vacío no merece guardarse. */
export function tieneAlgo(origen: Origen): boolean {
  return Object.values(origen).some((v) => typeof v === 'string' && v.length > 0);
}

/**
 * Registra el origen de esta visita, si no había uno ya.
 *
 * Se llama en cuanto carga la página. Devuelve el origen vigente para la visita
 * —el guardado si existía, el nuevo si no—, que es lo que después viaja con el
 * pedido.
 */
export function recordarOrigen(busqueda: string): Origen {
  let guardado: Origen = {};
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    if (crudo) guardado = JSON.parse(crudo) as Origen;
  } catch {
    // Sin sessionStorage, o con un valor corrupto, se sigue adelante sin
    // origen: medir nunca puede impedir comprar.
  }

  // Lo primero que se vio manda. Aquí es donde vive la regla del primer toque.
  if (tieneAlgo(guardado)) return guardado;

  const nuevo = leerDeParametros(new URLSearchParams(busqueda));
  if (!tieneAlgo(nuevo)) return {};

  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(nuevo));
  } catch {
    // Igual: se pierde la persistencia, pero el pedido de esta pantalla aún
    // puede llevar el origen.
  }

  return nuevo;
}

/** El origen de la visita, para adjuntarlo al pedido. */
export function origenDeLaVisita(): Origen {
  try {
    const crudo = sessionStorage.getItem(CLAVE);
    return crudo ? (JSON.parse(crudo) as Origen) : {};
  } catch {
    return {};
  }
}
