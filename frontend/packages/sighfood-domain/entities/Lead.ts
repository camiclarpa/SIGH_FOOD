/**
 * ============================================================================
 * LEAD ENTITY â€” DIP: Entidad de Dominio sin Dependencias de Framework
 * ============================================================================
 * 
 * PRINCIPIO DIP (CapÃ­tulo 11):
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Uncle Bob formula el DIP como: los mÃ³dulos de mÃ¡s alto nivel (las polÃ­ticas,
 * las reglas de negocio) no deben depender de mÃ³dulos de mÃ¡s bajo nivel (los
 * detalles de implementaciÃ³n) â€” ambos deben depender de abstracciones.
 * 
 * APLICACIÃ“N:
 *   Esta entidad NO importa React, Next.js, ni ningÃºn SDK de CRM. PodrÃ­a
 *   compilarse y probarse con Node.js puro, sin ningÃºn navegador â€” la prueba
 *   definitiva de que el DIP se cumpliÃ³ correctamente.
 * 
 * REFERENCIAS DEL LIBRO:
 *   â€¢ CapÃ­tulo 11: DIP â€” Principio de InversiÃ³n de Dependencias
 *   â€¢ CapÃ­tulo 22: Entities â€” Reglas de negocio empresariales
 *   â€¢ CapÃ­tulo 31: La Web Es un Detalle
 * 
 * DIRECCIÃ“N DE DEPENDENCIA:
 *   React/Next.js â”€depende deâ”€â”€â–¶ Interfaces del Dominio â—€â”€â”€depende deâ”€â”€ HubSpot Adapter
 *        (detalle)                 (LeadRepository,                          (detalle)
 *                                   ValidadorFormulario)
 * 
 *   NUNCA una flecha en sentido contrario â€” el dominio JAMÃS importa 'react',
 *   'next', ni el SDK de HubSpot.
 * ============================================================================
 */

export type RolTomadorDecision = 'DueÃ±o' | 'Gerente A&B' | 'Head Bartender';

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
  readonly timestamp?: number;
}

/**
 * FunciÃ³n fÃ¡brica para crear un Lead validado
 * 
 * Esta funciÃ³n es pura y no depende de ningÃºn framework â€” puede ejecutarse
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