/**
 * ============================================================================
 * VALIDAR FORMULARIO LEAD Ã¢â‚¬â€ SRP: Responsabilidad ÃƒÅ¡nica de ValidaciÃƒÂ³n
 * ============================================================================
 * 
 * PRINCIPIO SRP (CapÃƒÂ­tulo 7):
 * Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
 * Este mÃƒÂ³dulo tiene UNA sola razÃƒÂ³n para cambiar: si el equipo Comercial de
 * SIGH_FOOD modifica las reglas de calificaciÃƒÂ³n de un Lead (campos obligatorios,
 * formato de WhatsApp, licores vÃƒÂ¡lidos).
 * 
 * NO cambia por:
 *   Ã¢â‚¬Â¢ Cambios en la fÃƒÂ³rmula de ROI (responsabilidad de Finanzas)
 *   Ã¢â‚¬Â¢ Cambios de diseÃƒÂ±o visual del formulario (responsabilidad de UX)
 *   Ã¢â‚¬Â¢ Cambios en cÃƒÂ³mo se guarda el Lead (responsabilidad tÃƒÂ©cnica)
 * 
 * REFERENCIAS DEL LIBRO:
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 7: SRP Ã¢â‚¬â€ Principio de Responsabilidad ÃƒÅ¡nica
 *   Ã¢â‚¬Â¢ CapÃƒÂ­tulo 3-4: ProgramaciÃƒÂ³n Estructurada (secuencia, selecciÃƒÂ³n, iteraciÃƒÂ³n)
 * ============================================================================
 */

export interface FormularioLeadInput {
  establecimiento: string;
  tomadorDecision: {
    nombre: string;
    rol: 'Dueño' | 'Gerente A&B' | 'Head Bartender' | 'Gerente A&B' | 'Head Bartender';
  };
  whatsapp: string;
  licoresDominantes: string[];
  ciudad?: string;
}

export interface ResultadoValidacion {
  esValido: boolean;
  readonly errores: readonly string[];
}

const ROLES_VALIDOS = ['DueÃƒÂ±o', 'Gerente A&B', 'Head Bartender'] as const;
const LICORES_VALIDOS = ['Mezcal', 'Tequila', 'Bourbon', 'Whisky', 'Gin', 'Vino', 'Ron'] as const;

export function validarFormularioLead(datos: FormularioLeadInput): ResultadoValidacion {
  const errores: string[] = [];

  // ValidaciÃƒÂ³n del establecimiento
  if (!datos.establecimiento || datos.establecimiento.trim().length === 0) {
    errores.push('El nombre del establecimiento es obligatorio.');
  } else if (datos.establecimiento.trim().length < 3) {
    errores.push('El nombre del establecimiento debe tener al menos 3 caracteres.');
  }

  // ValidaciÃƒÂ³n del tomador de decisiÃƒÂ³n
  if (!datos.tomadorDecision) {
    errores.push('Los datos del tomador de decisiÃƒÂ³n son obligatorios.');
  } else {
    if (!datos.tomadorDecision.nombre || datos.tomadorDecision.nombre.trim().length === 0) {
      errores.push('El nombre del tomador de decisiÃƒÂ³n es obligatorio.');
    }

    if (!ROLES_VALIDOS.includes(datos.tomadorDecision.rol)) {
      errores.push(`El rol "${datos.tomadorDecision.rol}" no es vÃƒÂ¡lido.`);
    }
  }

  // ValidaciÃƒÂ³n del WhatsApp
  if (!datos.whatsapp || !/^\+?[0-9]{10,13}$/.test(datos.whatsapp)) {
    errores.push('El nÃƒÂºmero de WhatsApp no tiene un formato vÃƒÂ¡lido.');
  }

  // ValidaciÃƒÂ³n de licores dominantes
  if (!datos.licoresDominantes || datos.licoresDominantes.length === 0) {
    errores.push('Debe declarar al menos un licor dominante.');
  } else {
    for (const licor of datos.licoresDominantes) {
      if (!LICORES_VALIDOS.includes(licor as typeof LICORES_VALIDOS[number])) {
        errores.push(`"${licor}" no es un licor reconocido.`);
      }
    }
  }

  return Object.freeze({
    esValido: errores.length === 0,
    errores: Object.freeze([...errores]),
  });
}