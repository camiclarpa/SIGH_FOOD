import type { B2BLeadFormPayloadInferred } from '../../domain/leads/B2BLeadFormPayload';
/**
 * lib/resiliency/formState.ts
 *
 * Máquina de Estados del Formulario
 * RFC-003 Sección 4.1
 *
 * Discriminated union para exhaustividad en el renderizado — el compilador
 * TypeScript garantiza que cada estado se maneje explícitamente, evitando
 * el bug clásico de "estado imposible" donde el UI muestra un spinner
 * después de que el formulario ya fue enviado exitosamente.
 *
 * Principio de UX aplicado (RFC-003 Sección 4.3):
 *   El estado 'degraded-success' es indistinguible del 'success' normal
 *   para el usuario — la diferencia solo importa para observabilidad
 *   del equipo de ingeniería (Sección 5).
 */

/**
 * Estado inicial — el formulario está listo para ser completado.
 * No hay envío en curso ni resultado previo.
 */
export type EstadoIdle = {
  tipo: 'idle';
};

/**
 * Estado de carga — el envío está en curso (intento primario o reintento).
 * La UI debe mostrar un spinner y deshabilitar el botón de envío.
 */
export type EstadoLoading = {
  tipo: 'loading';
};

/**
 * Estado de éxito — el envío primario tuvo éxito (202 Accepted).
 * leadId: identificador único del Lead, usado para idempotencia en reintentos.
 */
export type EstadoSuccess = {
  tipo: 'success';
  leadId: string;
};

/**
 * Estado de éxito degradado — el envío tuvo éxito, pero requirió reintentos
 * (Estrategia B: backoff exponencial). Para el usuario es indistinguible
 * del éxito normal, pero se registra para observabilidad.
 *
 * RFC-003 Sección 4.3: "el estado degraded-success es indistinguible del
 * success normal para el usuario — la diferencia solo importa para
 * observabilidad del equipo de ingeniería".
 *
 * intentosNecesarios: cuántos reintentos fueron necesarios antes del éxito.
 */
export type EstadoDegradedSuccess = {
  tipo: 'degraded-success';
  leadId: string;
  intentosNecesarios: number;
};

/**
 * Estado de fallback requerido — las Estrategias A y B se agotaron.
 * Se presenta al usuario el botón de WhatsApp con datos pre-llenados
 * (Estrategia C).
 *
 * enlaceWhatsApp: URL construida por construirEnlaceWhatsAppFallback()
 * con todos los campos del formulario ya codificados.
 */
export type EstadoFallbackRequired = {
  tipo: 'fallback-required';
  payload: B2BLeadFormPayloadInferred;
  leadId: string;
  enlaceWhatsApp: string;
};

/**
 * Discriminated union completa — el compilador TypeScript garantiza
 * exhaustividad en el switch de renderizado.
 */
export type EstadoEnvioFormulario =
  | EstadoIdle
  | EstadoLoading
  | EstadoSuccess
  | EstadoDegradedSuccess
  | EstadoFallbackRequired;

/**
 * Type guard para verificar el tipo de estado — útil en tests y en
 * lógica condicional fuera del renderizado.
 */
export function esEstadoExito(estado: EstadoEnvioFormulario): boolean {
  return estado.tipo === 'success' || estado.tipo === 'degraded-success';
}

export function esEstadoFinal(estado: EstadoEnvioFormulario): boolean {
  return (
    estado.tipo === 'success' ||
    estado.tipo === 'degraded-success' ||
    estado.tipo === 'fallback-required'
  );
}