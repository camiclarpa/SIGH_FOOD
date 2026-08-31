'use server';

// =============================================================================
// Pedidos de la tienda — operación
// =============================================================================
//
// Lo que usa la cocina y el despacho. La tienda crea los pedidos; aquí se
// mueven.
//
// La máquina de estados solo AVANZA. Un pedido entregado no vuelve a estar en
// preparación, y permitirlo abriría la puerta a "des-entregar" algo por un
// error de clic — con la comanda ya impresa y el repartidor en la calle.
// Cancelar sí se puede desde cualquier punto anterior a la entrega, porque eso
// pasa de verdad.

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { pedidoEventos, pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';
import { siguientesDe, type EstadoPedido } from '@/lib/estados-pedido';
import { otorgarPuntosDePedido } from '@/lib/club-pedidos';
import { avisarCambioDeEstado } from '@/lib/avisos-pedidos';

export interface Resultado<T = undefined> {
  ok: boolean;
  error?: string;
  datos?: T;
}

async function ejecutar<T>(nombre: string, trabajo: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, datos: await trabajo() };
  } catch (e) {
    if (e instanceof SinPermiso) return { ok: false, error: e.message };
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/pedidos' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

/**
 * Mueve un pedido al siguiente estado.
 *
 * La comprobación de si el salto es legal se hace DENTRO de la misma consulta
 * —en el WHERE— y no antes en JavaScript. Dos personas en la cocina pulsando a
 * la vez sobre el mismo pedido harían pasar las dos la comprobación previa y
 * escribirían dos eventos; con la condición en el WHERE, la segunda no actualiza
 * ninguna fila y se entera.
 */
export async function avanzarPedido(datos: {
  id: string;
  estado: EstadoPedido;
  nota?: string;
}): Promise<Resultado> {
  return ejecutar('avanzarPedido', async () => {
    const actor = await exigir('pedidos.avanzar');

    return conBaseDeDatos(async (db) => {
      const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, datos.id)).limit(1);
      if (!pedido) throw new Error('El pedido no existe');

      const permitidos = siguientesDe(pedido.estado as EstadoPedido, pedido.tipoEntrega);
      if (!permitidos.includes(datos.estado)) {
        throw new Error(
          `No se puede pasar de "${pedido.estado}" a "${datos.estado}". ` +
            'Puede que alguien lo haya movido ya.'
        );
      }

      const [actualizado] = await db
        .update(pedidos)
        .set({
          estado: datos.estado,
          updatedAt: new Date(),
          entregadoEn: datos.estado === 'entregado' ? new Date() : pedido.entregadoEn,
        })
        // El estado anterior va en el WHERE: si otra persona ya lo movió, esto
        // no actualiza nada en lugar de pisar su cambio.
        .where(and(eq(pedidos.id, datos.id), eq(pedidos.estado, pedido.estado)))
        .returning({ id: pedidos.id });

      if (!actualizado) {
        throw new Error('Alguien acaba de mover este pedido. Recarga para ver cómo está.');
      }

      await db.insert(pedidoEventos).values({
        pedidoId: datos.id,
        estado: datos.estado,
        staffUserId: actor.id || null,
        nota: datos.nota?.trim().slice(0, 255) || null,
      });

      log.info(`Pedido ${datos.estado}`, {
        ruta: '/acciones/pedidos',
        detalle: [actor.email, pedido.codigo],
      });

      // Al entregar se otorgan los puntos del club. Va aqui y no en la tienda
      // porque es el CRM quien sabe que se entrego de verdad.
      //
      // Envuelto: que falle el premio no puede impedir marcar una entrega que
      // ya ocurrio fisicamente. Los puntos se recuperan reejecutando; una
      // entrega sin registrar descuadra la cocina.
      if (datos.estado === 'entregado') {
        try {
          const puntos = await otorgarPuntosDePedido(datos.id);
          if (puntos > 0) {
            log.info('Puntos del club otorgados', {
              ruta: '/acciones/pedidos',
              detalle: [pedido.codigo, `${puntos} puntos`],
            });
          }
        } catch (e) {
          log.error('No se pudieron otorgar los puntos del pedido', e, {
            ruta: '/acciones/pedidos',
            detalle: pedido.codigo,
          });
        }
      }

      /*
        Y se avisa a la persona. Mismo criterio: es cortesía, no puede tumbar la
        operación.

        El `consumerId` va incluido porque sin él solo se podría intentar
        WhatsApp. Y el texto libre de WhatsApp exige que la persona haya escrito
        al negocio en las últimas 24 h — algo que quien pide por la tienda casi
        nunca ha hecho. A esa gente no le llegaba nada: el pedido avanzaba en la
        cocina y ella seguía viendo "recibido".

        Con el comensal identificado se puede caer a la notificación del
        navegador, que no depende de ninguna ventana.
      */
      try {
        await avisarCambioDeEstado({
          telefono: pedido.telefono,
          codigo: pedido.codigo,
          estado: datos.estado,
          consumerId: pedido.consumerId,
        });
      } catch {
        // La pasarela ya registra el detalle.
      }

      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/pedidos');
    return r;
  });
}

/**
 * Reenvía el aviso del estado actual del pedido.
 *
 * avanzarPedido() ya avisa solo, en automático, cada vez que la cocina mueve
 * un pedido — esto es para el caso en que ese aviso falló o el comensal dice
 * no haberlo visto, y hay que insistir sin tener que mover el pedido de
 * estado para disparar uno nuevo.
 */
export async function reenviarAviso(id: string): Promise<Resultado<{ canal: string }>> {
  return ejecutar('reenviarAviso', async () => {
    const actor = await exigir('pedidos.avanzar');

    const pedido = await conBaseDeDatos(async (db) => {
      const [p] = await db.select().from(pedidos).where(eq(pedidos.id, id)).limit(1);
      return p;
    });
    if (!pedido) throw new Error('El pedido no existe');

    const canal = await avisarCambioDeEstado({
      telefono: pedido.telefono,
      codigo: pedido.codigo,
      estado: pedido.estado,
      consumerId: pedido.consumerId,
    });

    log.info('Aviso reenviado', {
      ruta: '/acciones/pedidos',
      detalle: [actor.email, pedido.codigo, canal],
    });

    return { canal };
  });
}

/**
 * Marca el pago como cobrado.
 *
 * Es un eje distinto del estado del pedido: se puede cobrar antes de preparar o
 * al entregar, según el método. Por eso es una acción aparte y no un efecto
 * secundario de "entregado".
 */
export async function marcarPagado(id: string): Promise<Resultado> {
  return ejecutar('marcarPagado', async () => {
    const actor = await exigir('pedidos.avanzar');

    return conBaseDeDatos(async (db) => {
      const [actualizado] = await db
        .update(pedidos)
        .set({ estadoPago: 'aprobado', updatedAt: new Date() })
        // Solo desde pendiente o procesando: marcar dos veces no debería
        // registrarse como dos cobros.
        .where(and(eq(pedidos.id, id), inArray(pedidos.estadoPago, ['pendiente', 'procesando'])))
        .returning({ codigo: pedidos.codigo });

      if (!actualizado) throw new Error('Ese pago ya estaba registrado');

      log.info('Pago registrado', {
        ruta: '/acciones/pedidos',
        detalle: [actor.email, actualizado.codigo],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/pedidos');
    return r;
  });
}

/**
 * Disponibilidad de un producto.
 *
 * Es la acción más usada del día en un negocio de comida: se acabó algo y hay
 * que quitarlo de la carta AHORA, no en el siguiente despliegue. Por eso vive
 * en el CRM y no en un fichero de código.
 */
export async function alternarDisponible(
  productoId: string,
  disponible: boolean
): Promise<Resultado> {
  return ejecutar('alternarDisponible', async () => {
    const actor = await exigir('productos.gestionar');

    return conBaseDeDatos(async (db) => {
      const { productos } = await import('@sighfood/domain/db/schema');
      const [p] = await db
        .update(productos)
        .set({ disponible, updatedAt: new Date() })
        .where(eq(productos.id, productoId))
        .returning({ nombre: productos.nombre });

      if (!p) throw new Error('El producto no existe');

      log.info(disponible ? 'Producto disponible' : 'Producto agotado', {
        ruta: '/acciones/pedidos',
        detalle: [actor.email, p.nombre],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/pedidos');
    return r;
  });
}
