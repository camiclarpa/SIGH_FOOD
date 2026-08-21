'use server';

// =============================================================================
// Acciones de desafíos en mesa
// =============================================================================
//
// Un desafío es un cuestionario corto que el comensal responde en la mesa justo
// después de escanear, a cambio de puntos. Editarlo tiene una particularidad
// que manda sobre todo lo demás: la respuesta correcta vive aquí y NO puede
// salir hacia el comensal. Por eso la corrección se hace en el servidor y la
// pantalla pública recibe el desafío sin ese campo — ver `desafioParaComensal`.

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { challenges, challengeResponses } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';
import { exigir, SinPermiso } from '@/lib/permisos';

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
    log.error(`Acción fallida: ${nombre}`, e, { ruta: '/acciones/desafios' });
    return { ok: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export interface PreguntaEditable {
  pregunta: string;
  opciones: string[];
  /** Índice de la opción correcta. Nunca viaja al comensal. */
  correcta?: number;
}

/** Tope de preguntas. Un desafío en mesa se responde de pie, entre plato y plato. */
const MAX_PREGUNTAS = 10;
const MAX_OPCIONES = 5;

/**
 * Valida las preguntas antes de guardarlas.
 *
 * Se comprueba al guardar y no al responder porque un desafío mal formado solo
 * se descubriría con un comensal delante, ya activo y con la mesa esperando.
 */
function revisarPreguntas(preguntas: PreguntaEditable[]): PreguntaEditable[] {
  if (preguntas.length === 0) throw new Error('El desafío necesita al menos una pregunta');
  if (preguntas.length > MAX_PREGUNTAS) {
    throw new Error(`Como mucho ${MAX_PREGUNTAS} preguntas: en la mesa nadie responde más`);
  }

  return preguntas.map((p, i) => {
    const enunciado = p.pregunta.trim();
    if (!enunciado) throw new Error(`La pregunta ${i + 1} está vacía`);

    const opciones = p.opciones.map((o) => o.trim()).filter(Boolean);
    if (opciones.length < 2) throw new Error(`La pregunta ${i + 1} necesita al menos dos opciones`);
    if (opciones.length > MAX_OPCIONES) {
      throw new Error(`La pregunta ${i + 1} tiene más de ${MAX_OPCIONES} opciones`);
    }
    if (new Set(opciones).size !== opciones.length) {
      throw new Error(`La pregunta ${i + 1} repite alguna opción`);
    }

    // `correcta` es opcional a propósito: hay desafíos de opinión ("¿cuál te
    // gustó más?") donde no hay respuesta buena y todo el mundo puntúa. Pero si
    // se indica, tiene que señalar a una opción que exista: un índice fuera de
    // rango haría que nadie acertara nunca y nadie sabría por qué.
    if (p.correcta !== undefined) {
      if (!Number.isInteger(p.correcta) || p.correcta < 0 || p.correcta >= opciones.length) {
        throw new Error(`La respuesta correcta de la pregunta ${i + 1} no señala a ninguna opción`);
      }
    }

    return { pregunta: enunciado, opciones, correcta: p.correcta };
  });
}

// -----------------------------------------------------------------------------
// Edición
// -----------------------------------------------------------------------------

export async function guardarDesafio(datos: {
  id?: string;
  titulo: string;
  descripcion?: string | null;
  preguntas: PreguntaEditable[];
  puntosPremio: number;
  premioDescripcion?: string | null;
  lineaProducto?: string | null;
  zona?: string | null;
  empiezaEn?: string | null;
  terminaEn?: string | null;
}): Promise<Resultado<{ id: string }>> {
  return ejecutar('guardarDesafio', async () => {
    await exigir('desafios.gestionar');

    if (!datos.titulo.trim()) throw new Error('El título es obligatorio');

    const preguntas = revisarPreguntas(datos.preguntas);

    const empieza = datos.empiezaEn ? new Date(datos.empiezaEn) : null;
    const termina = datos.terminaEn ? new Date(datos.terminaEn) : null;
    if (empieza && termina && termina <= empieza) {
      throw new Error('La fecha de fin va antes que la de inicio');
    }

    return conBaseDeDatos(async (db) => {
      const valores = {
        titulo: datos.titulo.trim(),
        descripcion: datos.descripcion?.trim() || null,
        preguntas,
        puntosPremio: Math.max(0, Math.trunc(datos.puntosPremio)),
        premioDescripcion: datos.premioDescripcion?.trim() || null,
        lineaProducto: (datos.lineaProducto?.trim() || null) as never,
        zona: datos.zona?.trim() || null,
        empiezaEn: empieza,
        terminaEn: termina,
      };

      const [fila] = datos.id
        ? await db.update(challenges).set(valores)
            .where(eq(challenges.id, datos.id)).returning({ id: challenges.id })
        // Nace en borrador, igual que las secuencias: activarlo es lo que lo
        // pone delante de comensales reales, y esa es una decisión aparte.
        : await db.insert(challenges).values({ ...valores, estado: 'borrador' })
            .returning({ id: challenges.id });

      if (!fila) throw new Error('El desafío no existe');
      return { id: fila.id };
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/fidelizacion');
    return r;
  });
}

/**
 * Cambia el estado de un desafío.
 *
 * Activar lo pone delante de los comensales; finalizar lo cierra sin borrar las
 * respuestas ya dadas, que son el dato que interesa conservar.
 */
export async function cambiarEstadoDesafio(
  id: string,
  estado: 'borrador' | 'activo' | 'pausado' | 'finalizado'
): Promise<Resultado> {
  return ejecutar('cambiarEstadoDesafio', async () => {
    const actor = await exigir('desafios.gestionar');

    return conBaseDeDatos(async (db) => {
      const [desafio] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
      if (!desafio) throw new Error('El desafío no existe');

      if (estado === 'activo') {
        // Activar un desafío sin preguntas dejaría al comensal ante una pantalla
        // vacía después de escanear.
        if (!desafio.preguntas?.length) throw new Error('No se puede activar un desafío sin preguntas');
        if (desafio.terminaEn && new Date(desafio.terminaEn) <= new Date()) {
          throw new Error('No se puede activar: su fecha de fin ya pasó');
        }
      }

      await db.update(challenges).set({ estado }).where(eq(challenges.id, id));

      log.info(`Desafío ${estado}`, {
        ruta: '/acciones/desafios',
        detalle: [actor.email, desafio.titulo],
      });
      return undefined;
    });
  }).then((r) => {
    if (r.ok) revalidatePath('/fidelizacion');
    return r;
  });
}

// -----------------------------------------------------------------------------
// Resultados
// -----------------------------------------------------------------------------

/** Cuántos respondieron cada opción. Para ver si una pregunta discrimina algo. */
export async function resultadosDesafio(id: string): Promise<Resultado<{
  titulo: string;
  respuestas: number;
  aciertoMedio: number | null;
  porPregunta: Array<{ pregunta: string; opciones: Array<{ texto: string; votos: number; correcta: boolean }> }>;
}>> {
  return ejecutar('resultadosDesafio', async () => {
    await exigir('desafios.gestionar');

    return conBaseDeDatos(async (db) => {
      const [desafio] = await db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
      if (!desafio) throw new Error('El desafío no existe');

      const filas = await db
        .select({ respuestas: challengeResponses.respuestas, acertadas: challengeResponses.acertadas })
        .from(challengeResponses)
        .where(eq(challengeResponses.challengeId, id));

      // El recuento se hace aquí y no en SQL porque las respuestas viven en un
      // jsonb como array de {pregunta, elegida}: desplegarlo en Postgres sería
      // más críptico que este bucle y no hay volumen que lo justifique.
      const votos = new Map<string, number>();
      for (const f of filas) {
        for (const r of f.respuestas ?? []) votos.set(`${r.pregunta}:${r.elegida}`, (votos.get(`${r.pregunta}:${r.elegida}`) ?? 0) + 1);
      }

      const conAcierto = filas.filter((f) => f.acertadas !== null);

      return {
        titulo: desafio.titulo,
        respuestas: filas.length,
        aciertoMedio: conAcierto.length
          ? conAcierto.reduce((s, f) => s + (f.acertadas ?? 0), 0) / conAcierto.length
          : null,
        porPregunta: (desafio.preguntas ?? []).map((p, i) => ({
          pregunta: p.pregunta,
          opciones: p.opciones.map((texto, j) => ({
            texto,
            votos: votos.get(`${i}:${j}`) ?? 0,
            correcta: p.correcta === j,
          })),
        })),
      };
    });
  });
}
