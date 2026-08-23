// =============================================================================
// Por dónde sale cada mensaje
// =============================================================================
//
// Un mensaje del CRM puede viajar por tres caminos, y solo uno de ellos cuesta
// dinero. Este archivo elige, y esa elección es la que hace que la operación
// entera salga a cero pesos.
//
// EL ORDEN, Y POR QUÉ ES ESE
// --------------------------
//   1. TEXTO LIBRE DE WHATSAPP — si la persona nos escribió en las últimas 24 h.
//      Gratis, llega al sitio donde ya está conversando, y no gasta plantilla.
//      Es el mejor canal cuando está disponible, y lo está pocas veces.
//
//   2. WEB PUSH — si tiene algún dispositivo suscrito. Gratis siempre, sin
//      intermediario. No exige que haya escrito antes.
//
//   3. PLANTILLA DE WHATSAPP — solo si es de categoría UTILIDAD. Entra en la
//      cuota gratuita de Meta. Las de MARKETING se cobran y, sin tarjeta
//      registrada, Meta las rechaza con el error 131042.
//
//   4. NADA. Y decirlo, en vez de fingir que se envió.
//
// LA REGLA QUE NO SE PUEDE SALTAR
// -------------------------------
// Una plantilla de MARKETING no sale nunca por WhatsApp. No es una preferencia
// de coste: es que el envío FALLA. El error 131042 no avisa antes, ocurre en el
// momento del envío, y una secuencia que lo intenta parece rota sin estarlo.
//
// Por eso el contenido de marketing —bienvenidas, encuestas, reactivaciones,
// subidas de nivel— tiene un único camino: Web Push. Si el comensal no está
// suscrito, ese mensaje no se manda. Preferimos no llegar a fallar.

import { and, eq, gt } from 'drizzle-orm';
import { chatConversations } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { tienePush } from '@/lib/push';

// Los tipos y la regla de categorías viven en canal-tipos.ts, sin base de datos
// detrás, para que se puedan probar y usar desde cliente. Se reexportan aquí
// para que quien ya importaba de este módulo no tenga que cambiar nada.
export {
  CATEGORIAS_ENVIABLES,
  puedeSalirPorWhatsapp,
  type Canal,
  type CategoriaMeta,
} from '@/lib/canal-tipos';
import type { Canal, CategoriaMeta } from '@/lib/canal-tipos';

export interface Eleccion {
  canal: Canal;
  /** Explicación en una frase, para el registro y para la pantalla. */
  motivo: string;
  /** true si el envío no cuesta nada. Hoy lo son todos los que se permiten. */
  gratuito: boolean;
}

/**
 * ¿Está abierta la ventana de servicio de Meta para este comensal?
 *
 * Se comprueba contra `ventana_expira_en`, que se recalcula con cada mensaje
 * entrante. La comparación va en el WHERE y no en JavaScript a propósito: así el
 * "ahora" es el del servidor de base de datos, el mismo reloj para todos los
 * comensales de una misma campaña.
 */
export async function ventanaAbierta(consumerId: string): Promise<boolean> {
  const filas = await conBaseDeDatos((db) =>
    db
      .select({ id: chatConversations.id })
      .from(chatConversations)
      .where(
        and(
          eq(chatConversations.consumerId, consumerId),
          gt(chatConversations.ventanaExpiraEn, new Date())
        )
      )
      .limit(1)
  );
  return filas.length > 0;
}

/**
 * Elige por dónde mandar.
 *
 * `categoria` es la de la plantilla de Meta asociada a la secuencia. Cuando vale
 * null se trata como NO enviable por plantilla: mientras
 * scripts/sincronizar-categorias.mjs no la haya rellenado desde la Graph API, no
 * sabemos si Meta la cobra, y suponer que no es exactamente el error que produce
 * el 131042. Falla del lado seguro.
 */
export async function elegirCanal(datos: {
  consumerId: string;
  categoria: CategoriaMeta;
  /** true si la secuencia tiene una plantilla de Meta configurada. */
  tienePlantilla: boolean;
}): Promise<Eleccion> {
  // 1. La ventana abierta gana siempre: es gratis, es donde la persona está
  //    mirando, y el texto libre admite cualquier contenido sin categorías.
  if (await ventanaAbierta(datos.consumerId)) {
    return {
      canal: 'whatsapp_texto',
      motivo: 'La ventana de 24 h está abierta: se responde por WhatsApp sin gastar plantilla.',
      gratuito: true,
    };
  }

  // 2. Web Push: gratis y sin depender de que haya escrito antes.
  if (await tienePush(datos.consumerId)) {
    return {
      canal: 'push',
      motivo: 'Fuera de la ventana, pero tiene notificaciones activadas.',
      gratuito: true,
    };
  }

  // 3. La plantilla, y solo si Meta la clasifica como utilidad.
  if (datos.tienePlantilla && datos.categoria === 'utilidad') {
    return {
      canal: 'whatsapp_plantilla',
      motivo: 'Plantilla de utilidad: entra en la cuota gratuita de Meta.',
      gratuito: true,
    };
  }

  // 4. No hay por dónde.
  if (datos.categoria === 'marketing') {
    return {
      canal: 'ninguno',
      motivo:
        'La plantilla es de marketing: Meta la cobraría y la rechazaría con el error 131042. ' +
        'Este comensal no tiene notificaciones activadas, así que no hay canal gratuito.',
      gratuito: true,
    };
  }

  if (datos.tienePlantilla && datos.categoria === null) {
    return {
      canal: 'ninguno',
      motivo:
        'No se sabe cómo clasifica Meta esta plantilla. Ejecuta ' +
        'scripts/sincronizar-categorias.mjs para averiguarlo antes de enviarla.',
      gratuito: true,
    };
  }

  return {
    canal: 'ninguno',
    motivo: 'Sin ventana abierta, sin notificaciones activadas y sin plantilla de utilidad.',
    gratuito: true,
  };
}
