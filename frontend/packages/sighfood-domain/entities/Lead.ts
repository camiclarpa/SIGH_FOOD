/**
 * ============================================================================
 * LEAD ENTITY ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â DIP: Entidad de Dominio sin Dependencias de Framework
 * ============================================================================
 * 
 * PRINCIPIO DIP (CapÃƒÆ’Ã‚Â­tulo 11):
 * ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
 * Uncle Bob formula el DIP como: los mÃƒÆ’Ã‚Â³dulos de mÃƒÆ’Ã‚Â¡s alto nivel (las polÃƒÆ’Ã‚Â­ticas,
 * las reglas de negocio) no deben depender de mÃƒÆ’Ã‚Â³dulos de mÃƒÆ’Ã‚Â¡s bajo nivel (los
 * detalles de implementaciÃƒÆ’Ã‚Â³n) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ambos deben depender de abstracciones.
 * 
 * APLICACIÃƒÆ’Ã¢â‚¬Å“N:
 *   Esta entidad NO importa React, Next.js, ni ningÃƒÆ’Ã‚Âºn SDK de CRM. PodrÃƒÆ’Ã‚Â­a
 *   compilarse y probarse con Node.js puro, sin ningÃƒÆ’Ã‚Âºn navegador ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â la prueba
 *   definitiva de que el DIP se cumpliÃƒÆ’Ã‚Â³ correctamente.
 * 
 * REFERENCIAS DEL LIBRO:
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ CapÃƒÆ’Ã‚Â­tulo 11: DIP ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Principio de InversiÃƒÆ’Ã‚Â³n de Dependencias
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ CapÃƒÆ’Ã‚Â­tulo 22: Entities ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Reglas de negocio empresariales
 *   ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ CapÃƒÆ’Ã‚Â­tulo 31: La Web Es un Detalle
 * 
 * DIRECCIÃƒÆ’Ã¢â‚¬Å“N DE DEPENDENCIA:
 *   React/Next.js ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬depende deÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¶ Interfaces del Dominio ÃƒÂ¢Ã¢â‚¬â€Ã¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬depende deÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ HubSpot Adapter
 *        (detalle)                 (LeadRepository,                          (detalle)
 *                                   ValidadorFormulario)
 * 
 *   NUNCA una flecha en sentido contrario ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â el dominio JAMÃƒÆ’Ã‚ÂS importa 'react',
 *   'next', ni el SDK de HubSpot.
 * ============================================================================
 */

export type RolTomadorDecision = 'DueÃƒÆ’Ã‚Â±o' | 'Gerente A&B' | 'Head Bartender';

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
  readonly timestamp: number;
}

/**
 * FunciÃƒÆ’Ã‚Â³n fÃƒÆ’Ã‚Â¡brica para crear un Lead validado
 * 
 * Esta funciÃƒÆ’Ã‚Â³n es pura y no depende de ningÃƒÆ’Ã‚Âºn framework ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â puede ejecutarse
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
    timestamp: Date.now(),
  });
}