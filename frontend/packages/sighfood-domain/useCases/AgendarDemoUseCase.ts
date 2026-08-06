/**
 * ============================================================================
 * AGENDAR DEMO USE CASE — DIP: Caso de Uso que Depende de Abstracciones
 * ============================================================================
 * 
 * PRINCIPIO DIP (Capítulo 11):
 * ───────────────────────────────────────────────────────────────────────────
 * Este caso de uso SOLO conoce las abstracciones (interfaces) — nunca
 * importa implementaciones concretas como HubSpotLeadRepository o componentes
 * de React.
 * 
 * Si mañana migramos de HubSpot a Pipedrive, SOLO cambiamos la implementación
 * del repositorio — este caso de uso no se toca.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 11: DIP — Principio de Inversión de Dependencias
 *   • Capítulo 22: Use Cases — Reglas de negocio específicas de la aplicación
 * ============================================================================
 */

import { type Lead } from '../entities/Lead';
import { type LeadRepository } from '../ports/LeadRepository';
import { type ValidadorFormulario } from '../ports/ValidadorFormulario';
import { type FormularioLeadInput } from '../rules/validarFormularioLead';

export interface ResultadoAgendamiento {
  readonly exito: boolean;
  readonly errores: readonly string[];
  readonly leadId?: string;
}

/**
 * Caso de Uso: Agendar Demo Phygital
 * 
 * Este módulo orquesta el flujo completo:
 *   1. Validar datos del formulario
 *   2. Crear entidad Lead
 *   3. Guardar en el repositorio
 * 
 * NO sabe CÓMO se guarda (HubSpot, Pipedrive, base de datos propia) — solo
 * depende de la abstracción LeadRepository.
 */
export class AgendarDemoUseCase {
  constructor(
    private readonly repositorio: LeadRepository,
    private readonly validador: ValidadorFormulario
  ) {}

  async ejecutar(datos: FormularioLeadInput): Promise<ResultadoAgendamiento> {
    // Paso 1: Validar
    const validacion = this.validador.validar(datos);
    if (!validacion.esValido) {
      return {
        exito: false,
        errores: Object.freeze([...validacion.errores]),
      };
    }

    // Paso 2: Crear entidad Lead
    const lead: Lead = {
      establecimiento: datos.establecimiento,
      tomadorDecision: {
        nombre: datos.tomadorDecision.nombre,
        rol: datos.tomadorDecision.rol,
      },
      whatsapp: datos.whatsapp,
      licoresDominantes: [...datos.licoresDominantes],
      ciudad: datos.ciudad,
      fechaCreacion: new Date(),
      timestamp: Date.now(),
    };

    // Paso 3: Guardar
    try {
      await this.repositorio.guardar(lead);
      return {
        exito: true,
        errores: Object.freeze([]),
        leadId: `${Date.now()}-${datos.whatsapp}`,
      };
    } catch (error) {
      return {
        exito: false,
        errores: Object.freeze([
          error instanceof Error ? error.message : 'Error al guardar el lead',
        ]),
      };
    }
  }
}