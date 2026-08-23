// =============================================================================
// Qué secuencia le toca a quién
// =============================================================================
//
// Las secuencias del CRM tenían un disparador —`first_purchase`,
// `inactive_30_days`, `signup`…— y nadie lo evaluaba nunca. Estaban guardadas,
// con su plantilla de Meta lista, y no salían jamás: no existía el proceso que
// mirara quién cumple la condición. Cuatro campañas escritas y cero enviadas.
//
// Esto es ese proceso. Lo llama el cron una vez al día.
//
// TRES REGLAS QUE NO SE NEGOCIAN
// ------------------------------
// 1. Solo se evalúan secuencias en estado 'active'. Un borrador es un borrador,
//    y el editor tiene que poder guardar sin miedo a que salga.
//
// 2. Una secuencia no se repite sobre la misma persona. Lo garantiza consultar
//    automation_logs, no una marca en memoria: el cron puede ejecutarse dos
//    veces —reintento, dos regiones— y la segunda debe ver lo que hizo la
//    primera.
//
// 3. El tope de frecuencia manda por encima de todo. Vive en despacharPlantilla
//    y se aplica aunque aquí se considere a alguien elegible: es preferible
//    saltarse un mensaje que perder el número.
//
// SOBRE `birthday`
// ----------------
// No se implementa. `b2c_consumers` no guarda fecha de nacimiento, así que no
// hay forma de saber cuándo es. Devolver una lista vacía y decirlo es honesto;
// inventar una aproximación —"el aniversario de su alta"— sería mandar
// felicitaciones de cumpleaños en fechas equivocadas.

import { and, eq, gte, isNull, lt, notInArray, sql } from 'drizzle-orm';
import {
  automationLogs,
  automationSequences,
  b2cConsumers,
  pedidos,
  referrals,
} from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { despacharPlantilla, ACTOR_SISTEMA } from '@/lib/whatsapp/despacho';
import { tablaRFM } from '@/lib/rfm';

/** Disparadores que este evaluador sabe resolver. */
export const DISPARADORES_SOPORTADOS = [
  'signup',
  'first_purchase',
  'inactive_30_days',
  'churn_risk',
  'referral_conversion',
  'abandoned_cart',
] as const;

export type DisparadorSoportado = (typeof DISPARADORES_SOPORTADOS)[number];

/**
 * Cuántos días sin actividad para considerar inactivo.
 *
 * El disparador se llama `inactive_30_days` y el número vive aquí, no dentro de
 * una consulta: si algún día se quiere probar a los 21, se cambia en un sitio.
 */
export const DIAS_INACTIVO = 30;

/**
 * Tope de envíos por ejecución del cron.
 *
 * Un Worker tiene tiempo limitado y cada envío es una llamada a Meta. Si un día
 * hay quinientos elegibles, salen los primeros y el resto espera a mañana:
 * mejor eso que una ejecución cortada a la mitad sin saber por dónde iba.
 */
export const MAXIMO_POR_EJECUCION = 50;

/**
 * A quién NO se le puede volver a mandar esta secuencia.
 *
 * Se consulta la base y no se lleva la cuenta en memoria por lo dicho arriba:
 * el cron puede repetirse y la segunda vuelta tiene que ver lo de la primera.
 */
async function yaRecibieron(db: Database, sequenceId: string): Promise<string[]> {
  const filas = await db
    .select({ consumerId: automationLogs.consumerId })
    .from(automationLogs)
    .where(eq(automationLogs.sequenceId, sequenceId));

  return filas.map((f) => f.consumerId).filter((id): id is string => Boolean(id));
}

/**
 * Comensales que cumplen la condición de un disparador.
 *
 * Devuelve solo identificadores: quién los merece es una decisión, y mandarles
 * el mensaje es otra. Separarlas permite probar la primera sin gastar
 * conversaciones de Meta.
 */
export async function elegiblesPara(
  db: Database,
  disparador: string,
  opciones: { horasDeEspera: number }
): Promise<string[]> {
  // La espera configurada en la secuencia: no se le escribe a alguien en el
  // mismo segundo en que se registra.
  const limite = new Date(Date.now() - opciones.horasDeEspera * 3_600_000);

  switch (disparador) {
    case 'signup': {
      const filas = await db
        .select({ id: b2cConsumers.id })
        .from(b2cConsumers)
        .where(lt(b2cConsumers.createdAt, limite))
        .limit(500);
      return filas.map((f) => f.id);
    }

    case 'first_purchase': {
      // Su primer pedido ENTREGADO. Antes de entregar aún puede cancelarse, y
      // felicitar por una compra que no ocurrió es peor que callarse.
      const filas = await db
        .select({ id: pedidos.consumerId })
        .from(pedidos)
        .where(and(eq(pedidos.estado, 'entregado'), lt(pedidos.createdAt, limite)))
        .groupBy(pedidos.consumerId)
        .having(sql`count(*) = 1`)
        .limit(500);
      return filas.map((f) => f.id).filter((id): id is string => Boolean(id));
    }

    case 'inactive_30_days': {
      const corte = new Date(Date.now() - DIAS_INACTIVO * 24 * 3_600_000);
      // Con al menos un pedido: alguien que nunca compró no está "inactivo",
      // simplemente no ha empezado, y le corresponde otro mensaje.
      const filas = await db
        .select({ id: pedidos.consumerId })
        .from(pedidos)
        .where(eq(pedidos.estado, 'entregado'))
        .groupBy(pedidos.consumerId)
        .having(sql`max(${pedidos.createdAt}) < ${corte}`)
        .limit(500);
      return filas.map((f) => f.id).filter((id): id is string => Boolean(id));
    }

    case 'churn_risk': {
      // Aquí se nota la diferencia con el churnScore que inventaba el modelo:
      // esto es "lleva más de vez y media SU intervalo habitual sin aparecer",
      // que se puede explicar y sale igual dos veces seguidas.
      const filas = await tablaRFM(db, 500);
      return filas.filter((f) => f.enRiesgo).map((f) => f.consumerId);
    }

    case 'referral_conversion': {
      const filas = await db
        .select({ id: referrals.referrerId })
        .from(referrals)
        .where(and(eq(referrals.status, 'converted'), lt(referrals.createdAt, limite)))
        .limit(500);
      return filas.map((f) => f.id);
    }

    case 'abandoned_cart': {
      /*
        Llegó al checkout y no pagó.

        Se mira sobre pedidos y no sobre el embudo a propósito: el embudo guarda
        sesiones anónimas, sin teléfono, y a una sesión anónima no se le puede
        escribir. Un pedido creado y nunca pagado sí tiene a quién avisar.
      */
      const filas = await db
        .select({ id: pedidos.consumerId })
        .from(pedidos)
        .where(
          and(
            eq(pedidos.estado, 'recibido'),
            eq(pedidos.estadoPago, 'pendiente'),
            lt(pedidos.createdAt, limite),
            // Y que no sea tan viejo que recordarlo resulte extraño.
            gte(pedidos.createdAt, new Date(Date.now() - 3 * 24 * 3_600_000))
          )
        )
        .limit(500);
      return filas.map((f) => f.id).filter((id): id is string => Boolean(id));
    }

    default:
      // Incluye 'birthday'. Ver la nota de la cabecera.
      return [];
  }
}

export interface ResultadoSecuencia {
  secuencia: string;
  disparador: string;
  elegibles: number;
  enviados: number;
  frenadosPorTope: number;
  fallidos: number;
  motivo?: string;
}

/**
 * Evalúa todas las secuencias activas y manda lo que toque.
 *
 * Nunca lanza. Devuelve el detalle de cada secuencia para que el cron lo
 * registre: una automatización que falla en silencio es peor que no tenerla,
 * porque nadie se entera de que dejó de mandar.
 */
export async function ejecutarSecuencias(): Promise<ResultadoSecuencia[]> {
  return conBaseDeDatos(async (db) => {
    const activas = await db
      .select()
      .from(automationSequences)
      .where(eq(automationSequences.status, 'active'));

    const resultados: ResultadoSecuencia[] = [];
    let presupuesto = MAXIMO_POR_EJECUCION;

    for (const secuencia of activas) {
      const base: ResultadoSecuencia = {
        secuencia: secuencia.name,
        disparador: secuencia.trigger,
        elegibles: 0,
        enviados: 0,
        frenadosPorTope: 0,
        fallidos: 0,
      };

      // Sin plantilla aprobada en Meta no hay nada que mandar fuera de la
      // ventana de 24 h, que es donde vive una campaña.
      if (secuencia.channel !== 'whatsapp') {
        resultados.push({ ...base, motivo: `canal ${secuencia.channel}: solo se envía WhatsApp` });
        continue;
      }
      if (!secuencia.metaTemplateName?.trim()) {
        resultados.push({ ...base, motivo: 'sin plantilla de Meta configurada' });
        continue;
      }

      try {
        const candidatos = await elegiblesPara(db, secuencia.trigger, {
          horasDeEspera: secuencia.delayHours ?? 0,
        });

        const recibidos = new Set(await yaRecibieron(db, secuencia.id));
        const pendientes = candidatos.filter((id) => !recibidos.has(id));
        base.elegibles = pendientes.length;

        for (const consumerId of pendientes) {
          if (presupuesto <= 0) {
            base.motivo = 'se alcanzó el tope de envíos de esta ejecución; el resto sale mañana';
            break;
          }

          const r = await despacharPlantilla(
            {
              consumerId,
              templateName: secuencia.metaTemplateName.trim(),
              languageCode: secuencia.metaTemplateLang ?? 'es',
              variables: secuencia.metaTemplateVars ?? [],
              sequenceId: secuencia.id,
            },
            ACTOR_SISTEMA
          );

          presupuesto--;

          if (r.ok) base.enviados++;
          else if (r.frenadoPorTope) base.frenadosPorTope++;
          else base.fallidos++;
        }
      } catch (e) {
        // Una secuencia rota no puede impedir que salgan las demás.
        base.motivo = e instanceof Error ? e.message : 'error al evaluar';
        log.error('Fallo al evaluar una secuencia', e, {
          ruta: '/disparadores',
          detalle: secuencia.name,
        });
      }

      resultados.push(base);
    }

    return resultados;
  });
}
