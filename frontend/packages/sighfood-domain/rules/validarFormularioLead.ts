/**
 * ============================================================================
 * VALIDAR FORMULARIO LEAD â€” SRP: Responsabilidad Ãšnica de ValidaciÃ³n
 * ============================================================================
 * 
 * PRINCIPIO SRP (CapÃ­tulo 7):
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Este mÃ³dulo tiene UNA sola razÃ³n para cambiar: si el equipo Comercial de
 * SIGH_FOOD modifica las reglas de calificaciÃ³n de un Lead (campos obligatorios,
 * formato de WhatsApp, licores vÃ¡lidos).
 * 
 * NO cambia por:
 *   â€¢ Cambios en la fÃ³rmula de ROI (responsabilidad de Finanzas)
 *   â€¢ Cambios de diseÃ±o visual del formulario (responsabilidad de UX)
 *   â€¢ Cambios en cÃ³mo se guarda el Lead (responsabilidad tÃ©cnica)
 * 
 * REFERENCIAS DEL LIBRO:
 *   â€¢ CapÃ­tulo 7: SRP â€” Principio de Responsabilidad Ãšnica
 *   â€¢ CapÃ­tulo 3-4: ProgramaciÃ³n Estructurada (secuencia, selecciÃ³n, iteraciÃ³n)
 * ============================================================================
 */

export interface FormularioLeadInput {
  establecimiento: string;
  tomadorDecision: {
    nombre: string;
    rol: 'DueÃ±o' | 'Gerente A&B' | 'Head Bartender';
  };
  whatsapp: string;
  licoresDominantes: string[];
  ciudad?: string;
}

export interface ResultadoValidacion {
  esValido: boolean;
  readonly errores: readonly string[];
}

const ROLES_VALIDOS = ['DueÃ±o', 'Gerente A&B', 'Head Bartender'] as const;
const LICORES_VALIDOS = ['Mezcal', 'Tequila', 'Bourbon', 'Whisky', 'Gin', 'Vino', 'Ron'] as const;

export function validarFormularioLead(datos: FormularioLeadInput): ResultadoValidacion {
  const errores: string[] = [];

  // ValidaciÃ³n del establecimiento
  if (!datos.establecimiento || datos.establecimiento.trim().length === 0) {
    errores.push('El nombre del establecimiento es obligatorio.');
  } else if (datos.establecimiento.trim().length < 3) {
    errores.push('El nombre del establecimiento debe tener al menos 3 caracteres.');
  }

  // ValidaciÃ³n del tomador de decisiÃ³n
  if (!datos.tomadorDecision) {
    errores.push('Los datos del tomador de decisiÃ³n son obligatorios.');
  } else {
    if (!datos.tomadorDecision.nombre || datos.tomadorDecision.nombre.trim().length === 0) {
      errores.push('El nombre del tomador de decisiÃ³n es obligatorio.');
    }

    if (!ROLES_VALIDOS.includes(datos.tomadorDecision.rol)) {
      errores.push(`El rol "${datos.tomadorDecision.rol}" no es vÃ¡lido.`);
    }
  }

  // ValidaciÃ³n del WhatsApp
  if (!datos.whatsapp || !/^\+?[0-9]{10,13}$/.test(datos.whatsapp)) {
    errores.push('El nÃºmero de WhatsApp no tiene un formato vÃ¡lido.');
  }

  // ValidaciÃ³n de licores dominantes
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