/**
 * ============================================================================
 * VALIDAR FORMULARIO LEAD — SRP: Responsabilidad Única de Validación
 * ============================================================================
 * 
 * PRINCIPIO SRP (Capítulo 7):
 * ───────────────────────────────────────────────────────────────────────────
 * Este módulo tiene UNA sola razón para cambiar: si el equipo Comercial de
 * SIGH_FOOD modifica las reglas de calificación de un Lead (campos obligatorios,
 * formato de WhatsApp, licores válidos).
 * 
 * NO cambia por:
 *   • Cambios en la fórmula de ROI (responsabilidad de Finanzas)
 *   • Cambios de diseño visual del formulario (responsabilidad de UX)
 *   • Cambios en cómo se guarda el Lead (responsabilidad técnica)
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 7: SRP — Principio de Responsabilidad Única
 *   • Capítulo 3-4: Programación Estructurada (secuencia, selección, iteración)
 * ============================================================================
 */

export interface FormularioLeadInput {
  establecimiento: string;
  tomadorDecision: {
    nombre: string;
    rol: 'Dueño' | 'Gerente A&B' | 'Head Bartender';
  };
  whatsapp: string;
  licoresDominantes: string[];
  ciudad?: string;
}

export interface ResultadoValidacion {
  esValido: boolean;
  readonly errores: readonly string[];
}

const ROLES_VALIDOS = ['Dueño', 'Gerente A&B', 'Head Bartender'] as const;
const LICORES_VALIDOS = ['Mezcal', 'Tequila', 'Bourbon', 'Whisky', 'Gin', 'Vino', 'Ron'] as const;

export function validarFormularioLead(datos: FormularioLeadInput): ResultadoValidacion {
  const errores: string[] = [];

  // Validación del establecimiento
  if (!datos.establecimiento || datos.establecimiento.trim().length === 0) {
    errores.push('El nombre del establecimiento es obligatorio.');
  } else if (datos.establecimiento.trim().length < 3) {
    errores.push('El nombre del establecimiento debe tener al menos 3 caracteres.');
  }

  // Validación del tomador de decisión
  if (!datos.tomadorDecision) {
    errores.push('Los datos del tomador de decisión son obligatorios.');
  } else {
    if (!datos.tomadorDecision.nombre || datos.tomadorDecision.nombre.trim().length === 0) {
      errores.push('El nombre del tomador de decisión es obligatorio.');
    }

    if (!ROLES_VALIDOS.includes(datos.tomadorDecision.rol)) {
      errores.push(`El rol "${datos.tomadorDecision.rol}" no es válido.`);
    }
  }

  // Validación del WhatsApp
  if (!datos.whatsapp || !/^\+?[0-9]{10,13}$/.test(datos.whatsapp)) {
    errores.push('El número de WhatsApp no tiene un formato válido.');
  }

  // Validación de licores dominantes
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