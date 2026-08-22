// =============================================================================
// Máquina de estados de un pedido
// =============================================================================
//
// SIN NINGÚN IMPORT DE BASE DE DATOS, y eso es el punto del archivo.
//
// Esta lógica la necesitan las dos orillas: el servidor para validar el salto
// antes de escribirlo, y la comanda —que es un componente de cliente— para
// saber qué botón pintar. Cuando vivía junto a las consultas, el paquete del
// navegador intentaba arrastrar postgres detrás y el build de producción moría
// con "Module not found". El typecheck y `next dev` no lo detectan: solo
// aparece al compilar para producción.
//
// La regla que implementa tiene consecuencias físicas: un pedido "entregado"
// que vuelve a "preparando" hace que la cocina prepare dos veces lo mismo, y un
// salto de "recibido" a "entregado" borra la comanda antes de que nadie cocine.

export type EstadoPedido =
  | 'recibido'
  | 'confirmado'
  | 'preparando'
  | 'listo'
  | 'en_camino'
  | 'entregado'
  | 'cancelado';

/** Orden real del flujo. El índice ES la regla de avance. */
const FLUJO: EstadoPedido[] = [
  'recibido',
  'confirmado',
  'preparando',
  'listo',
  'en_camino',
  'entregado',
];

/**
 * A qué estados se puede pasar desde uno dado.
 *
 * Vive aquí y no en la interfaz para que la regla no dependa de qué botones se
 * pintaron: la pantalla puede quedarse desactualizada en una pestaña abierta
 * desde hace media hora, el servidor no.
 */
export function siguientesDe(estado: EstadoPedido, tipoEntrega: string): EstadoPedido[] {
  if (estado === 'entregado' || estado === 'cancelado') return [];

  const flujo = tipoEntrega === 'recoger' ? FLUJO.filter((e) => e !== 'en_camino') : FLUJO;
  const i = flujo.indexOf(estado);
  const siguiente = i >= 0 && i < flujo.length - 1 ? [flujo[i + 1]] : [];

  return [...siguiente, 'cancelado'];
}
