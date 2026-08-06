/**
 * ============================================================================
 * LEAD ENTITY Ã¢â‚¬â€ DIP: Entidad de Dominio sin Dependencias de Framework
 * ============================================================================
 * 
 * PRINCIPIO DIP (CapÃƒÂ­tulo 11):
 * Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * Uncle Bob formula el DIP como: los mÃƒÂ³dulos de mÃƒÂ¡s alto nivel (las polÃƒÂ­ticas,
 * las reglas de negocio) no deben depender de mÃƒÂ³dulos de mÃƒÂ¡s bajo nivel (los
 * detalles de implementaciÃƒÂ³n) Ã¢â‚¬â€ ambos deben depender de abstracciones.
 * 
 * APLICACIÃƒâ€œN:
 *   Esta entidad NO importa React, Next.js, ni ningÃƒÂºn SDK de CRM. PodrÃƒÂ­a
 *   compilarse y probarse con Node.js puro, sin ningÃƒÂºn navegador Ã¢â‚¬â€ la prueba
 *   definitiva de que el DIP se cumpliÃƒÂ³ correctamente.
 * 
 * REFERENCIAS DEL LIBRO:
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 11: DIP Ã¢â‚¬â€ Principio de InversiÃƒÂ³n de Dependencias
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 22: Entities Ã¢â‚¬â€ Reglas de negocio empresariales
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 31: La Web Es un Detalle
 * 
 * DIRECCIÃƒâ€œN DE DEPENDENCIA:
 *   React/Next.js Ã¢â€â‚¬depende deÃ¢â€â‚¬Ã¢â€â‚¬Ã¢â€“Â¶ Interfaces del Dominio Ã¢â€”â‚¬Ã¢â€â‚¬Ã¢â€â‚¬depende deÃ¢â€â‚¬Ã¢â€â‚¬ HubSpot Adapter
 *        (detalle)                 (LeadRepository,                          (detalle)
 *                                   ValidadorFormulario)
 * 
 *   NUNCA una flecha en sentido contrario Ã¢â‚¬â€ el dominio JAMÃƒÂS importa 'react',
 *   'next', ni el SDK de HubSpot.
 * ============================================================================
 */

export type RolTomadorDecision = 'DueÃƒÂ±o' | 'Gerente A&B' | 'Head Bartender';

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
 * FunciÃƒÂ³n fÃƒÂ¡brica para crear un Lead validado
 * 
 * Esta funciÃƒÂ³n es pura y no depende de ningÃƒÂºn framework Ã¢â‚¬â€ puede ejecutarse
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