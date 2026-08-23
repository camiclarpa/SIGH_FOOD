// =============================================================================
// Puntos del club por pedido entregado — lado CRM
// =============================================================================
//
// El motor de puntos ya existe (otorgarPuntos, point_transactions). Aquí solo
// se decide CUÁNTOS y se garantiza que se den una sola vez.
//
// La regla heredada de ese motor: los puntos nunca se escriben directamente
// sobre b2c_consumers.points. Se registra un movimiento y el saldo se deriva,
// para poder explicar de dónde salió cada punto ante una reclamación.

import { and, eq, isNull } from 'drizzle-orm';
import { pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { otorgarPuntos, evaluarInsignias } from '@/lib/fidelizacion';

/** Puntos por cada mil pesos gastados. */
export const PUNTOS_POR_MIL = 1;

/**
 * Otorga los puntos de un pedido entregado. Devuelve cuántos.
 *
 * Idempotente por `pedidos.puntos_otorgados`, y la condición va en el WHERE del
 * UPDATE: la entrega puede marcarse dos veces —dos personas en la cocina, un
 * reintento— y entre leer y escribir cabe el segundo intento.
 */
export async function otorgarPuntosDePedido(pedidoId: string): Promise<number> {
  return conBaseDeDatos(async (db) => {
    const [pedido] = await db
      .select({
        id: pedidos.id,
        codigo: pedidos.codigo,
        consumerId: pedidos.consumerId,
        totalCOP: pedidos.totalCOP,
        estado: pedidos.estado,
      })
      .from(pedidos)
      .where(eq(pedidos.id, pedidoId))
      .limit(1);

    if (!pedido || pedido.estado !== 'entregado' || !pedido.consumerId) return 0;

    const puntos = Math.floor((pedido.totalCOP / 1000) * PUNTOS_POR_MIL);
    if (puntos <= 0) return 0;

    // Marcar y ganar la carrera en el mismo paso.
    const [marcado] = await db
      .update(pedidos)
      .set({ puntosOtorgados: puntos })
      .where(and(eq(pedidos.id, pedidoId), isNull(pedidos.puntosOtorgados)))
      .returning({ id: pedidos.id });

    if (!marcado) return 0;

    await otorgarPuntos(db, {
      consumerId: pedido.consumerId,
      puntos,
      // 'pedido', no 'escaneo': el movimiento se le enseña al comensal y se usa
      // para responder reclamaciones. Etiquetar una compra como un escaneo en
      // mesa hacía ilegible justamente el historial que este módulo existe para
      // poder explicar.
      motivo: 'pedido',
      referenciaId: pedido.id,
      descripcion: `Pedido ${pedido.codigo}`,
    });

    /*
      Y se revisan las insignias.

      Va aquí, después de marcar, y no en la acción que llama: las insignias de
      compra —pedidos entregados, gasto acumulado, productos distintos— solo
      pueden haber cambiado si este pedido acaba de contar, y este es el único
      punto del código que sabe que contó.

      Envuelto en try: evaluarInsignias es idempotente y se recupera en la
      siguiente entrega, mientras que dejar los puntos sin dar por un fallo al
      calcular una insignia sería peor.
    */
    try {
      await evaluarInsignias(db, pedido.consumerId);
    } catch {
      // El fallo ya queda en el log del llamador; aquí solo se evita que tumbe
      // la entrega de puntos, que es lo que de verdad no se puede perder.
    }

    return puntos;
  });
}
