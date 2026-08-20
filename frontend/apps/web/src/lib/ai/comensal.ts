// =============================================================================
// IA al servicio de la experiencia del comensal
// =============================================================================
//
// Las 14 arquitecturas se construyeron mirando al bar: predecir su abandono,
// puntuar su potencial, proyectar sus ingresos. Aquí se ponen al servicio de la
// persona que está en la mesa.
//
// Tres funciones, tres momentos distintos:
//   · recomendarMaridaje  — mientras consume, para mejorar el momento.
//   · analizarResena      — después, para detectar un fallo de producción.
//   · promocionPersonalizada — cuando se está a punto de perder al comensal.

import { and, count, desc, eq, sql } from 'drizzle-orm';
import {
  b2cConsumers,
  consumerReviews,
  sensoryMoments,
  accounts,
} from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';
import { parseAIJsonResponse } from '@/lib/ai/services/ai-router';
import { perfilPaladar, etiquetaLinea, nivelDeComensal } from '@/lib/fidelizacion';

// -----------------------------------------------------------------------------
// 1. Motor de recomendación sensorial (maridaje)
// -----------------------------------------------------------------------------

export interface Maridaje {
  bebida: string;
  porQue: string;
  intensidad: 'suave' | 'media' | 'intensa';
  alternativa: string;
  siguienteLinea: string;
}

const PROMPT_MARIDAJE = `Eres un experto en maridaje de una marca de salsas y condimentos para hostelería.
Un comensal está en la mesa consumiendo ahora mismo. Recomiéndale con qué bebida acompañarlo,
basándote en su perfil de paladar y en lo que acaba de probar.

Responde SOLO en JSON:
{"bebida":"nombre concreto","porQue":"una frase corta y apetecible","intensidad":"suave|media|intensa","alternativa":"otra opción","siguienteLinea":"qué línea probar después"}

Sé concreto y breve: esto se lee en el móvil, en la mesa, en cinco segundos.`;

/**
 * Recomienda un maridaje para el momento que está ocurriendo.
 *
 * Se apoya en el paladar acumulado del comensal, no solo en lo que acaba de
 * pedir: dos personas con el mismo plato pero distinto historial merecen
 * recomendaciones distintas, y esa diferencia es lo que hace útil el perfil.
 */
export async function recomendarMaridaje(
  db: Database,
  datos: { consumerId: string; lineaActual: string }
): Promise<Maridaje> {
  const [comensal] = await db
    .select({
      nombre: b2cConsumers.fullName,
      preferencias: b2cConsumers.flavorPreference,
    })
    .from(b2cConsumers)
    .where(eq(b2cConsumers.id, datos.consumerId))
    .limit(1);

  const paladar = perfilPaladar((comensal?.preferencias ?? null) as Record<string, number> | null);

  const contexto = {
    lineaQueEstaProbando: etiquetaLinea(datos.lineaActual),
    paladar: paladar
      .filter((l) => l.veces > 0)
      .map((l) => `${l.etiqueta}: ${l.porcentaje}%`),
    lineasSinProbar: paladar.filter((l) => l.veces === 0).map((l) => l.etiqueta),
  };

  const salida = await parseAIJsonResponse<Partial<Maridaje>>(PROMPT_MARIDAJE, JSON.stringify(contexto));

  // El modelo puede omitir campos o inventarse una intensidad: se normaliza
  // antes de que llegue a la pantalla del comensal.
  const INTENSIDADES = ['suave', 'media', 'intensa'] as const;
  return {
    bebida: typeof salida.bebida === 'string' ? salida.bebida : 'Cerveza artesanal',
    porQue: typeof salida.porQue === 'string' ? salida.porQue : '',
    intensidad: INTENSIDADES.includes(salida.intensidad as never)
      ? (salida.intensidad as Maridaje['intensidad'])
      : 'media',
    alternativa: typeof salida.alternativa === 'string' ? salida.alternativa : '',
    siguienteLinea:
      typeof salida.siguienteLinea === 'string'
        ? salida.siguienteLinea
        : (contexto.lineasSinProbar[0] ?? ''),
  };
}

// -----------------------------------------------------------------------------
// 2. Análisis de sentimiento de reseñas
// -----------------------------------------------------------------------------

export interface AnalisisResena {
  sentimiento: 'positivo' | 'neutro' | 'negativo';
  puntuacionSentimiento: number;
  atributos: Record<string, string>;
  alertaCalidad: boolean;
  motivoAlerta: string;
}

const PROMPT_RESENA = `Eres el control de calidad de una marca de salsas y condimentos.
Analiza el comentario de un comensal sobre el producto que acaba de probar.

Tu trabajo NO es medir si le gustó, sino detectar si describe un FALLO DE PRODUCCIÓN:
una tanda demasiado picante, textura arenosa o separada, temperatura incorrecta,
sabor a quemado, envase en mal estado, olor extraño.

"No me gusta el picante" es una preferencia, no un fallo.
"Estaba mucho más picante de lo normal" sí es un fallo.

Responde SOLO en JSON:
{"sentimiento":"positivo|neutro|negativo","puntuacionSentimiento":-1.0 a 1.0,
 "atributos":{"textura":"...","sabor":"...","temperatura":"...","picante":"..."},
 "alertaCalidad":true|false,"motivoAlerta":"qué falla, o cadena vacía"}

En atributos incluye SOLO los que el comentario mencione.`;

/**
 * Analiza una reseña y la marca si sugiere un problema de producción.
 *
 * La distinción entre "no me gustó" y "esto venía mal" es el valor del módulo:
 * lo primero es gusto personal y no hay nada que corregir; lo segundo es una
 * tanda defectuosa que conviene detectar antes de que llegue a más mesas.
 */
export async function analizarResena(
  db: Database,
  reviewId: string
): Promise<AnalisisResena | null> {
  const [resena] = await db
    .select()
    .from(consumerReviews)
    .where(eq(consumerReviews.id, reviewId))
    .limit(1);

  if (!resena?.comentario) return null;

  const salida = await parseAIJsonResponse<Partial<AnalisisResena>>(
    PROMPT_RESENA,
    JSON.stringify({
      linea: etiquetaLinea(resena.productLine),
      puntuacion: resena.puntuacion,
      comentario: resena.comentario,
    })
  );

  const SENTIMIENTOS = ['positivo', 'neutro', 'negativo'] as const;
  const sentimiento = SENTIMIENTOS.includes(salida.sentimiento as never)
    ? (salida.sentimiento as AnalisisResena['sentimiento'])
    : 'neutro';

  const bruto = Number(salida.puntuacionSentimiento);
  const puntuacion = Number.isFinite(bruto) ? Math.max(-1, Math.min(1, bruto)) : 0;

  const analisis: AnalisisResena = {
    sentimiento,
    puntuacionSentimiento: puntuacion,
    atributos: (salida.atributos ?? {}) as Record<string, string>,
    alertaCalidad: salida.alertaCalidad === true,
    motivoAlerta: typeof salida.motivoAlerta === 'string' ? salida.motivoAlerta : '',
  };

  await db
    .update(consumerReviews)
    .set({
      sentimiento: analisis.sentimiento,
      // Columna NUMERIC: Drizzle la espera como string.
      puntuacionSentimiento: analisis.puntuacionSentimiento.toFixed(2),
      atributos: analisis.atributos,
      alertaCalidad: analisis.alertaCalidad,
      analizadaEn: new Date(),
    })
    .where(eq(consumerReviews.id, reviewId));

  return analisis;
}

// -----------------------------------------------------------------------------
// 3. Promociones dinámicas
// -----------------------------------------------------------------------------

export interface PromocionPersonalizada {
  riesgoAbandono: number;
  mensaje: string;
  incentivo: string;
  canal: 'whatsapp' | 'email' | 'sms' | 'push';
  urgencia: 'baja' | 'media' | 'alta';
  porQue: string;
}

const PROMPT_PROMOCION = `Eres el responsable de retención de una marca de salsas para hostelería.
Te doy el perfil de un comensal y cuánto hace que no aparece. Genera un incentivo
personalizado para que vuelva.

Responde SOLO en JSON:
{"mensaje":"texto listo para enviar por WhatsApp, tuteando, máximo 200 caracteres",
 "incentivo":"qué se le ofrece, concreto","canal":"whatsapp|email|sms|push",
 "urgencia":"baja|media|alta","porQue":"por qué este incentivo y no otro"}

El mensaje debe sonar a una marca que le conoce, no a publicidad genérica.
Menciona su línea favorita si la tiene. No prometas nada que no esté en el incentivo.`;

/**
 * Calcula el riesgo de perder al comensal y propone cómo recuperarlo.
 *
 * El riesgo se calcula aquí, no se le pregunta al modelo: es aritmética sobre
 * datos que ya tenemos —días sin aparecer, cuántas veces vino, si llegó a
 * repetir— y un LLM la haría más lenta, más cara y menos reproducible. El
 * modelo se usa para lo que sí sabe hacer: redactar el mensaje.
 */
export async function promocionPersonalizada(
  db: Database,
  consumerId: string
): Promise<PromocionPersonalizada | null> {
  const [comensal] = await db
    .select({
      nombre: b2cConsumers.fullName,
      nivel: b2cConsumers.membershipTier,
      puntos: b2cConsumers.points,
      preferencias: b2cConsumers.flavorPreference,
    })
    .from(b2cConsumers)
    .where(eq(b2cConsumers.id, consumerId))
    .limit(1);

  if (!comensal) return null;

  const [actividad] = await db
    .select({
      momentos: count(sensoryMoments.id),
      ultimo: sql<Date | null>`MAX(${sensoryMoments.scannedAt})`,
    })
    .from(sensoryMoments)
    .where(eq(sensoryMoments.consumerId, consumerId));

  const [ultimoBar] = await db
    .select({ zona: accounts.zone, bar: accounts.name })
    .from(sensoryMoments)
    .innerJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
    .where(eq(sensoryMoments.consumerId, consumerId))
    .orderBy(desc(sensoryMoments.scannedAt))
    .limit(1);

  const momentos = Number(actividad?.momentos ?? 0);
  const diasSinVenir = actividad?.ultimo
    ? Math.floor((Date.now() - new Date(actividad.ultimo).getTime()) / 86_400_000)
    : 999;

  // Riesgo entre 0 y 1. Dos factores: cuánto lleva sin venir y cuán arraigado
  // estaba. Alguien con un solo momento se pierde mucho más fácil que un
  // habitual, así que la frecuencia amortigua el paso del tiempo.
  const porTiempo = Math.min(1, diasSinVenir / 60);
  const arraigo = Math.min(1, momentos / 10);
  const riesgoAbandono = Math.round(Math.max(0, porTiempo * (1 - arraigo * 0.6)) * 100) / 100;

  const paladar = perfilPaladar((comensal.preferencias ?? null) as Record<string, number> | null);

  const salida = await parseAIJsonResponse<Partial<PromocionPersonalizada>>(
    PROMPT_PROMOCION,
    JSON.stringify({
      nombre: comensal.nombre ?? 'comensal',
      nivel: nivelDeComensal(momentos),
      puntosAcumulados: comensal.puntos ?? 0,
      momentosRegistrados: momentos,
      diasSinAparecer: diasSinVenir === 999 ? 'nunca ha escaneado' : diasSinVenir,
      lineaFavorita: paladar[0]?.veces > 0 ? paladar[0].etiqueta : null,
      ultimaZona: ultimoBar?.zona ?? null,
      ultimoBar: ultimoBar?.bar ?? null,
      riesgoCalculado: riesgoAbandono,
    })
  );

  const CANALES = ['whatsapp', 'email', 'sms', 'push'] as const;
  const URGENCIAS = ['baja', 'media', 'alta'] as const;

  return {
    riesgoAbandono,
    mensaje: typeof salida.mensaje === 'string' ? salida.mensaje : '',
    incentivo: typeof salida.incentivo === 'string' ? salida.incentivo : '',
    canal: CANALES.includes(salida.canal as never) ? (salida.canal as PromocionPersonalizada['canal']) : 'whatsapp',
    urgencia: URGENCIAS.includes(salida.urgencia as never)
      ? (salida.urgencia as PromocionPersonalizada['urgencia'])
      // Si el modelo no la da, se deriva del riesgo calculado, que es un dato
      // más fiable que su opinión.
      : riesgoAbandono > 0.6 ? 'alta' : riesgoAbandono > 0.3 ? 'media' : 'baja',
    porQue: typeof salida.porQue === 'string' ? salida.porQue : '',
  };
}

// -----------------------------------------------------------------------------
// Alertas de calidad abiertas
// -----------------------------------------------------------------------------

/** Reseñas marcadas como posible fallo de producción, sin revisar. */
export async function alertasDeCalidad(db: Database, limite = 20) {
  return db
    .select({
      id: consumerReviews.id,
      comentario: consumerReviews.comentario,
      linea: consumerReviews.productLine,
      puntuacion: consumerReviews.puntuacion,
      atributos: consumerReviews.atributos,
      fecha: consumerReviews.createdAt,
      bar: accounts.name,
      zona: accounts.zone,
      comensal: b2cConsumers.fullName,
      comensalId: b2cConsumers.id,
    })
    .from(consumerReviews)
    .leftJoin(accounts, eq(accounts.id, consumerReviews.accountId))
    .leftJoin(b2cConsumers, eq(b2cConsumers.id, consumerReviews.consumerId))
    .where(and(eq(consumerReviews.alertaCalidad, true)))
    .orderBy(desc(consumerReviews.createdAt))
    .limit(limite);
}
