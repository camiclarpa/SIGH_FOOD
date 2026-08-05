/**
 * ============================================================================
 * NOTIFICADOR LEAD — ISP: Interfaz Segregada para Notificación
 * ============================================================================
 * 
 * PRINCIPIO ISP (Capítulo 10):
 * ───────────────────────────────────────────────────────────────────────────
 * Un caso de uso que necesita notificar al lead después de guardarlo depende
 * SOLO de esta interfaz — no de métodos de validación o persistencia que
 * ya usó en pasos anteriores.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 10: ISP — Principio de Segregación de Interfaces
 * ============================================================================
 */

import { type Lead } from '../entities/Lead';

export interface NotificadorLead {
  /**
   * Envía una notificación de confirmación al lead.
   * 
   * @param lead - El lead que fue creado exitosamente
   */
  enviarConfirmacion(lead: Lead): Promise<void>;
}