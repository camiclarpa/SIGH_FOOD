/**
 * domain/crm/UTMMetadata.ts
 *
 * Metadatos de la sesión de origen — indispensables para que el equipo de
 * Marketing (RFC de Sistema Publicitario) atribuya correctamente el CAC
 * y el ROAS de cada canal.
 */
export interface UTMMetadata {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** URL completa desde la que llegó el usuario, para debugging de atribución */
  referrerUrl: string | null;
  /** Timestamp exacto de la primera vista de la Landing (no del envío del formulario) */
  landingViewedAtISO: string;
}