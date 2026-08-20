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
import { VARIABLES, variablesDesconocidas, rellenarPlantilla } from '@/lib/plantillas';

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

    return conBaseDeDatos(async (db) => {
      const valores = {
        name: datos.name.trim(),
        trigger: datos.trigger as never,
        channel: datos.channel as never,
        template: datos.template.trim(),
        delayHours: Math.max(0, datos.delayHours),
        targetSegment: datos.targetSegment?.trim() || null,
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
 * Es una vista previa, no un envío: el CRM todavía no tiene pasarela de
 * WhatsApp conectada, y fingir que se envió sería peor que decirlo.
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
