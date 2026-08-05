/**
 * ============================================================================
 * VALIDADOR FORMULARIO — ISP: Interfaz Segregada para Validación
 * ============================================================================
 * 
 * PRINCIPIO ISP (Capítulo 10):
 * ───────────────────────────────────────────────────────────────────────────
 * Un componente de formulario SOLO depende de ValidadorFormulario — nunca
 * se acopla a métodos de notificación o generación de reportes que no le
 * conciernen.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 10: ISP — Principio de Segregación de Interfaces
 * ============================================================================
 */

import { type FormularioLeadInput, type ResultadoValidacion } from '../rules/validarFormularioLead';

export interface ValidadorFormulario {
  /**
   * Valida los datos de un formulario de lead.
   * 
   * @param datos - Los datos del formulario a validar
   * @returns Resultado de la validación con lista de errores
   */
  validar(datos: FormularioLeadInput): ResultadoValidacion;
}