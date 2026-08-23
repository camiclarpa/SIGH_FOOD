// =============================================================================
// El envío de una plantilla, sin sesión
// =============================================================================
//
// Este módulo existe por una razón de seguridad concreta.
//
// Las acciones viven en `lib/acciones/whatsapp.ts`, que empieza por 'use
// server'. En Next, TODO lo que ese archivo exporta se convierte en un punto de
// entrada invocable desde fuera. Si el envío aceptara un parámetro "quién
// actúa", cualquiera podría llamarlo diciendo que es el administrador, y el
// control de permisos dejaría de servir para nada.
//
// Por eso el núcleo del envío está aquí, en un módulo normal que NO es
// invocable en remoto, y hay dos formas de llegar a él:
//
//   · La Server Action, que primero comprueba el permiso de quien la pulsa.
//   · El cron de secuencias, que no tiene sesión porque no hay ninguna persona
//     detrás, y que actúa como ACTOR_SISTEMA.
//
// La otra opción era duplicar el envío para el cron. Se descartó: dos copias de
// la lógica que habla con Meta se separan a la primera corrección, y el día que
// una arregle un fallo la otra seguirá teniéndolo.

import { desc, eq, sql } from 'drizzle-orm';
import {
  accounts,
  automationLogs,
  b2cConsumers,
  chatConversations,
  chatMessages,
  sensoryMoments,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import {
  sendTemplateMessage,
  type ComponentePlantilla,
  type ResultadoEnvio,
} from '@/lib/whatsapp/service';
import { normalizarTelefono } from '@/lib/whatsapp/config';
import { etiquetaNivel } from '@/lib/catalogo-b2c';
import { frecuenciaDe, motivoDelTope } from '@/lib/frecuencia';

/** Quién figura como remitente cuando no hay nadie: el cron de secuencias. */
export const ACTOR_SISTEMA = { id: null as string | null, email: 'sistema (automatización)' };

export interface QuienEnvia {
  /** Null cuando envía el sistema: no hay usuario al que atribuirlo. */
  id: string | null;
  email: string;
}

/** Deja el mensaje en el hilo de la bandeja, salga bien o mal. */
export async function registrarEnvio(datos: {
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

      return {
        conversacionId: conversacion.id,
        mensajeId: mensaje.id,
        comensalId: comensal?.id ?? null,
      };
    })
  );
}

/** Variables de un comensal, para rellenar la plantilla. */
export async function variablesDe(consumerId: string): Promise<Record<string, string>> {
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

export interface ResultadoDespacho {
  ok: boolean;
  wamid?: string;
  conversacionId?: string;
  error?: string;
  /** true si lo paró el tope de frecuencia y no un fallo. */
  frenadoPorTope?: boolean;
}

/**
 * Manda una plantilla a un comensal y deja constancia.
 *
 * No comprueba permisos: quien llama es responsable de haberlo hecho. Ver la
 * explicación de arriba sobre por qué esto no puede vivir en un archivo con
 * 'use server'.
 *
 * Nunca lanza. Devuelve el resultado porque el cron procesa muchos comensales
 * seguidos y un fallo con uno no puede detener a los demás.
 */
export async function despacharPlantilla(
  datos: {
    consumerId: string;
    templateName: string;
    languageCode?: string;
    /** Nombres de variables del CRM, en el orden de la plantilla de Meta. */
    variables?: string[];
    sequenceId?: string;
  },
  quien: QuienEnvia
): Promise<ResultadoDespacho> {
  const comensal = await conBaseDeDatos(async (db) => {
    const [c] = await db
      .select({ telefono: b2cConsumers.whatsappPhone })
      .from(b2cConsumers)
      .where(eq(b2cConsumers.id, datos.consumerId))
      .limit(1);
    return c;
  });

  if (!comensal) return { ok: false, error: 'El comensal no existe' };

  /*
    Tope de impactos comerciales.

    Va aquí porque este es el único punto por el que sale un mensaje de
    campaña: comprobarlo en los llamadores dejaría la puerta abierta al
    siguiente que se escriba.

    No es cortesía. Meta califica el número por cómo reacciona la gente, y una
    calificación baja recorta el límite diario o suspende el envío — la bandeja
    sigue recibiendo pero deja de poder escribir, y recuperarla tarda semanas.
  */
  const frecuencia = await conBaseDeDatos((db) => frecuenciaDe(db, datos.consumerId));
  if (!frecuencia.puede) {
    log.info('Envío detenido por el tope de frecuencia', {
      ruta: '/whatsapp/despacho',
      detalle: [quien.email, datos.consumerId, `${frecuencia.enviados} en la ventana`],
    });
    return { ok: false, error: motivoDelTope(frecuencia), frenadoPorTope: true };
  }

  const telefono = normalizarTelefono(comensal.telefono);
  if (!telefono) return { ok: false, error: `El teléfono "${comensal.telefono}" no es válido` };

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
    enviadoPor: quien.id || null,
    sequenceId: datos.sequenceId ?? null,
  });

  // La secuencia también deja su rastro en automation_logs, que es donde vive
  // el embudo de la pantalla de mensajería Y de dónde sale el cupo de
  // frecuencia. Sin esta fila, el mismo mensaje podría repetirse sin tope.
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

  if (!resultado.ok) return { ok: false, error: resultado.mensaje };

  log.info('Plantilla enviada por WhatsApp', {
    ruta: '/whatsapp/despacho',
    detalle: [quien.email, datos.templateName, telefono],
  });

  return { ok: true, wamid: resultado.wamid, conversacionId: registro.conversacionId };
}
