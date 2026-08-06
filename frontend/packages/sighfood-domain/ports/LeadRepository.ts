/**
 * ============================================================================
 * LEAD REPOSITORY — ISP: Interfaz Segregada para Persistencia
 * ============================================================================
 * 
 * PRINCIPIO ISP (Capítulo 10):
 * ───────────────────────────────────────────────────────────────────────────
 * Uncle Bob advierte contra interfaces "gordas" que fuerzan a sus
 * implementadores o consumidores a depender de métodos que no usan —
 * generando acoplamiento innecesario y recompilaciones/redespliegues no
 * relacionados con el cambio real.
 * 
 * APLICACIÓN:
 *   Esta interfaz SOLO expone el método guardar — no mezcla validación,
 *   notificación, ni generación de reportes. Un consumidor que solo necesita
 *   guardar un Lead no depende de métodos que no usa.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 10: ISP — Principio de Segregación de Interfaces
 *   • Capítulo 11: DIP — Principio de Inversión de Dependencias
 * ============================================================================
 */

import { type Lead } from '../entities/Lead';
export { type Lead } from '../entities/Lead';

export interface LeadRepository {
  /**
   * Guarda un lead en el sistema de destino.
   * 
   * @param lead - El lead a guardar
   * @throws Error si el lead no se puede guardar
   */
  guardar(lead: Lead): Promise<void>;
}