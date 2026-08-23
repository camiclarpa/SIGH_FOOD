'use server';

// =============================================================================
// Acciones de envío por WhatsApp
// =============================================================================
//
// Une el servicio de Meta con las tablas del CRM. El servicio no sabe nada de
// la base y la base no sabe nada de Meta; aquí se juntan las dos cosas y se
// deja constancia de cada envío, salga bien o mal.

import { revalidatePath } from 'next/cache';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  automationLogs,
  b2cConsumers,
  chatConversations,
  chatMessages,
  sensoryMoments,
  accounts,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';
import {
  categoriaDePlantilla,
  marcarLeidoEnMeta,
  sendTemplateMessage,
  sendTextMessage,
  verificarConexion,
  type ComponentePlantilla,
  type ResultadoEnvio,
} from '@/lib/whatsapp/service';
import { normalizarTelefono } from '@/lib/whatsapp/config';
import { etiquetaNivel } from '@/lib/fidelizacion';
import { despacharPlantilla, registrarEnvio, variablesDe } from '@/lib/whatsapp/despacho';

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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/whatsapp' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// -----------------------------------------------------------------------------
// Estado de la conexión
// -----------------------------------------------------------------------------

export async function estadoConexion(): Promise<
  Resultado<
    | { conectado: true; numero: string; nombre: string; calidad: string | null }
    | { conectado: false; motivo: string }
  >
> {
  return ejecutar('estadoConexion', async () => {
    await exigir('campanas.editar');
    const r = await verificarConexion();
    return r.ok
      ? { conectado: true as const, numero: r.numero, nombre: r.nombre, calidad: r.calidad }
      : { conectado: false as const, motivo: r.motivo };
  });
}

// -----------------------------------------------------------------------------
// Guardado del envío
// -----------------------------------------------------------------------------

/**
 * Deja constancia del envío en el hilo, haya salido bien o mal.
 *
 * Los fallos se guardan igual y con su código: un mensaje que no llegó es
 * información —dice que el número está mal, que caducó el token o que se
 * agotó la ventana— y borrarlo deja al equipo sin saber por qué el comensal
 * nunca contestó.
 */
// -----------------------------------------------------------------------------
// Respuesta desde la bandeja
// -----------------------------------------------------------------------------

export async function responderChat(datos: {
  conversationId: string;
  texto: string;
}): Promise<Resultado<{ wamid: string }>> {
  return ejecutar('responderChat', async () => {
    const actor = await exigir('campanas.probar');

    const conversacion = await conBaseDeDatos(async (db) => {
      const [c] = await db
        .select({
          telefono: chatConversations.telefono,
          ventana: chatConversations.ventanaExpiraEn,
        })
        .from(chatConversations)
        .where(eq(chatConversations.id, datos.conversationId))
        .limit(1);
      return c;
    });

    if (!conversacion) throw new Error('Esa conversación no existe');

    // Se comprueba ANTES de llamar a Meta. Enviar texto fuera de la ventana no
    // solo falla: acumula errores 131047 que deterioran la calidad del número.
    const abierta = conversacion.ventana ? new Date(conversacion.ventana) > new Date() : false;
    if (!abierta) {
      throw new Error(
        'La ventana de 24 horas está cerrada. Solo se puede escribir texto libre si el ' +
        'comensal contactó en las últimas 24 h; fuera de ese plazo hay que usar una plantilla aprobada.'
      );
    }

    const resultado = await sendTextMessage({ to: conversacion.telefono, text: datos.texto });

    await registrarEnvio({
      telefono: conversacion.telefono,
      resultado,
      texto: datos.texto,
      enviadoPor: actor.id || null,
    });

    if (!resultado.ok) throw new Error(resultado.mensaje);

    log.info('Respuesta enviada por WhatsApp', {
      ruta: '/acciones/whatsapp',
      detalle: [actor.email, conversacion.telefono],
    });

    return { wamid: resultado.wamid };
  }).then((r) => {
    if (r.ok) revalidatePath('/bandeja');
    return r;
  });
}

/** Toma o suelta un chat, y lo marca leído. */
export async function tomarChat(datos: {
  conversationId: string;
  tomar: boolean;
}): Promise<Resultado> {
  return ejecutar('tomarChat', async () => {
    const actor = await exigir('campanas.probar');

    await conBaseDeDatos((db) =>
      db
        .update(chatConversations)
        .set({
          estado: datos.tomar ? 'humano' : 'bot',
          asignadoA: datos.tomar ? actor.id || null : null,
          sinLeer: 0,
          updatedAt: new Date(),
        })
        .where(eq(chatConversations.id, datos.conversationId))
    );

    return undefined;
  }).then((r) => {
    if (r.ok) revalidatePath('/bandeja');
    return r;
  });
}

/** Marca la conversación como leída, también en el móvil del comensal. */
export async function marcarChatLeido(conversationId: string): Promise<Resultado> {
  return ejecutar('marcarChatLeido', async () => {
    await exigir('campanas.probar');

    const ultimo = await conBaseDeDatos(async (db) => {
      await db
        .update(chatConversations)
        .set({ sinLeer: 0, updatedAt: new Date() })
        .where(eq(chatConversations.id, conversationId));

      const [m] = await db
        .select({ wamid: chatMessages.wamid })
        .from(chatMessages)
        .where(and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.direccion, 'entrante')
        ))
        .orderBy(desc(chatMessages.createdAt))
        .limit(1);
      return m;
    });

    // La doble marca azul es cortesía; que falle no rompe nada.
    if (ultimo?.wamid) await marcarLeidoEnMeta(ultimo.wamid);

    return undefined;
  }).then((r) => {
    if (r.ok) revalidatePath('/bandeja');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Plantillas y campañas
// -----------------------------------------------------------------------------

/**
 * Envía una plantilla a un comensal.
 *
 * `variables` son los parámetros posicionales del cuerpo de la plantilla, en el
 * orden en que aparecen {{1}}, {{2}}… en la que se aprobó en Meta. El texto de
 * la secuencia del CRM NO se envía: Meta solo acepta la plantilla registrada, y
 * lo nuestro solo sirve para rellenar sus huecos.
 */
export async function enviarPlantilla(datos: {
  consumerId: string;
  templateName: string;
  languageCode?: string;
  /** Nombres de variables del CRM, en el orden de la plantilla de Meta. */
  variables?: string[];
  sequenceId?: string;
  /**
   * Cómo clasifica Meta la plantilla. Sin esto no sale.
   *
   * Se pide explícitamente en vez de deducirlo: quien pulsa "enviar" en el CRM
   * tiene delante la secuencia, que ya guarda la categoría sincronizada desde
   * Meta. Adivinarla aquí sería reintroducir el 131042 por la puerta de atrás.
   */
  categoria: 'utilidad' | 'autenticacion' | 'marketing' | null;
}): Promise<Resultado<{ wamid: string }>> {
  return ejecutar('enviarPlantilla', async () => {
    const actor = await exigir('campanas.activar');

    // El envío vive en lib/whatsapp/despacho.ts, fuera de este archivo, y no
    // por gusto: todo lo que se exporta desde un archivo 'use server' queda
    // invocable desde fuera. Si el envío recibiera aquí un parámetro "quién
    // actúa", cualquiera podría llamarlo diciendo que es administrador. Aquí se
    // comprueba el permiso; allí se envía, y el actor lo pone esta función.
    const r = await despacharPlantilla(datos, { id: actor.id, email: actor.email });
    if (!r.ok) throw new Error(r.error ?? 'No se pudo enviar');

    return { wamid: r.wamid!, conversacionId: r.conversacionId };
  }).then((r) => {
    if (r.ok) { revalidatePath('/bandeja'); revalidatePath('/mensajeria'); }
    return r;
  });
}

/**
 * Envío de prueba a un número concreto.
 *
 * Existe para que nadie descubra una errata con mil destinatarios delante. Va
 * por plantilla porque un número de prueba casi nunca tiene la ventana de 24 h
 * abierta.
 */
export async function enviarPrueba(datos: {
  telefono: string;
  templateName: string;
  languageCode?: string;
}): Promise<Resultado<{ wamid: string }>> {
  return ejecutar('enviarPrueba', async () => {
    const actor = await exigir('campanas.probar');

    const telefono = normalizarTelefono(datos.telefono);
    if (!telefono) throw new Error(`"${datos.telefono}" no es un número válido`);

    /*
      La categoría se le pregunta a META, no a quien pulsa el botón.

      Aquí no hay secuencia guardada de la que leerla —se está probando un
      nombre escrito a mano—, y añadir un desplegable en el formulario sería
      pedirle al usuario que adivine un dato que Meta ya sabe. Si se equivoca,
      el envío falla con el 131042 y el error no dice que la culpa fue del
      desplegable.

      Es una llamada extra a la Graph API, pero esto es una acción manual y
      poco frecuente: se paga una vez, y a cambio la prueba refleja lo que va a
      pasar de verdad.
    */
    const categoria = await categoriaDePlantilla(datos.templateName);

    if (categoria === null) {
      throw new Error(
        `Meta no reconoce la plantilla "${datos.templateName}", o no se pudo consultar su ` +
        'categoría. Comprueba que el nombre es exacto y que está aprobada.'
      );
    }

    const resultado = await sendTemplateMessage({
      to: telefono,
      templateName: datos.templateName,
      languageCode: datos.languageCode,
      categoria,
    });

    await registrarEnvio({
      telefono,
      resultado,
      texto: `[prueba: ${datos.templateName}]`,
      plantilla: datos.templateName,
      enviadoPor: actor.id || null,
    });

    if (!resultado.ok) throw new Error(resultado.mensaje);
    return { wamid: resultado.wamid };
  });
}
