/**
 * domain/enums/ELiquorCategory.ts
 *
 * Categoría de licor dominante en la carta del establecimiento. Este campo
 * alimenta directamente la recomendación de producto en la Demo Phygital —
 * "personaliza el kit de cata" según lo que el vendedor va a mostrar en
 * la visita presencial (genera rapport inmediato: "vimos que su carta es
 * fuerte en Mezcal, por eso trajimos el Spicy Volcano").
 */
export enum ELiquorCategory {
  MEZCAL_AGAVE = 'MEZCAL_AGAVE',
  BOURBON_WHISKY = 'BOURBON_WHISKY',
  GIN_BOTANICAL = 'GIN_BOTANICAL',
  VINOS_ESPUMOSOS = 'VINOS_ESPUMOSOS',
  RON_TIKI = 'RON_TIKI',
}

/**
 * Mapa de referencia Cono -> Categoría de Licor de maridaje principal.
 * Fuente única de verdad para la ficha visual del portafolio Y para la
 * lógica de recomendación de producto en el formulario (Sección 4).
 */
export const CONE_LIQUOR_PAIRING: Record<EConeReference, ELiquorCategory> = {
  [EConeReference.SPICY_VOLCANO]: ELiquorCategory.MEZCAL_AGAVE,
  [EConeReference.SWEET_SALTY_CARAMEL]: ELiquorCategory.BOURBON_WHISKY,
  [EConeReference.HERBAL_CITRUS_BOTANICAL]: ELiquorCategory.GIN_BOTANICAL,
  [EConeReference.SMOKED_CHEESE_TRUFFLE]: ELiquorCategory.VINOS_ESPUMOSOS,
  [EConeReference.TROPICAL_ANISE_FUSION]: ELiquorCategory.RON_TIKI,
};