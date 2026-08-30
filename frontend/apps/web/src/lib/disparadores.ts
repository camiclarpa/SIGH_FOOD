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
  sensoryMoments,
} from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { despacharPorMejorCanal, variablesDe, ACTOR_SISTEMA } from '@/lib/whatsapp/despacho';
import { rellenarPlantilla } from '@/lib/plantillas';
import { tablaRFM } from '@/lib/rfm';
import { comensalesDelSegmentoPorNombre } from '@/lib/segmentacion';

/** Disparadores que este evaluador sabe resolver. */
export const DISPARADORES_SOPORTADOS = [
  'signup',
  'first_purchase',
  'inactive_30_days',
  'churn_risk',
  'referral_conversion',
  'abandoned_cart',
  /** Primer escaneo del QR — en mesa o de una bolsa comprada. */
  'first_scan',
  /** Sin registrar un momento en 21 días. Ver DIAS_INACTIVO_MOMENTO abajo. */
  'inactive_21_days',
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
 * Días sin un momento sensorial antes de mandar la recuperación corta.
 *
 * Es distinto del umbral de pedidos (30 días) a propósito: dejar de escanear es
 * una señal más temprana que dejar de comprar — alguien puede seguir pidiendo
 * por la tienda sin volver a escanear la bolsa, y viceversa. Veintiún días es el
 * ciclo de recompra típico de un snack, no un número arbitrario.
 */
export const DIAS_INACTIVO_MOMENTO = 21;

/**
 * Tope de envíos por ejecución del cron.
 *
 * Un Worker tiene tiempo limitado y cada envío es una llamada a Meta. Si un día
 * hay quinientos elegibles, salen los primeros y el resto espera a mañana:
 * mejor eso que una ejecución cortada a la mitad sin saber por dónde iba.
 */
export const MAXIMO_POR_EJECUCION = 50;

/**
 * Intentos fallidos antes de rendirse con una persona.
 *
 * Un fallo no puede cerrar la puerta para siempre —ver abajo—, pero reintentar
 * sin límite tampoco: un número que ya no existe daría error cada día
 * indefinidamente, y esos errores repetidos son justo lo que Meta mira para
 * bajarle la calificación al remitente.
 */
export const MAXIMO_INTENTOS = 3;

/**
 * A quién NO se le puede volver a mandar esta secuencia.
 *
 * Se consulta la base y no se lleva la cuenta en memoria: el cron puede
 * repetirse —reintento, dos regiones— y la segunda vuelta tiene que ver lo de
 * la primera.
 *
 * OJO CON QUÉ CUENTA COMO "YA RECIBIDO"
 * -------------------------------------
 * Antes bastaba con que EXISTIERA una fila, sin mirar su estado. El efecto era
 * grave y silencioso: Meta acepta un envío y devuelve un identificador, y solo
 * después decide que falló —sin saldo, número inválido, plantilla pausada—. Esa
 * fila quedaba marcada como enviada y la persona se daba por atendida para
 * siempre, así que al resolver el problema NO recibía nunca su bienvenida.
 *
 * Ocurrió de verdad con el error 131042, cuenta sin método de pago: el mensaje
 * no llegó a ningún teléfono y el CRM lo daba por hecho.
 *
 * Ahora se excluye a quien ya lo recibió DE VERDAD, y a quien ha fallado
 * demasiadas veces como para seguir insistiendo.
 */
async function yaRecibieron(db: Database, sequenceId: string): Promise<string[]> {
  const filas = await db
    .select({
      consumerId: automationLogs.consumerId,
      entregados: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.status} = 'sent')::int`,
      fallidos: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.status} <> 'sent')::int`,
    })
    .from(automationLogs)
    .where(eq(automationLogs.sequenceId, sequenceId))
    .groupBy(automationLogs.consumerId);

  return filas
    .filter((f) => Number(f.entregados) > 0 || Number(f.fallidos) >= MAXIMO_INTENTOS)
    .map((f) => f.consumerId)
    .filter((id): id is string => Boolean(id));
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

    case 'first_scan': {
      /*
        Su primer momento sensorial, sea en una mesa o en una bolsa comprada en
        casa. Es el disparador de bienvenida al escanear: "primer escaneo ->
        cupón inmediato" que se pidió como automatización explícita.

        Con exactamente UN momento hasta la fecha del corte: si tiene dos o más,
        ya pasó por aquí antes y `yaRecibieron` lo habría filtrado igualmente,
        pero exigirlo aquí evita incluso calcular sobre alguien que claramente
        no es su primera vez.
      */
      const filas = await db
        .select({ id: sensoryMoments.consumerId })
        .from(sensoryMoments)
        .where(lt(sensoryMoments.scannedAt, limite))
        .groupBy(sensoryMoments.consumerId)
        .having(sql`count(*) = 1`)
        .limit(500);
      return filas.map((f) => f.id).filter((id): id is string => Boolean(id));
    }

    case 'inactive_21_days': {
      const corte = new Date(Date.now() - DIAS_INACTIVO_MOMENTO * 24 * 3_600_000);
      // Con al menos un momento: a quien nunca ha escaneado no se le puede
      // decir "tu momento te está esperando" sin que suene raro — nunca hubo un
      // primer momento del que hablar.
      const filas = await db
        .select({ id: sensoryMoments.consumerId })
        .from(sensoryMoments)
        .where(sql`${sensoryMoments.consumerId} IS NOT NULL`)
        .groupBy(sensoryMoments.consumerId)
        .having(sql`max(${sensoryMoments.scannedAt}) < ${corte}`)
        .limit(500);
      return filas.map((f) => f.id).filter((id): id is string => Boolean(id));
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

      /*
        Antes aquí se exigían dos cosas: canal 'whatsapp' y una plantilla
        aprobada en Meta. Las dos han dejado de tener sentido.

        Una secuencia ya no tiene UN canal fijo: lo elige lib/canal.ts en el
        momento del envío, comensal por comensal. La misma campaña puede salir
        por texto libre para quien escribió esta mañana y por Web Push para quien
        no. Fijarlo por adelantado era decidir con información de ayer.

        Y la plantilla de Meta ha pasado de obligatoria a opcional: Web Push no
        la necesita. Exigirla dejaba fuera justo el contenido que Meta no deja
        mandar —bienvenidas, encuestas, reactivaciones—, que es el que ahora
        tiene camino.

        Lo único imprescindible es el texto del CRM: es lo que se lee en la
        notificación y en el mensaje libre.
      */
      if (secuencia.channel !== 'whatsapp' && secuencia.channel !== 'push') {
        resultados.push({
          ...base,
          motivo: `canal ${secuencia.channel}: solo se envían WhatsApp y notificaciones`,
        });
        continue;
      }
      if (!secuencia.template?.trim()) {
        resultados.push({ ...base, motivo: 'la secuencia no tiene texto que enviar' });
        continue;
      }

      try {
        const candidatos = await elegiblesPara(db, secuencia.trigger, {
          horasDeEspera: secuencia.delayHours ?? 0,
        });

        /*
          Segmento objetivo.

          El campo existía y no lo miraba nadie, así que una campaña dirigida a
          "En riesgo de olvido" salía a todo el que cumpliera el disparador. Es
          la diferencia entre segmentar y decir que se segmenta.

          Si el segmento no tiene a nadie, no se manda: es preferible una
          campaña que no sale a una que sale a quien no debía. Y se dice por qué,
          porque el síntoma —"activé la campaña y no pasó nada"— no apunta solo.
        */
        let dirigidos = candidatos;
        if (secuencia.targetSegment?.trim()) {
          const delSegmento = new Set(
            await comensalesDelSegmentoPorNombre(db, secuencia.targetSegment.trim())
          );
          dirigidos = candidatos.filter((id) => delSegmento.has(id));

          if (delSegmento.size === 0) {
            resultados.push({
              ...base,
              motivo: `el segmento "${secuencia.targetSegment}" no tiene a nadie hoy`,
            });
            continue;
          }
        }

        const recibidos = new Set(await yaRecibieron(db, secuencia.id));
        const pendientes = dirigidos.filter((id) => !recibidos.has(id));
        base.elegibles = pendientes.length;

        for (const consumerId of pendientes) {
          if (presupuesto <= 0) {
            base.motivo = 'se alcanzó el tope de envíos de esta ejecución; el resto sale mañana';
            break;
          }

          /*
            El texto se resuelve AQUÍ, no dentro del despachador.

            Para la plantilla de Meta las variables las sustituye Meta con sus
            huecos numerados. Para Web Push y para el texto libre las tenemos que
            poner nosotros, y lo que se manda es el texto del CRM con sus
            {{nombre}} ya rellenos.
          */
          const valores = await variablesDe(consumerId);
          const texto = rellenarPlantilla(secuencia.template, valores);

          const r = await despacharPorMejorCanal(
            {
              consumerId,
              sequenceId: secuencia.id,
              texto,
              // El título de la notificación es el nombre de la secuencia: es lo
              // que se lee en grande en la pantalla bloqueada, y "Reactivación
              // 15 días" no dice nada a quien lo recibe. Se usa la marca.
              titulo: 'Bocazo',
              url: '/',
              templateName: secuencia.metaTemplateName,
              languageCode: secuencia.metaTemplateLang,
              variables: secuencia.metaTemplateVars ?? [],
              categoria: secuencia.categoriaMeta,
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
