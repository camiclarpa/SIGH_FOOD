/**
 * ============================================================================
 * LEAD REPOSITORY Ã¢â‚¬â€ ISP: Interfaz Segregada para Persistencia
 * ============================================================================
 * 
 * PRINCIPIO ISP (CapÃƒÂ­tulo 10):
 * Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * Uncle Bob advierte contra interfaces "gordas" que fuerzan a sus
 * implementadores o consumidores a depender de mÃƒÂ©todos que no usan Ã¢â‚¬â€
 * generando acoplamiento innecesario y recompilaciones/redespliegues no
 * relacionados con el cambio real.
 * 
 * APLICACIÃƒâ€œN:
 *   Esta interfaz SOLO expone el mÃƒÂ©todo guardar Ã¢â‚¬â€ no mezcla validaciÃƒÂ³n,
 *   notificaciÃƒÂ³n, ni generaciÃƒÂ³n de reportes. Un consumidor que solo necesita
 *   guardar un Lead no depende de mÃƒÂ©todos que no usa.
 * 
 * REFERENCIAS DEL LIBRO:
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 10: ISP Ã¢â‚¬â€ Principio de SegregaciÃƒÂ³n de Interfaces
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 11: DIP Ã¢â‚¬â€ Principio de InversiÃƒÂ³n de Dependencias
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