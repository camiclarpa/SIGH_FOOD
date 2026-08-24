// =============================================================================
// Avisos de pedido — lado CRM
// =============================================================================
//
// Cuando la cocina mueve una comanda, la persona se entera. Sin esto, el
// seguimiento solo sirve si mantiene la pestaña abierta, y en la práctica pide y
// cierra el navegador.
//
// POR DÓNDE SALEN
// ---------------
// Se intenta lo mejor disponible, en este orden:
//
//   1. TEXTO LIBRE DE WHATSAPP, si la persona escribió al negocio en las
//      últimas 24 h. Llega al sitio donde ya está conversando y es gratis.
//
//   2. NOTIFICACIÓN DEL NAVEGADOR, si tiene los avisos activados.
//
// Antes solo existía el primero. El efecto era que a quien pedía por la tienda
// sin haber escrito nunca por WhatsApp —que es casi todo el mundo— no le llegaba
// NADA: Meta rechazaba el texto libre con el error 131047 y ahí se acababa el
// intento. El pedido avanzaba en la cocina y la persona no se enteraba.
//
// POR QUÉ AQUÍ NO SE APLICA EL TOPE DE FRECUENCIA
// -----------------------------------------------
// El tope de lib/frecuencia.ts protege de recibir demasiada PUBLICIDAD. Esto no
// lo es: "tu pedido va en camino" es información que la persona está esperando,
// sobre algo que acaba de pagar.
//
// Frenar un aviso de entrega porque esa semana ya se le mandó una campaña sería
// exactamente al revés de lo que hay que hacer: se gastaría el cupo en lo
// prescindible y se callaría lo importante.
//
// REGLA: un aviso que falla NUNCA rompe la operación. Todo va envuelto y
// devuelve el canal usado. Que WhatsApp esté caído no puede impedir que la
// cocina marque una entrega que ya ocurrió.

import { sendTextMessage } from '@/lib/whatsapp/service';
import { ventanaAbierta } from '@/lib/canal';
import { enviarPush } from '@/lib/push';
import { log } from '@sighfood/domain/lib/observabilidad';

const MENSAJES: Record<string, (codigo: string) => string> = {
  confirmado: (c) => `Tu pedido ${c} está confirmado. Ya lo estamos organizando.`,
  preparando: (c) => `Empezamos a preparar tu pedido ${c}. Sale recién hecho.`,
  listo: (c) => `Tu pedido ${c} está listo.`,
  en_camino: (c) => `Tu pedido ${c} va en camino.`,
  entregado: () => 'Entregado. Que aproveche. Si quieres contarnos qué te pareció, responde a este mensaje.',
  cancelado: (c) => `Tu pedido ${c} fue cancelado. Si crees que es un error, escríbenos.`,
};

/** Título de la notificación. Corto: es lo que se lee en la pantalla bloqueada. */
const TITULOS: Record<string, string> = {
  confirmado: 'Pedido confirmado',
  preparando: 'Ya lo estamos preparando',
  listo: 'Tu pedido está listo',
  en_camino: 'Va en camino',
  entregado: 'Entregado',
  cancelado: 'Pedido cancelado',
};

export type CanalAviso = 'whatsapp_texto' | 'push' | 'ninguno';

export async function avisarCambioDeEstado(datos: {
  telefono: string;
  codigo: string;
  estado: string;
  /** Necesario para las notificaciones: van atadas al comensal, no al teléfono. */
  consumerId?: string | null;
}): Promise<CanalAviso> {
  const plantilla = MENSAJES[datos.estado];
  if (!plantilla) return 'ninguno';

  const texto = plantilla(datos.codigo);

  // 1. La ventana abierta gana: es donde la persona está mirando.
  if (datos.consumerId && (await ventanaAbierta(datos.consumerId).catch(() => false))) {
    try {
      const r = await sendTextMessage({ to: datos.telefono, text: texto });
      if (r.ok) return 'whatsapp_texto';
    } catch {
      // Se sigue al siguiente canal en vez de rendirse.
    }
  } else if (!datos.consumerId) {
    /*
      Sin comensal no se puede saber si la ventana está abierta ni mandar
      notificación, así que se intenta el texto y se acepta que pueda fallar.

      Pasa con pedidos hechos antes de que existiera el enlace con la ficha.
    */
    try {
      const r = await sendTextMessage({ to: datos.telefono, text: texto });
      return r.ok ? 'whatsapp_texto' : 'ninguno';
    } catch {
      return 'ninguno';
    }
  }

  // 2. Notificación del navegador.
  if (datos.consumerId) {
    try {
      const r = await enviarPush(datos.consumerId, {
        titulo: TITULOS[datos.estado] ?? 'Bocazo',
        cuerpo: texto,
        url: `/pedido/${datos.codigo}`,
        // Etiqueta por PEDIDO: los avisos de un mismo pedido se sustituyen entre
        // sí en vez de apilar seis tarjetas en la pantalla bloqueada.
        etiqueta: `pedido-${datos.codigo}`,
      });
      if (r.entregados > 0) return 'push';
    } catch {
      // Cae al registro de abajo.
    }
  }

  // 3. No hubo por dónde. Se anota: un pedido que avanza sin que la persona se
  // entere es justo lo que hay que poder detectar después.
  log.warn('No se pudo avisar del cambio de estado', {
    ruta: '/lib/avisos-pedidos',
    detalle: [datos.codigo, datos.estado, 'sin ventana abierta ni notificaciones activadas'],
  });

  return 'ninguno';
}
