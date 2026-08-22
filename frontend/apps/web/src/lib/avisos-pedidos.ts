// =============================================================================
// Avisos de pedido por WhatsApp — lado CRM
// =============================================================================
//
// Cuando la cocina mueve una comanda, la persona se entera por WhatsApp. Sin
// esto, el seguimiento solo sirve si mantiene la pestaña abierta, y en la
// práctica pide y cierra el navegador.
//
// Usa la MISMA pasarela ya verificada contra Meta que usa la bandeja. Nada
// nuevo que configurar.
//
// REGLA: un aviso que falla NUNCA rompe la operación. Todo va envuelto y
// devuelve booleano. Que WhatsApp esté caído no puede impedir que la cocina
// marque una entrega que ya ocurrió.
//
// Aviso sobre la ventana de 24 h: Meta solo entrega texto libre si la persona
// escribió al negocio en las últimas 24 horas. Quien pidió por la tienda no
// necesariamente lo hizo, así que estos mensajes pueden rechazarse con el error
// 131047. Es esperable. Para que lleguen siempre hay que aprobar plantillas,
// igual que en las campañas.

import { sendTextMessage } from '@/lib/whatsapp/service';

const MENSAJES: Record<string, (codigo: string) => string> = {
  confirmado: (c) => `Tu pedido ${c} está confirmado. Ya lo estamos organizando.`,
  preparando: (c) => `Empezamos a preparar tu pedido ${c}. Sale recién hecho.`,
  listo: (c) => `Tu pedido ${c} está listo.`,
  en_camino: (c) => `Tu pedido ${c} va en camino.`,
  entregado: () => 'Entregado. Que aproveche. Si quieres contarnos qué te pareció, responde a este mensaje.',
  cancelado: (c) => `Tu pedido ${c} fue cancelado. Si crees que es un error, escríbenos.`,
};

export async function avisarCambioDeEstado(datos: {
  telefono: string;
  codigo: string;
  estado: string;
}): Promise<boolean> {
  const plantilla = MENSAJES[datos.estado];
  if (!plantilla) return false;

  try {
    const r = await sendTextMessage({ to: datos.telefono, text: plantilla(datos.codigo) });
    return r.ok;
  } catch {
    return false;
  }
}
