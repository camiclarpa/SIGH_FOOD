// =============================================================================
// Cobros: iniciar un pago y aplicar lo que diga la pasarela
// =============================================================================
//
// Dos operaciones, y las dos tienen que aguantar que se llamen dos veces:
//
//   · iniciarPago()  crea la transacción y devuelve la URL del checkout.
//   · aplicarEvento() recibe lo que dice Wompi y actualiza pedido y pago.
//
// Wompi REINTENTA los webhooks. Si el primero tarda o falla, manda el mismo
// evento otra vez, así que aplicarEvento se ejecutará repetido en producción —
// no es un caso raro, es el comportamiento normal. De ahí que todo lo que
// escribe vaya condicionado en el WHERE en lugar de comprobado antes.

import { and, desc, eq, sql } from 'drizzle-orm';
import { pagos, pedidoEventos, pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  aCentavos,
  configWompi,
  firmaIntegridad,
  traducirEstado,
  urlCheckout,
  type EventoWompi,
} from '@/lib/wompi';

export type ResultadoCobro =
  | { ok: true; url: string; referencia: string }
  | { ok: false; error: string };

/**
 * Referencia única por INTENTO.
 *
 * Wompi rechaza una referencia repetida, así que no puede ser el código del
 * pedido a secas: un reintento tras un rechazo necesita una nueva. Se compone
 * del código —para poder cruzarla a ojo con el extracto— más un sufijo
 * aleatorio.
 */
function generarReferencia(codigoPedido: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const sufijo = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${codigoPedido}-${sufijo}`;
}

/**
 * Prepara el cobro de un pedido y devuelve a dónde mandar a la persona.
 *
 * El importe se lee del PEDIDO, nunca de lo que llegue del navegador. Es la
 * misma regla que en crearPedido y por el mismo motivo: si se confiara en el
 * cliente, bastaría con editar la petición para pagar mil pesos por todo.
 */
export async function iniciarPago(datos: {
  codigoPedido: string;
  urlRetorno: string;
}): Promise<ResultadoCobro> {
  const estado = await configWompi();
  if (!estado.listo) return { ok: false, error: estado.motivo };

  return conBaseDeDatos(async (db) => {
    const [pedido] = await db
      .select()
      .from(pedidos)
      .where(eq(pedidos.codigo, datos.codigoPedido.toUpperCase()))
      .limit(1);

    if (!pedido) return { ok: false as const, error: 'Ese pedido no existe' };

    // Un pedido ya pagado no se vuelve a cobrar. Es la primera barrera; la
    // definitiva es el índice único parcial de la tabla pagos.
    if (pedido.estadoPago === 'aprobado') {
      return { ok: false as const, error: 'Este pedido ya está pagado' };
    }

    if (pedido.estado === 'cancelado') {
      return { ok: false as const, error: 'Este pedido está cancelado' };
    }

    const referencia = generarReferencia(pedido.codigo);
    const montoCentavos = aCentavos(pedido.totalCOP);

    const firma = await firmaIntegridad({
      referencia,
      montoCentavos,
      moneda: 'COP',
      secreto: estado.config.secretoIntegridad,
    });

    await db.insert(pagos).values({
      pedidoId: pedido.id,
      referencia,
      estado: 'pendiente',
      metodo: pedido.metodoPago,
      montoCentavos,
      moneda: 'COP',
    });

    // El pedido pasa a 'procesando': la persona se fue al checkout y todavía no
    // se sabe qué pasó. Distinguirlo de 'pendiente' permite que la cocina no
    // empiece a preparar algo que quizá no se pague.
    await db
      .update(pedidos)
      .set({ estadoPago: 'procesando', referenciaPago: referencia, updatedAt: new Date() })
      .where(eq(pedidos.id, pedido.id));

    return {
      ok: true as const,
      referencia,
      url: urlCheckout({
        config: estado.config,
        referencia,
        montoCentavos,
        firma,
        urlRetorno: datos.urlRetorno,
        telefono: pedido.telefono,
        nombre: pedido.nombre,
      }),
    };
  });
}

export interface ResultadoEvento {
  aplicado: boolean;
  motivo: string;
  estado?: string;
  codigo?: string;
}

/**
 * Aplica un evento de Wompi.
 *
 * Se asume que la firma YA se verificó en la ruta. Aquí no se vuelve a mirar
 * porque esta función también la usa la reconciliación manual, donde los datos
 * vienen de consultar a Wompi y no de un webhook.
 *
 * Lo que sí se comprueba siempre es el IMPORTE. Un evento aprobado por un monto
 * distinto al del pedido no se acepta: puede ser un error de la pasarela, una
 * referencia reutilizada o una manipulación, y en los tres casos lo correcto es
 * no dar el pedido por pagado y dejar constancia.
 */
export async function aplicarEvento(evento: EventoWompi): Promise<ResultadoEvento> {
  const trx = evento?.data?.transaction;
  if (!trx?.reference || !trx?.status) {
    return { aplicado: false, motivo: 'El evento no trae transacción' };
  }

  const nuevoEstado = traducirEstado(trx.status);

  return conBaseDeDatos(async (db) => {
    const [pago] = await db
      .select()
      .from(pagos)
      .where(eq(pagos.referencia, trx.reference))
      .limit(1);

    // Una referencia que no conocemos no es necesariamente un ataque: puede ser
    // un cobro hecho desde el panel de Wompi. Se registra y se descarta, pero no
    // se trata como error — devolver 500 haría que Wompi reintentara para
    // siempre.
    if (!pago) return { aplicado: false, motivo: 'Referencia desconocida' };

    const [pedido] = await db
      .select()
      .from(pedidos)
      .where(eq(pedidos.id, pago.pedidoId))
      .limit(1);

    if (!pedido) return { aplicado: false, motivo: 'El pedido ya no existe' };

    // --- El importe tiene que cuadrar ---
    if (nuevoEstado === 'aprobado' && trx.amount_in_cents !== pago.montoCentavos) {
      await db
        .update(pagos)
        .set({
          estado: 'rechazado',
          mensaje: `Importe distinto: llegó ${trx.amount_in_cents}, se esperaba ${pago.montoCentavos}`,
          cargaUtil: evento as unknown as Record<string, unknown>,
          transaccionId: trx.id,
          actualizadoEn: new Date(),
        })
        .where(eq(pagos.id, pago.id));

      return {
        aplicado: false,
        motivo: 'El importe no coincide con el pedido',
        codigo: pedido.codigo,
      };
    }

    // --- Idempotencia ---
    // Si el pago ya está en el estado que trae el evento, no se hace nada. Wompi
    // reintenta, y sin esto cada reintento reescribiría timestamps y duplicaría
    // el evento en el historial del pedido.
    if (pago.estado === nuevoEstado) {
      return { aplicado: false, motivo: 'Ya aplicado', estado: nuevoEstado, codigo: pedido.codigo };
    }

    // Un pago aprobado no vuelve atrás. Wompi puede mandar eventos
    // desordenados, y un PENDING que llega tarde no debe desaprobar un cobro
    // que ya entró.
    if (pago.estado === 'aprobado' && nuevoEstado !== 'rechazado') {
      return { aplicado: false, motivo: 'El pago ya estaba aprobado', codigo: pedido.codigo };
    }

    const ahora = new Date();

    await db
      .update(pagos)
      .set({
        estado: nuevoEstado,
        transaccionId: trx.id,
        mensaje: trx.status_message?.slice(0, 500) ?? null,
        cargaUtil: evento as unknown as Record<string, unknown>,
        actualizadoEn: ahora,
        aprobadoEn: nuevoEstado === 'aprobado' ? ahora : null,
      })
      .where(eq(pagos.id, pago.id));

    await db
      .update(pedidos)
      .set({
        estadoPago: nuevoEstado,
        // La caja diaria necesita saber CUÁNDO se aprobó el cobro, no solo
        // que se aprobó: es lo que decide si cae dentro de una sesión.
        pagoAprobadoEn: nuevoEstado === 'aprobado' ? ahora : pedido.pagoAprobadoEn,
        updatedAt: ahora,
      })
      .where(eq(pedidos.id, pedido.id));

    // --- Al aprobar, el pedido entra en la cola de cocina ---
    // Solo si sigue en 'recibido': si alguien ya lo movió a mano, respetarlo.
    if (nuevoEstado === 'aprobado' && pedido.estado === 'recibido') {
      const [movido] = await db
        .update(pedidos)
        .set({ estado: 'confirmado', updatedAt: ahora })
        .where(and(eq(pedidos.id, pedido.id), eq(pedidos.estado, 'recibido')))
        .returning({ id: pedidos.id });

      if (movido) {
        await db.insert(pedidoEventos).values({
          pedidoId: pedido.id,
          estado: 'confirmado',
          nota: `Pago aprobado (${trx.payment_method_type ?? pago.metodo})`,
        });
      }
    }

    return { aplicado: true, motivo: 'Aplicado', estado: nuevoEstado, codigo: pedido.codigo };
  });
}

/** El último intento de pago de un pedido, para la pantalla de reintento. */
export async function ultimoPago(codigoPedido: string) {
  return conBaseDeDatos(async (db) => {
    const [pedido] = await db
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(eq(pedidos.codigo, codigoPedido.toUpperCase()))
      .limit(1);

    if (!pedido) return null;

    const [pago] = await db
      .select({
        estado: pagos.estado,
        metodo: pagos.metodo,
        mensaje: pagos.mensaje,
        montoCentavos: pagos.montoCentavos,
        creadoEn: pagos.creadoEn,
      })
      .from(pagos)
      .where(eq(pagos.pedidoId, pedido.id))
      .orderBy(desc(pagos.creadoEn))
      .limit(1);

    return pago ?? null;
  });
}

/** Cuántos intentos lleva un pedido. Para no dejar reintentar indefinidamente. */
export async function intentosDe(pedidoId: string): Promise<number> {
  return conBaseDeDatos(async (db) => {
    const [r] = await db
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(pagos)
      .where(eq(pagos.pedidoId, pedidoId));
    return Number(r?.n ?? 0);
  });
}
