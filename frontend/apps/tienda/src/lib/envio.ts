/**
 * Constantes de entrega.
 *
 * Vive aparte de pedidos.ts porque el carrito es un componente de CLIENTE y
 * necesita el coste del envío para enseñar el total. Importarlo desde
 * pedidos.ts arrastraría postgres al paquete del navegador — el mismo error que
 * ya rompió una pantalla del CRM: una constante inocente que trae media base de
 * datos detrás.
 */

/** Coste del domicilio en pesos. Debería salir de configuración por zonas. */
export const ENVIO_COP = 6_000;

/** Mínimo para pedir a domicilio. */
export const PEDIDO_MINIMO_COP = 32_000;

/** Lo que se le dice a la gente sobre tiempos. */
export const TIEMPOS = {
  recoger: '3 a 5 minutos',
  domicilio: '25 a 40 minutos',
} as const;
