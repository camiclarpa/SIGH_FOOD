// =============================================================================
// Módulos del CRM que se pueden activar o pausar
// =============================================================================

/**
 * Canal B2B: pipeline comercial, consignación de stock y ficha de bares.
 *
 * PAUSADO, no eliminado. La estrategia actual es B2C —el comensal que escanea
 * el QR en la mesa— y tener el embudo de bares compitiendo por la atención
 * dispersa el foco. Se reactivará cuando la marca escale y haya que gestionar
 * la relación comercial con los establecimientos.
 *
 * Qué se conserva mientras tanto:
 *   · El código de las pantallas y sus consultas, intacto.
 *   · Las 15 tablas B2B y todos sus datos: 45 cuentas, entregas, liquidaciones.
 *   · Los endpoints de /api, que siguen respondiendo — se pausa la interfaz,
 *     no la API, para no romper integraciones externas.
 *
 * PARA REACTIVARLO: poner esta constante en `true`. Nada más. Vuelven el menú
 * y las pantallas con sus datos donde estaban.
 */
export const B2B_ACTIVO = false;

/**
 * Rutas que quedan fuera mientras el canal B2B está pausado.
 *
 * Los códigos QR NO están aquí a propósito: aunque el QR viva físicamente en un
 * bar, es el canal por el que entra el comensal, así que pertenece a la
 * operación B2C y sigue disponible.
 */
export const RUTAS_B2B = ['/clientes', '/pipeline', '/consignacion'];

export function esRutaB2B(ruta: string): boolean {
  return RUTAS_B2B.some((r) => ruta === r || ruta.startsWith(`${r}/`));
}
