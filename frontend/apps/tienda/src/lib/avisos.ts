// =============================================================================
// Avisos por WhatsApp
// =============================================================================
//
// El problema que resuelve: la pantalla de seguimiento solo sirve si la persona
// mantiene la pestaña abierta. En la práctica pide, cierra el navegador y se
// pone a hacer otra cosa. Sin aviso, la única forma de enterarse de que su
// pedido salió es volver a mirar.
//
// Se usa la MISMA pasarela ya verificada contra Meta que usa el CRM. Nada nuevo
// que configurar.
//
// REGLA QUE GOBIERNA ESTE ARCHIVO: un aviso que falla NUNCA rompe el pedido.
// Todo va envuelto y devuelve booleano en lugar de lanzar. Que WhatsApp esté
// caído no puede impedir que alguien compre, ni que la cocina mueva una
// comanda. El pedido es el dato; el aviso es cortesía.
//
// Sobre la ventana de 24 h: Meta solo entrega texto libre si la persona
// escribió al negocio en las últimas 24 horas. Quien pide por la tienda no
// necesariamente lo ha hecho, así que estos mensajes pueden ser rechazados con
// el error 131047. Es esperable y no es un fallo del código — se registra y ya.
// Para que lleguen siempre hay que aprobar plantillas en Meta, igual que en las
// campañas del CRM.

import { sendTextMessage } from '@/lib/whatsapp/service';

/** Lo que se le cuenta a la persona en cada paso. */
const MENSAJES: Record<string, (codigo: string) => string> = {
  confirmado: (c) => `Tu pedido ${c} está confirmado. Ya lo estamos organizando.`,
  preparando: (c) => `Empezamos a preparar tu pedido ${c}. Sale recién hecho.`,
  listo: (c) => `Tu pedido ${c} está listo.`,
  en_camino: (c) => `Tu pedido ${c} va en camino.`,
  entregado: () => `Entregado. Que aproveche. Si quieres contarnos qué te pareció, responde a este mensaje.`,
  cancelado: (c) => `Tu pedido ${c} fue cancelado. Si crees que es un error, escríbenos.`,
};

/**
 * Avisa de un cambio de estado.
 *
 * Devuelve si se pudo enviar. Nadie debería usar ese booleano para decidir si
 * el cambio de estado vale: el estado ya está escrito cuando esto se llama.
 */
export async function avisarCambioDeEstado(datos: {
  telefono: string;
  codigo: string;
  estado: string;
  url?: string;
}): Promise<boolean> {
  const plantilla = MENSAJES[datos.estado];
  if (!plantilla) return false;

  const cuerpo = datos.url
    ? `${plantilla(datos.codigo)}\n\nSíguelo aquí: ${datos.url}`
    : plantilla(datos.codigo);

  try {
    const r = await sendTextMessage({ to: datos.telefono, text: cuerpo });
    return r.ok;
  } catch {
    // La pasarela ya registra el detalle. Aquí solo interesa no propagar.
    return false;
  }
}

/**
 * Manda el comprobante nada más crear el pedido.
 *
 * Va con el desglose completo porque es lo que la persona va a mirar cuando
 * dude de cuánto pagó, y tenerlo en su WhatsApp evita una llamada al local.
 */
export async function enviarComprobante(datos: {
  telefono: string;
  codigo: string;
  lineas: Array<{ cantidad: number; nombre: string }>;
  totalCOP: number;
  tipoEntrega: string;
  url: string;
}): Promise<boolean> {
  const pesos = (c: number) => `$${c.toLocaleString('es-CO')}`;

  const cuerpo = [
    `Recibimos tu pedido ${datos.codigo}`,
    '',
    ...datos.lineas.map((l) => `${l.cantidad}x ${l.nombre}`),
    '',
    `Total: ${pesos(datos.totalCOP)}`,
    datos.tipoEntrega === 'recoger' ? 'Para recoger en el local' : 'A domicilio',
    '',
    `Sigue tu pedido: ${datos.url}`,
  ].join('\n');

  try {
    const r = await sendTextMessage({ to: datos.telefono, text: cuerpo });
    return r.ok;
  } catch {
    return false;
  }
}

/** Manda el código de acceso. */
export async function enviarCodigo(telefono: string, codigo: string): Promise<boolean> {
  try {
    const r = await sendTextMessage({
      to: telefono,
      // El código va solo en una línea, para que se pueda copiar de un toque.
      text: `Tu código de Bocazo es:\n\n${codigo}\n\nVale por 10 minutos. Si no lo pediste, ignora este mensaje.`,
    });
    return r.ok;
  } catch {
    return false;
  }
}
