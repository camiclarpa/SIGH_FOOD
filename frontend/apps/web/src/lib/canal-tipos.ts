// =============================================================================
// Qué categorías de plantilla pueden salir por WhatsApp
// =============================================================================
//
// Archivo aparte de lib/canal.ts, y no por gusto: aquel importa la base de datos
// para mirar la ventana de 24 h y las suscripciones. Esta regla —la que impide
// el error 131042— no necesita nada de eso, y mezclarlas obligaría a levantar
// una base entera para comprobar una lista de tres elementos.
//
// Es el mismo motivo por el que existen envio.ts y club-tipos.ts: lo que un
// componente de cliente o una prueba necesita saber, separado de lo que solo
// puede correr en el servidor.

/** Cómo clasifica Meta la plantilla de una secuencia. null = sin averiguar. */
export type CategoriaMeta = 'utilidad' | 'marketing' | 'autenticacion' | null;

/** Los tres caminos posibles, más la ausencia de camino. */
export type Canal = 'whatsapp_texto' | 'push' | 'whatsapp_plantilla' | 'ninguno';

/**
 * Qué categorías pueden salir por WhatsApp.
 *
 * MARKETING no está, y esa ausencia es el archivo entero: Meta cobra esas
 * plantillas y sin tarjeta registrada las rechaza con el error 131042 — en el
 * momento del envío, sin aviso previo, dejando la secuencia con aspecto de rota.
 *
 * Autenticación sí entra: los códigos de acceso son gratuitos y además no tienen
 * alternativa, porque si no llegan la persona no puede entrar a su cuenta.
 */
export const CATEGORIAS_ENVIABLES: ReadonlyArray<Exclude<CategoriaMeta, null>> = [
  'utilidad',
  'autenticacion',
];

/**
 * `null` devuelve false a propósito.
 *
 * Significa que todavía no se ha preguntado a Meta cómo clasifica esa plantilla.
 * Darla por gratuita es exactamente el error que produce el 131042: falla del
 * lado seguro y ese contenido sale por Web Push.
 */
export function puedeSalirPorWhatsapp(categoria: CategoriaMeta): boolean {
  return categoria !== null && CATEGORIAS_ENVIABLES.includes(categoria);
}
