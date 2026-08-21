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
  marcarLeidoEnMeta,
  sendTemplateMessage,
  sendTextMessage,
  verificarConexion,
  type ComponentePlantilla,
  type ResultadoEnvio,
} from '@/lib/whatsapp/service';
import { normalizarTelefono } from '@/lib/whatsapp/config';
import { etiquetaNivel } from '@/lib/fidelizacion';

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
async function registrarEnvio(datos: {
  telefono: string;
  resultado: ResultadoEnvio;
  texto: string | null;
  plantilla?: string;
  enviadoPor?: string | null;
  sequenceId?: string | null;
}) {
  return conBaseDeDatos(async (db) =>
    db.transaction(async (tx) => {
      const [comensal] = await tx
        .select({ id: b2cConsumers.id })
        .from(b2cConsumers)
        .where(sql`regexp_replace(${b2cConsumers.whatsappPhone}, '\\D', '', 'g') = ${datos.telefono}`)
        .limit(1);

      const [conversacion] = await tx
        .insert(chatConversations)
        .values({
          telefono: datos.telefono,
          consumerId: comensal?.id ?? null,
          ultimoMensajeEn: new Date(),
        })
        .onConflictDoUpdate({
          target: chatConversations.telefono,
          set: {
            ultimoMensajeEn: new Date(),
            updatedAt: new Date(),
            consumerId: comensal?.id ?? sql`${chatConversations.consumerId}`,
          },
        })
        .returning({ id: chatConversations.id });

      const exito = datos.resultado.ok;

      const [mensaje] = await tx
        .insert(chatMessages)
        .values({
          conversationId: conversacion.id,
          wamid: exito ? datos.resultado.wamid : null,
          direccion: 'saliente',
          tipo: datos.plantilla ? 'plantilla' : 'texto',
          texto: datos.texto,
          // 'enviado' y no 'entregado': lo entregado lo confirma el webhook de
          // estado, no la aceptación de Meta.
          estado: exito ? 'enviado' : 'fallido',
          errorCodigo: exito ? null : datos.resultado.codigo,
          errorMensaje: exito ? null : datos.resultado.mensaje,
          plantilla: datos.plantilla ?? null,
          enviadoPor: datos.enviadoPor ?? null,
          sequenceId: datos.sequenceId ?? null,
        })
        .returning({ id: chatMessages.id });

      return { conversacionId: conversacion.id, mensajeId: mensaje.id, comensalId: comensal?.id ?? null };
    })
  );
}

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

/** Variables de un comensal, para rellenar la plantilla. */
async function variablesDe(consumerId: string): Promise<Record<string, string>> {
  return conBaseDeDatos(async (db) => {
    const [c] = await db.select().from(b2cConsumers).where(eq(b2cConsumers.id, consumerId)).limit(1);
    // El objeto vacío se anota: sin el tipo, TypeScript une `{}` con la forma
    // completa y el resultado deja de encajar en Record<string, string>.
    if (!c) return {} as Record<string, string>;

    const [actividad] = await db
      .select({
        momentos: sql<number>`COUNT(*)::int`,
        ultimo: sql<Date | null>`MAX(${sensoryMoments.scannedAt})`,
      })
      .from(sensoryMoments)
      .where(eq(sensoryMoments.consumerId, consumerId));

    const [ultimoBar] = await db
      .select({ bar: accounts.name, zona: accounts.zone })
      .from(sensoryMoments)
      .innerJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
      .where(eq(sensoryMoments.consumerId, consumerId))
      .orderBy(desc(sensoryMoments.scannedAt))
      .limit(1);

    const preferencias = (c.flavorPreference ?? {}) as Record<string, number>;
    const favorita = Object.entries(preferencias).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dias = actividad?.ultimo
      ? Math.floor((Date.now() - new Date(actividad.ultimo).getTime()) / 86_400_000)
      : 0;

    return {
      nombre: c.fullName ?? 'comensal',
      puntos: String(c.points ?? 0),
      nivel: etiquetaNivel(c.membershipTier),
      linea: favorita ?? 'tu línea favorita',
      bar: ultimoBar?.bar ?? 'tu bar habitual',
      zona: ultimoBar?.zona ?? 'tu zona',
      dias: String(dias),
      momentos: String(actividad?.momentos ?? 0),
    };
  });
}

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
}): Promise<Resultado<{ wamid: string }>> {
  return ejecutar('enviarPlantilla', async () => {
    const actor = await exigir('campanas.activar');

    const comensal = await conBaseDeDatos(async (db) => {
      const [c] = await db
        .select({ telefono: b2cConsumers.whatsappPhone, nombre: b2cConsumers.fullName })
        .from(b2cConsumers)
        .where(eq(b2cConsumers.id, datos.consumerId))
        .limit(1);
      return c;
    });

    if (!comensal) throw new Error('El comensal no existe');

    const telefono = normalizarTelefono(comensal.telefono);
    if (!telefono) throw new Error(`El teléfono "${comensal.telefono}" no es válido`);

    const valores = await variablesDe(datos.consumerId);

    const componentes: ComponentePlantilla[] = datos.variables?.length
      ? [{
          type: 'body',
          parameters: datos.variables.map((v) => ({
            type: 'text' as const,
            // Un hueco vacío hace que Meta rechace el envío con 132000.
            text: valores[v] ?? '—',
          })),
        }]
      : [];

    const resultado = await sendTemplateMessage({
      to: telefono,
      templateName: datos.templateName,
      languageCode: datos.languageCode,
      components: componentes,
    });

    // Texto aproximado de lo que verá el comensal, para que el hilo del CRM se
    // pueda leer. El de verdad lo compone Meta con su plantilla.
    const aproximado = datos.variables?.length
      ? `[${datos.templateName}] ${datos.variables.map((v) => valores[v] ?? '—').join(' · ')}`
      : `[${datos.templateName}]`;

    const registro = await registrarEnvio({
      telefono,
      resultado,
      texto: aproximado,
      plantilla: datos.templateName,
      enviadoPor: actor.id || null,
      sequenceId: datos.sequenceId ?? null,
    });

    // La secuencia también deja su rastro en automation_logs, que es donde vive
    // el embudo de la pantalla de mensajería.
    if (datos.sequenceId) {
      await conBaseDeDatos((db) =>
        db.insert(automationLogs).values({
          sequenceId: datos.sequenceId!,
          consumerId: datos.consumerId,
          status: resultado.ok ? 'sent' : 'failed',
          sentAt: new Date(),
          errorMessage: resultado.ok ? null : resultado.mensaje,
        })
      );
    }

    if (!resultado.ok) throw new Error(resultado.mensaje);

    log.info('Plantilla enviada por WhatsApp', {
      ruta: '/acciones/whatsapp',
      detalle: [actor.email, datos.templateName, telefono],
    });

    return { wamid: resultado.wamid, conversacionId: registro.conversacionId };
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

    const resultado = await sendTemplateMessage({
      to: telefono,
      templateName: datos.templateName,
      languageCode: datos.languageCode,
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
