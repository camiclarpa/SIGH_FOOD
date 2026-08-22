// Tipos del embudo, sin base de datos: el componente que mide es de cliente.
export type Evento =
  | 'vio_catalogo'
  | 'vio_producto'
  | 'anadio_carrito'
  | 'inicio_checkout'
  | 'pago';

export const PASOS: Evento[] = [
  'vio_catalogo',
  'vio_producto',
  'anadio_carrito',
  'inicio_checkout',
  'pago',
];

export const ETIQUETAS_PASO: Record<Evento, string> = {
  vio_catalogo: 'Vio el catálogo',
  vio_producto: 'Abrió un producto',
  anadio_carrito: 'Añadió al carrito',
  inicio_checkout: 'Empezó el checkout',
  pago: 'Confirmó el pedido',
};
