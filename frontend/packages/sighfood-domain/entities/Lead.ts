/**
 * ============================================================================
 * LEAD ENTITY — DIP: Entidad de Dominio sin Dependencias de Framework
 * ============================================================================
 * 
 * PRINCIPIO DIP (Capítulo 11):
 * ───────────────────────────────────────────────────────────────────────────
 * Uncle Bob formula el DIP como: los módulos de más alto nivel (las políticas,
 * las reglas de negocio) no deben depender de módulos de más bajo nivel (los
 * detalles de implementación) — ambos deben depender de abstracciones.
 * 
 * APLICACIÓN:
 *   Esta entidad NO importa React, Next.js, ni ningún SDK de CRM. Podría
 *   compilarse y probarse con Node.js puro, sin ningún navegador — la prueba
 *   definitiva de que el DIP se cumplió correctamente.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 11: DIP — Principio de Inversión de Dependencias
 *   • Capítulo 22: Entities — Reglas de negocio empresariales
 *   • Capítulo 31: La Web Es un Detalle
 * 
 * DIRECCIÓN DE DEPENDENCIA:
 *   React/Next.js ─depende de──▶ Interfaces del Dominio ◀──depende de── HubSpot Adapter
 *        (detalle)                 (LeadRepository,                          (detalle)
 *                                   ValidadorFormulario)
 * 
 *   NUNCA una flecha en sentido contrario — el dominio JAMÁS importa 'react',
 *   'next', ni el SDK de HubSpot.
 * ============================================================================
 */

export type RolTomadorDecision = 'Dueño' | 'Gerente A&B' | 'Head Bartender';

export interface TomadorDecision {
  readonly nombre: string;
  readonly rol: RolTomadorDecision;
}

export interface Lead {
  readonly establecimiento: string;
  readonly tomadorDecision: TomadorDecision;
  readonly whatsapp: string;
  readonly licoresDominantes: readonly string[];
  readonly ciudad?: string;
  readonly fechaCreacion?: Date;
}

/**
 * Función fábrica para crear un Lead validado
 * 
 * Esta función es pura y no depende de ningún framework — puede ejecutarse
 * en cualquier entorno (Node.js, navegador, test unitario).
 */
export function crearLead(
  establecimiento: string,
  tomadorDecision: TomadorDecision,
  whatsapp: string,
  licoresDominantes: readonly string[],
  ciudad?: string
): Lead {
  return Object.freeze({
    establecimiento,
    tomadorDecision: Object.freeze(tomadorDecision),
    whatsapp,
    licoresDominantes: Object.freeze([...licoresDominantes]),
    ciudad,
    fechaCreacion: new Date(),
  });
}