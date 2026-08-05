/**
 * domain/enums/EConeReference.ts
 *
 * Los 5 conos del portafolio activo. Usar el enum (no un string libre) en
 * toda referencia al producto evita errores de tipeo que romperían el
 * join con la tabla de maridaje en el CRM (ver RFC-DDIA, Sección 6).
 */
export enum EConeReference {
  SPICY_VOLCANO = 'SPICY_VOLCANO',
  SWEET_SALTY_CARAMEL = 'SWEET_SALTY_CARAMEL',
  HERBAL_CITRUS_BOTANICAL = 'HERBAL_CITRUS_BOTANICAL',
  SMOKED_CHEESE_TRUFFLE = 'SMOKED_CHEESE_TRUFFLE',
  TROPICAL_ANISE_FUSION = 'TROPICAL_ANISE_FUSION',
}