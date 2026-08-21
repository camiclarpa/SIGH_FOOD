// =============================================================================
// Plantillas de mensajería: variables y validación
// =============================================================================
//
// Vive fuera de acciones/campanas.ts porque aquel archivo lleva 'use server', y
// ahí Next exige que TODO lo exportado sea una función async. Una constante o un
// ayudante síncrono rompen el build con "Server Actions must be async
// functions", y el error señala la línea del export, no la directiva.
//
// Separarlo tiene además una ventaja: el componente cliente del editor importa
// las variables sin arrastrar consigo las acciones de servidor.

/**
 * Variables que se pueden usar en una plantilla.
 *
 * La lista es cerrada a propósito: un `{{descuento}}` que nadie sustituye viaja
 * tal cual al WhatsApp del comensal, y ese error solo se ve cuando ya se envió.
 */
export const VARIABLES = [
  { clave: 'nombre', descripcion: 'Nombre del comensal' },
  { clave: 'puntos', descripcion: 'Saldo de puntos' },
  { clave: 'nivel', descripcion: 'Nivel del pasaporte' },
  { clave: 'linea', descripcion: 'Su línea sensorial favorita' },
  { clave: 'bar', descripcion: 'Último bar donde consumió' },
  { clave: 'zona', descripcion: 'Zona de ese bar' },
  { clave: 'dias', descripcion: 'Días desde su último momento' },
  { clave: 'momentos', descripcion: 'Cuántos momentos lleva' },
] as const;

// Tipado como Set<string> a propósito: `VARIABLES` es `as const`, y sin esto
// TypeScript exigiría que lo consultado fuera una de las ocho claves literales
// — justo lo contrario de lo que busca `variablesDesconocidas`.
const CLAVES: ReadonlySet<string> = new Set<string>(VARIABLES.map((v) => v.clave));

/** Variables usadas en una plantilla que no existen. */
export function variablesDesconocidas(plantilla: string): string[] {
  const usadas = [...plantilla.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  return [...new Set(usadas.filter((u) => !CLAVES.has(u)))];
}

/** Sustituye las variables por los datos reales de un comensal. */
export function rellenarPlantilla(plantilla: string, datos: Record<string, string>): string {
  return plantilla.replace(/\{\{(\w+)\}\}/g, (completo, clave) => datos[clave] ?? completo);
}

// -----------------------------------------------------------------------------
// Plantillas aprobadas en Meta
// -----------------------------------------------------------------------------
//
// Hay dos plantillas por secuencia y conviene no confundirlas:
//
//   · `template`  — el texto del CRM, con {{nombre}}. Es lo que se ve en la
//     vista previa y lo que se envía DENTRO de la ventana de 24 h.
//   · la de Meta  — aprobada de antemano, identificada por su nombre y con
//     huecos NUMERADOS. Es lo único que WhatsApp entrega FUERA de esa ventana.
//
// Una secuencia de WhatsApp sin la segunda se puede guardar, pero no enviar.

export interface SecuenciaEnviable {
  channel: string | null;
  metaTemplateName?: string | null;
  metaTemplateVars?: string[] | null;
}

/**
 * Por qué una secuencia no puede activarse, o null si sí puede.
 *
 * Devuelve el motivo en vez de un booleano para que la interfaz pueda decirlo
 * antes de intentarlo: una campaña que se deja activar y luego no manda nada es
 * el peor fallo posible, porque es silencioso.
 *
 * Vive aquí, y no dentro de la acción de servidor, para que el editor la use sin
 * arrastrar el acceso a la base y para poder probarla sin sesión ni base.
 */
export function motivoNoEnviable(s: SecuenciaEnviable): string | null {
  // Los demás canales no pasan por la pasarela de Meta y no les aplica.
  if (s.channel !== 'whatsapp') return null;

  if (!s.metaTemplateName?.trim()) {
    return 'Falta el nombre de la plantilla aprobada en Meta. ' +
      'Sin ella, WhatsApp no entrega nada fuera de la ventana de 24 h.';
  }

  const malas = (s.metaTemplateVars ?? []).filter((v) => !CLAVES.has(v));
  if (malas.length > 0) {
    return `Los huecos ${malas.join(', ')} no son variables del CRM: ` +
      'llegarían al comensal como un guion.';
  }

  return null;
}
