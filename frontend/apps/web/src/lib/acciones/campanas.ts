'use server';

// =============================================================================
// Acciones de mensajería
// =============================================================================
//
// Activar una secuencia no es guardar un registro: es empezar a mandar mensajes
// a los móviles de personas reales. Por eso `campanas.activar` es un permiso
// aparte de `campanas.editar`, y el envío de prueba existe para que nadie
// descubra una errata con mil destinatarios delante.

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { automationSequences, b2cConsumers, sensoryMoments, accounts } from '@sighfood/domain/db/schema';
import { desc, sql } from 'drizzle-orm';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';
import { etiquetaNivel } from '@/lib/fidelizacion';
import { VARIABLES, variablesDesconocidas, rellenarPlantilla, motivoNoEnviable } from '@/lib/plantillas';
import { enviarPlantilla } from '@/lib/acciones/whatsapp';

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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/campanas' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

// -----------------------------------------------------------------------------
// Edición
// -----------------------------------------------------------------------------

export async function guardarSecuencia(datos: {
  id?: string;
  name: string;
  trigger: string;
  channel: string;
  template: string;
  delayHours: number;
  targetSegment?: string | null;
  /** Nombre exacto de la plantilla aprobada en Meta. Solo para WhatsApp. */
  metaTemplateName?: string | null;
  metaTemplateLang?: string | null;
  /** Claves del CRM en el orden de {{1}}, {{2}}… de la plantilla de Meta. */
  metaTemplateVars?: string[] | null;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarSecuencia', async () => {
    await exigir('campanas.editar');

    if (!datos.name.trim()) throw new Error('El nombre es obligatorio');
    if (!datos.template.trim()) throw new Error('El mensaje no puede estar vacío');

    // Se comprueba antes de guardar, no antes de enviar: al enviar ya es tarde.
    const desconocidas = variablesDesconocidas(datos.template);
    if (desconocidas.length > 0) {
      throw new Error(
        `Variables que no existen: ${desconocidas.map((d) => `{{${d}}}`).join(', ')}. ` +
        `Disponibles: ${VARIABLES.map((v) => `{{${v.clave}}}`).join(', ')}`
      );
    }

    // El mapeo de huecos apunta a variables del CRM: una clave inventada
    // llegaría a Meta como '—' y el comensal leería un guion en mitad de la
    // frase. Se rechaza aquí, no en el envío.
    const mapeo = (datos.metaTemplateVars ?? []).map((v) => v.trim()).filter(Boolean);
    const invalidas = mapeo.filter((v) => !VARIABLES.some((d) => d.clave === v));
    if (invalidas.length > 0) {
      throw new Error(
        `Variables de plantilla que no existen: ${invalidas.join(', ')}. ` +
        `Disponibles: ${VARIABLES.map((v) => v.clave).join(', ')}`
      );
    }

    return conBaseDeDatos(async (db) => {
      const valores = {
        name: datos.name.trim(),
        trigger: datos.trigger as never,
        channel: datos.channel as never,
        template: datos.template.trim(),
        delayHours: Math.max(0, datos.delayHours),
        targetSegment: datos.targetSegment?.trim() || null,
        metaTemplateName: datos.metaTemplateName?.trim() || null,
        // Meta rechaza el envío si el idioma no es exactamente el aprobado; por
        // defecto 'es', que es con el que se aprueban las plantillas del CRM.
        metaTemplateLang: datos.metaTemplateLang?.trim() || 'es',
        metaTemplateVars: mapeo.length > 0 ? mapeo : null,
        updatedAt: new Date(),
      };

      const [fila] = datos.id
        ? await db.update(automationSequences).set(valores)
            .where(eq(automationSequences.id, datos.id)).returning({ id: automationSequences.id })
        // Una secuencia nueva nace en borrador: crearla y que empiece a enviar
        // en el mismo gesto es demasiado fácil de hacer sin querer.
        : await db.insert(automationSequences).values({ ...valores, status: 'draft' })
            .returning({ id: automationSequences.id });

      if (!fila) throw new Error('La secuencia no existe');
      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/mensajeria');
    return r;
  });
}

/**
 * Activa o pausa una secuencia.
 *
 * Activar exige un permiso propio: a partir de ese instante empiezan a salir
 * mensajes reales. Pausar solo exige editar, porque parar nunca hace daño.
 */
export async function alternarSecuencia(id: string, activar: boolean): Promise<Resultado> {
  return ejecutar('alternarSecuencia', async () => {
    const actor = await exigir(activar ? 'campanas.activar' : 'campanas.editar');

    return conBaseDeDatos(async (db) => {
      const [secuencia] = await db.select().from(automationSequences)
        .where(eq(automationSequences.id, id)).limit(1);
      if (!secuencia) throw new Error('La secuencia no existe');

      if (activar) {
        const malas = variablesDesconocidas(secuencia.template ?? '');
        if (malas.length > 0) {
          throw new Error(`No se puede activar: variables sin definir ${malas.map((m) => `{{${m}}}`).join(', ')}`);
        }

        // Una secuencia de WhatsApp sin plantilla de Meta no puede enviar nada:
        // fuera de la ventana de 24 h la Cloud API solo acepta plantillas
        // aprobadas. Antes se dejaba activar igualmente y la campaña quedaba en
        // "activa" sin mandar un solo mensaje, que es el peor fallo posible:
        // silencioso.
        const impedimento = motivoNoEnviable(secuencia);
        if (impedimento) throw new Error(`No se puede activar: ${impedimento}`);
      }

      await db.update(automationSequences)
        .set({ status: activar ? 'active' : 'paused', updatedAt: new Date() })
        .where(eq(automationSequences.id, id));

      log.info(activar ? 'Campaña activada' : 'Campaña pausada', {
        ruta: '/acciones/campanas',
        detalle: [actor.email, secuencia.name ?? id],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/mensajeria');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Vista previa
// -----------------------------------------------------------------------------

/**
 * Rellena la plantilla con los datos reales de un comensal.
 *
 * Es una vista previa, no un envío: no toca Meta ni gasta conversación. Para
 * mandar de verdad están enviarSecuencia() y, sin destinatario registrado,
 * enviarPrueba().
 *
 * Ojo con lo que enseña: este es el texto del CRM, y fuera de la ventana de
 * 24 h lo que llega al móvil es la plantilla aprobada en Meta, no esto. La
 * previa sirve para comprobar que las variables se rellenan, no para dar por
 * bueno el texto final.
 */
export async function previsualizar(datos: {
  plantilla: string;
  consumerId?: string;
}): Promise<Resultado<{ mensaje: string; comensal: string; avisos: string[] }>> {
  return ejecutar('previsualizar', async () => {
    await exigir('campanas.probar');

    const desconocidas = variablesDesconocidas(datos.plantilla);

    return conBaseDeDatos(async (db) => {
      // Sin comensal indicado se usa el más reciente: una vista previa con
      // valores inventados no enseña cómo quedará de verdad.
      const [c] = datos.consumerId
        ? await db.select().from(b2cConsumers).where(eq(b2cConsumers.id, datos.consumerId)).limit(1)
        : await db.select().from(b2cConsumers).orderBy(desc(b2cConsumers.createdAt)).limit(1);

      if (!c) {
        return {
          mensaje: datos.plantilla,
          comensal: 'sin comensales en la base',
          avisos: ['No hay ningún comensal con el que previsualizar'],
        };
      }

      const [actividad] = await db
        .select({
          momentos: sql<number>`COUNT(*)::int`,
          ultimo: sql<Date | null>`MAX(${sensoryMoments.scannedAt})`,
        })
        .from(sensoryMoments)
        .where(eq(sensoryMoments.consumerId, c.id));

      const [ultimoBar] = await db
        .select({ bar: accounts.name, zona: accounts.zone })
        .from(sensoryMoments)
        .innerJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
        .where(eq(sensoryMoments.consumerId, c.id))
        .orderBy(desc(sensoryMoments.scannedAt))
        .limit(1);

      const preferencias = (c.flavorPreference ?? {}) as Record<string, number>;
      const favorita = Object.entries(preferencias).sort((a, b) => b[1] - a[1])[0]?.[0];
      const dias = actividad?.ultimo
        ? Math.floor((Date.now() - new Date(actividad.ultimo).getTime()) / 86_400_000)
        : null;

      const avisos = [...desconocidas.map((d) => `{{${d}}} no existe y se enviará tal cual`)];

      const valores: Record<string, string> = {
        nombre: c.fullName ?? 'comensal',
        puntos: String(c.points ?? 0),
        nivel: etiquetaNivel(c.membershipTier),
        linea: favorita ?? 'tu línea favorita',
        bar: ultimoBar?.bar ?? 'tu bar habitual',
        zona: ultimoBar?.zona ?? 'tu zona',
        dias: dias === null ? 'varios' : String(dias),
        momentos: String(actividad?.momentos ?? 0),
      };

      // Un dato ausente se avisa: el mensaje diría "tu bar habitual" en lugar
      // del nombre real, y conviene saberlo antes de enviarlo.
      if (!ultimoBar && /\{\{(bar|zona)\}\}/.test(datos.plantilla)) {
        avisos.push('Ese comensal no tiene bar registrado: se usará un texto genérico');
      }

      return {
        mensaje: rellenarPlantilla(datos.plantilla, valores),
        comensal: `${c.fullName ?? 'Sin nombre'} · ${c.whatsappPhone}`,
        avisos,
      };
    });
  });
}

// -----------------------------------------------------------------------------
// Envío real
// -----------------------------------------------------------------------------

/**
 * Envía una secuencia a un comensal, por la plantilla aprobada en Meta.
 *
 * Es el puente entre el constructor de campañas y la pasarela: la secuencia
 * aporta QUÉ plantilla y en qué orden van sus huecos, y enviarPlantilla() se
 * ocupa del resto (normalizar el teléfono, resolver las variables del comensal,
 * llamar a la Cloud API y dejar el mensaje en el hilo de la bandeja).
 *
 * No comprueba el estado de la secuencia: se usa tanto desde una campaña activa
 * como desde el editor para probar con un comensal real, y exigir 'active' haría
 * imposible lo segundo. Quien no deba enviar lo para el permiso.
 */
export async function enviarSecuencia(datos: {
  sequenceId: string;
  consumerId: string;
}): Promise<Resultado<{ wamid: string }>> {
  return ejecutar('enviarSecuencia', async () => {
    await exigir('campanas.activar');

    const secuencia = await conBaseDeDatos(async (db) => {
      const [s] = await db
        .select()
        .from(automationSequences)
        .where(eq(automationSequences.id, datos.sequenceId))
        .limit(1);
      return s;
    });

    if (!secuencia) throw new Error('La secuencia no existe');
    if (secuencia.channel !== 'whatsapp') {
      throw new Error(`Esta secuencia es de ${secuencia.channel}: la pasarela solo envía WhatsApp`);
    }
    if (!secuencia.metaTemplateName?.trim()) {
      throw new Error('La secuencia no tiene plantilla de Meta configurada');
    }

    const r = await enviarPlantilla({
      consumerId: datos.consumerId,
      templateName: secuencia.metaTemplateName.trim(),
      languageCode: secuencia.metaTemplateLang ?? 'es',
      variables: secuencia.metaTemplateVars ?? [],
      sequenceId: secuencia.id,
    });

    // enviarPlantilla ya deja el fallo registrado en automation_logs y en el
    // hilo; aquí solo se propaga para que la interfaz lo enseñe.
    if (!r.ok || !r.datos) throw new Error(r.error ?? 'No se pudo enviar');
    return { wamid: r.datos.wamid };
  }).then((r) => {
    if (r.ok) { revalidatePath('/mensajeria'); revalidatePath('/bandeja'); }
    return r;
  });
}
