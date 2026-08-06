/**
 * ============================================================================
 * LEAD REPOSITORY â€” ISP: Interfaz Segregada para Persistencia
 * ============================================================================
 * 
 * PRINCIPIO ISP (CapÃ­tulo 10):
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Uncle Bob advierte contra interfaces "gordas" que fuerzan a sus
 * implementadores o consumidores a depender de mÃ©todos que no usan â€”
 * generando acoplamiento innecesario y recompilaciones/redespliegues no
 * relacionados con el cambio real.
 * 
 * APLICACIÃ“N:
 *   Esta interfaz SOLO expone el mÃ©todo guardar â€” no mezcla validaciÃ³n,
 *   notificaciÃ³n, ni generaciÃ³n de reportes. Un consumidor que solo necesita
 *   guardar un Lead no depende de mÃ©todos que no usa.
 * 
 * REFERENCIAS DEL LIBRO:
 *   â€¢ CapÃ­tulo 10: ISP â€” Principio de SegregaciÃ³n de Interfaces
 *   â€¢ CapÃ­tulo 11: DIP â€” Principio de InversiÃ³n de Dependencias
 * ============================================================================
 */

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