// =============================================================================
// Niveles y líneas de producto — constantes puras
// =============================================================================
//
// SIN NINGÚN IMPORT DE BASE DE DATOS, y ese es el motivo de que exista.
//
// Estas listas las necesitan las dos orillas: el servidor para calcular niveles
// y los editores del CRM —que son componentes de cliente— para pintar los
// desplegables. Cuando vivían dentro de lib/fidelizacion.ts, importar una sola
// constante arrastraba `@sighfood/domain/db/schema` al paquete del navegador:
// las sesenta tablas del esquema y drizzle entero, para leer cinco etiquetas.
//
// No rompía el build, así que no se notaba. Lo detectó el guard de
// cliente-servidor al hacerlo transitivo.
//
// Es el mismo motivo por el que ya existen lib/roles.ts y lib/plantillas.ts:
// una constante inocente puede traer media base de datos detrás.

/** Puntos que otorga un escaneo. */
export const PUNTOS_POR_ESCANEO = 10;

/**
 * Niveles del pasaporte sensorial, por número de escaneos.
 *
 * De menor a mayor: el cálculo recorre la lista al revés y se queda con el
 * primero que alcance.
 */
export const NIVELES = [
  { nivel: 'explorador' as const, desde: 0, etiqueta: 'Explorador' },
  { nivel: 'aficionado' as const, desde: 5, etiqueta: 'Aficionado' },
  { nivel: 'catador_leyenda' as const, desde: 20, etiqueta: 'Catador Leyenda' },
];

export type NivelComensal = (typeof NIVELES)[number]['nivel'];

export function nivelDeComensal(escaneos: number): NivelComensal {
  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (escaneos >= NIVELES[i].desde) return NIVELES[i].nivel;
  }
  return 'explorador';
}

/** Cuántos escaneos faltan para el siguiente nivel, o null si ya es el último. */
export function progresoNivel(escaneos: number): { siguiente: string; faltan: number } | null {
  const siguiente = NIVELES.find((n) => escaneos < n.desde);
  return siguiente ? { siguiente: siguiente.etiqueta, faltan: siguiente.desde - escaneos } : null;
}

export function etiquetaNivel(nivel: string | null): string {
  return NIVELES.find((n) => n.nivel === nivel)?.etiqueta ?? nivel ?? 'Explorador';
}

// -----------------------------------------------------------------------------
// Líneas de producto
// -----------------------------------------------------------------------------

export const LINEAS_PRODUCTO = [
  { codigo: 'flavor_switch', etiqueta: 'Flavor Switch' },
  { codigo: 'taste_shock', etiqueta: 'Taste Shock' },
  { codigo: 'spicy_volcano', etiqueta: 'Spicy Volcano' },
  { codigo: 'umami_boost', etiqueta: 'Umami Boost' },
  { codigo: 'sweet_craft', etiqueta: 'Sweet Craft' },
] as const;

export function etiquetaLinea(codigo: string | null): string {
  return LINEAS_PRODUCTO.find((l) => l.codigo === codigo)?.etiqueta ?? codigo ?? 'Sin definir';
}
