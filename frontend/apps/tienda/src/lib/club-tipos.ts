// =============================================================================
// Club: constantes y tipos — SIN base de datos
// =============================================================================
//
// La pantalla de cuenta es un componente de cliente y necesita estas formas y
// SELLOS_PARA_PREMIO para pintar la tarjeta de sellos. Importarlas de club.ts
// arrastraría postgres al navegador — el mismo fallo que ya rompió un
// despliegue del CRM y que el guard de cliente-servidor vigila desde entonces.

/**
 * Un sello por pedido entregado. Diez sellos, un cono gratis.
 *
 * Sellos y no solo puntos porque la barra de progreso es lo que genera hábito:
 * "me faltan dos" mueve más que "tengo 340 puntos", que no significa nada sin
 * una tabla de equivalencias delante.
 */
export const SELLOS_PARA_PREMIO = 10;

/** Puntos por cada mil pesos gastados. */
export const PUNTOS_POR_MIL = 1;

export interface EstadoClub {
  puntos: number;
  pedidosEntregados: number;
  sellos: number;
  faltan: number;
  tienePremio: boolean;
}

export interface PedidoResumen {
  id: string;
  codigo: string;
  estado: string;
  totalCOP: number;
  createdAt: Date | null;
  items: Array<{ nombre: string; cantidad: number }>;
}

export interface LineaRecompra {
  slug: string;
  nombre: string;
  imagen: string | null;
  precioCOP: number;
  cantidad: number;
  opciones: Array<{ id: string; grupo: string; etiqueta: string; sobreprecioCOP: number }>;
  disponible: boolean;
}

/** Lo que necesita la pantalla de cuenta sobre quién eres. */
export interface Identidad {
  consumerId: string;
  telefono: string;
  nombre: string | null;
  puntos: number;
}
