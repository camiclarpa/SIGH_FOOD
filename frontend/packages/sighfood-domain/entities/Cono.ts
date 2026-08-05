/**
 * ============================================================================
 * CONO ENTITY — OCP: Catálogo como DATO, no como CÓDIGO
 * ============================================================================
 * 
 * PRINCIPIO OCP (Capítulo 8):
 * ──────────────────────────────────────────────────────────────────────────
 * Uncle Bob define el OCP como: un módulo debe estar abierto para extensión
 * pero cerrado para modificación — se debe poder añadir nuevo comportamiento
 * sin editar el código fuente que ya existe y ya funciona.
 * 
 * APLICACIÓN:
 *   El catálogo de conos es DATO, no código. Añadir un 6to cono es AGREGAR
 *   una entrada a este arreglo — CERO modificación del componente que
 *   renderiza el portafolio, cumpliendo "abierto para extensión, cerrado
 *   para modificación".
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 8: OCP — Principio Abierto/Cerrado
 *   • Capítulo 22: Entities — Reglas de negocio empresariales
 * 
 * MÉTRICA DE CALIDAD:
 *   Si mañana el equipo de producto añade un 6to cono, SOLO se modifica
 *   este archivo (agregando una entrada al arreglo). Cero cambios en
 *   componentes de React, cero riesgo de romper la UI.
 * ============================================================================
 */

export interface Cono {
  readonly id: string;
  readonly nombre: string;
  readonly maridaje: string[];
  readonly tiempoEnsambleSegundos: number;
  readonly descripcion: string;
  readonly precioVentaCOP: number;
  readonly costoAdquisicionCOP: number;
}

/**
 * PORTAFOLIO DE CONOS — DATO, NO CÓDIGO
 * 
 * Añadir un 6to cono: AGREGAR una entrada aquí.
 * El componente que renderiza el portafolio simplemente itera sobre este
 * arreglo — no necesita modificación.
 */
export const PORTAFOLIO_CONOS: readonly Cono[] = Object.freeze([
  {
    id: 'spicy-volcano',
    nombre: 'The Spicy Volcano Cone',
    maridaje: ['Mezcal', 'Tequila'],
    tiempoEnsambleSegundos: 18,
    descripcion: 'Crujiente, picante, con elixir de chile y limón.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'sweet-salty-caramel',
    nombre: 'Sweet & Salty Caramel Cone',
    maridaje: ['Bourbon', 'Whisky'],
    tiempoEnsambleSegundos: 17,
    descripcion: 'Caramelo salado que eleva las notas de vainilla del barril.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'herbal-citrus',
    nombre: 'Herbal Citrus Botanical Cone',
    maridaje: ['Gin-Tonic'],
    tiempoEnsambleSegundos: 19,
    descripcion: 'Botánicos frescos que complementan la ginebra.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'smoked-cheese-truffle',
    nombre: 'Smoked Cheese & Truffle Cone',
    maridaje: ['Vino Tinto', 'Espumoso'],
    tiempoEnsambleSegundos: 20,
    descripcion: 'Umami profundo para vinos estructurados.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  {
    id: 'tropical-anise',
    nombre: 'Tropical Anise & Fusion Cone',
    maridaje: ['Ron Añejo'],
    tiempoEnsambleSegundos: 18,
    descripcion: 'Tropical con anís, perfecto para ron añejo.',
    precioVentaCOP: 32_000,
    costoAdquisicionCOP: 8_500,
  },
  // Añadir un 6to cono: AGREGAR una entrada aquí — CERO modificación del componente
]);

/**
 * Función pura para obtener un cono por ID
 * 
 * Esta función es determinística y sin efectos secundarios — puede probarse
 * de forma aislada, sin necesidad de un navegador o DOM.
 */
export function obtenerConoPorId(id: string): Cono | undefined {
  return PORTAFOLIO_CONOS.find((cono) => cono.id === id);
}

/**
 * Función pura para calcular el margen neto de un cono
 * 
 * Margen = (Precio Venta - Costo Adquisición) / Precio Venta
 * Para SIGH_FOOD: ($32,000 - $8,500) / $32,000 = 73.4%
 */
export function calcularMargenNetoCono(cono: Cono): number {
  const margen = (cono.precioVentaCOP - cono.costoAdquisicionCOP) / cono.precioVentaCOP;
  return Math.round(margen * 1000) / 1000; // 3 decimales
}