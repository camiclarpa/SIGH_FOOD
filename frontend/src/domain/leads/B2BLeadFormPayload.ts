/**
 * domain/leads/B2BLeadFormPayload.ts
 *
 * Estructura del Formulario de Agendamiento — Sección 5 de la Landing.
 * Este es el DTO que el componente de formulario construye en el cliente,
 * ANTES de cualquier llamada de red.
 */
import { EB2BRole } from '../enums/EB2BRole';
import { ELiquorCategory } from '../enums/ELiquorCategory';
import { WhatsAppE164 } from './WhatsAppE164';
import { ROICalculatorOutput } from '../roi/ROICalculatorOutput';

export interface B2BLeadFormPayload {
  /** Nombre del establecimiento — usado también como identificador legible en el CRM */
  establecimiento: string;
  /** Nombre del Tomador de Decisión — usado por el vendedor para generar rapport en la visita ("Buenas tardes, ¿usted es Laura?") */
  nombreTomadorDecision: string;
  /** Rol declarado del Tomador de Decisión — alimenta la priorización de follow-up (Sección 2) */
  rol: EB2BRole;
  /** WhatsApp en formato internacional E.164 — canal de seguimiento primario del equipo comercial */
  whatsapp: WhatsAppE164;
  /** Licores más vendidos en la carta — usado para personalizar el kit de cata físico que se lleva a la Demo Phygital */
  licoresDominantes: ELiquorCategory[];
  /**
   * Ganancia neta mensual que el usuario vio en la Calculadora de ROI justo
   * antes de enviar el formulario — el vendedor abre la conversación de la
   * Demo Phygital citando esta cifra exacta ("usted mismo calculó que podría
   * ganar $X al mes"), nunca un número genérico de la página.
   */
  roiEstimadoAlMomentoDelEnvio: ROICalculatorOutput;
}