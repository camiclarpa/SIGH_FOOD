/**
 * domain/crm/CRMWebhookPayload.ts
 *
 * Estructura JSON EXACTA que se envía vía Webhook al CRM (Pipedrive/HubSpot).
 * Este es el contrato más importante del documento — cualquier cambio aquí
 * exige coordinación con el equipo que mantiene el mapeo de campos en el
 * CRM (ver RFC-DDIA, Sección 4: Codificación y Evolución del esquema).
 */
import { B2BLeadFormPayload } from '../leads/B2BLeadFormPayload';
import { DealStage } from './DealStage';
import { UTMMetadata } from './UTMMetadata';

export interface CRMWebhookPayload {
  /** Identificador único idempotente — previene Leads duplicados por reintento (RFC-DDIA, Sección 17.3) */
  leadId: string;
  /** Timestamp de envío del formulario, en formato ISO 8601 */
  timestampISO: string;
  /** Etapa inicial en la que el Lead ingresa al pipeline — siempre LEAD_NUEVO al momento del Webhook */
  dealStage: DealStage.LEAD_NUEVO;
  /** Datos del formulario, tal como los completó el usuario (Sección 4) */
  datosLead: B2BLeadFormPayload;
  /**
   * El "Anclaje Financiero" — la cifra de ROI que el propio usuario calculó.
   * Se duplica aquí (además de estar dentro de datosLead) como campo de
   * primer nivel porque el equipo de ventas necesita verla de inmediato en
   * la vista de lista del CRM, sin tener que abrir el detalle del Lead.
   */
  anclajeFinancieroCOP: number;
  /** Metadatos de atribución de marketing */
  utm: UTMMetadata;
  /** Score de calificación inicial, si ya fue calculado por reglas del lado del servidor (opcional — puede llegar null y calcularse después de forma asíncrona) */
  scoreCalificacionInicial: number | null;
}