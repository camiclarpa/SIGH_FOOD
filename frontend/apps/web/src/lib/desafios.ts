// =============================================================================
// Desafíos en mesa: cara pública
// =============================================================================
//
// Vive fuera de acciones/desafios.ts a propósito. Aquel lleva 'use server', y
// ahí TODO lo exportado se convierte en una acción invocable desde el navegador
// por cualquiera. Estas funciones las llama el comensal sin sesión, y conviene
// que la puerta sea una ruta de API donde se validan los argumentos, no un
// endpoint implícito con la firma de la función.
//
// La regla que manda sobre este archivo: la respuesta correcta nunca sale hacia
// el comensal, y la corrección se hace aquí. Un `correcta` que viaje al cliente
// se lee abriendo las herramientas de desarrollo.

import { and, eq, isNull, or, gte, lte, sql, count } from 'drizzle-orm';
import { challenges, challengeResponses } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { otorgarPuntos } from '@/lib/fidelizacion';

/** Lo que ve el comensal: sin `correcta`, deliberadamente. */
export interface DesafioPublico {
  id: string;
  titulo: string;
  descripcion: string | null;
  puntosPremio: number;
  premioDescripcion: string | null;
  preguntas: Array<{ pregunta: string; opciones: string[] }>;
}

/**
 * Quita la respuesta correcta de las preguntas.
 *
 * Es el único invariante de seguridad de este módulo, y está aquí como función
 * aparte para poder probarlo sin base de datos. Reconstruye cada pregunta campo
 * a campo en lugar de borrar `correcta` del objeto: con un `delete` o un
 * `...resto`, cualquier campo que se añada mañana al esquema viajaría al
 * navegador sin que nadie lo decidiera.
 */
export function sinRespuestas(
  preguntas: Array<{ pregunta: string; opciones: string[]; correcta?: number }> | null
): Array<{ pregunta: string; opciones: string[] }> {
  return (preguntas ?? []).map((p) => ({ pregunta: p.pregunta, opciones: p.opciones }));
}

/**
 * El desafío que le toca a un comensal, o null si no hay ninguno.
 *
 * Se ofrece uno solo: en la mesa, encadenar cuestionarios es la forma más rápida
 * de que nadie termine ninguno.
 */
export async function desafioParaComensal(datos: {
  consumerId: string;
  lineaProducto?: string | null;
  zona?: string | null;
}): Promise<DesafioPublico | null> {
  return conBaseDeDatos(async (db) => {
    const ahora = new Date();

    const [d] = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.estado, 'activo'),
          // Sin fecha significa sin límite por ese lado.
          or(isNull(challenges.empiezaEn), lte(challenges.empiezaEn, ahora)),
          or(isNull(challenges.terminaEn), gte(challenges.terminaEn, ahora)),
          // Un desafío sin línea ni zona vale para cualquiera. Si las tiene,
          // solo se ofrece cuando coinciden con lo que acaba de escanear.
          or(
            isNull(challenges.lineaProducto),
            datos.lineaProducto
              ? eq(challenges.lineaProducto, datos.lineaProducto as never)
              : sql`false`
          ),
          or(
            isNull(challenges.zona),
            datos.zona ? eq(challenges.zona, datos.zona) : sql`false`
          ),
          // Y que no lo haya respondido ya. El filtro va en SQL: hacerlo después
          // obligaría a traerse todos los desafíos activos para descartarlos.
          sql`NOT EXISTS (
            SELECT 1 FROM ${challengeResponses}
            WHERE ${challengeResponses.challengeId} = ${challenges.id}
              AND ${challengeResponses.consumerId} = ${datos.consumerId}
          )`
        )
      )
      // El más específico primero: si hay uno de su línea y otro genérico, se le
      // ofrece el de su línea, que habla de lo que acaba de probar.
      .orderBy(
        sql`(${challenges.lineaProducto} IS NULL), (${challenges.zona} IS NULL), ${challenges.createdAt} DESC`
      )
      .limit(1);

    if (!d) return null;

    return {
      id: d.id,
      titulo: d.titulo,
      descripcion: d.descripcion,
      puntosPremio: d.puntosPremio,
      premioDescripcion: d.premioDescripcion,
      preguntas: sinRespuestas(d.preguntas),
    };
  });
}

export interface ResultadoRespuesta {
  acertadas: number | null;
  total: number;
  puntosGanados: number;
  premioDescripcion: string | null;
  /** Qué opción era la buena en cada pregunta. Solo DESPUÉS de responder. */
  solucion: Array<{ correcta: number | null; elegida: number }>;
  /** true si ya había respondido antes y no se ha vuelto a puntuar. */
  repetida: boolean;
}

/**
 * Corrige las respuestas de un comensal y le da los puntos.
 *
 * Puntúa por proporción de aciertos, no todo o nada: un desafío de tres
 * preguntas en el que fallar una deja sin nada desanima a la segunda vez.
 * Cuando ninguna pregunta tiene respuesta correcta definida —los de opinión— se
 * da el premio completo por participar.
 *
 * La defensa contra repetir es el índice único (challenge_id, consumer_id) y no
 * una consulta previa: entre el SELECT y el INSERT caben dos toques seguidos al
 * botón, y con la comprobación en JavaScript los dos pasarían. Aquí el segundo
 * choca con el índice y se responde sin volver a dar puntos.
 */
export async function responderDesafio(datos: {
  challengeId: string;
  consumerId: string;
  accountId?: string | null;
  elegidas: number[];
  segundosRespuesta?: number | null;
}): Promise<ResultadoRespuesta> {
  return conBaseDeDatos(async (db) => {
    const [desafio] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, datos.challengeId))
      .limit(1);

    if (!desafio) throw new Error('El desafío no existe');
    if (desafio.estado !== 'activo') throw new Error('Ese desafío ya no está activo');

    const ahora = new Date();
    if (desafio.empiezaEn && new Date(desafio.empiezaEn) > ahora) {
      throw new Error('Ese desafío todavía no ha empezado');
    }
    if (desafio.terminaEn && new Date(desafio.terminaEn) < ahora) {
      throw new Error('Ese desafío ya terminó');
    }

    const preguntas = desafio.preguntas ?? [];
    if (datos.elegidas.length !== preguntas.length) {
      throw new Error('Faltan respuestas por contestar');
    }

    // Una opción fuera de rango solo llega manipulando la petición, pero se
    // rechaza igual: guardarla dejaría un dato sin sentido en las estadísticas.
    datos.elegidas.forEach((elegida, i) => {
      const opciones = preguntas[i]?.opciones.length ?? 0;
      if (!Number.isInteger(elegida) || elegida < 0 || elegida >= opciones) {
        throw new Error(`La respuesta a la pregunta ${i + 1} no es válida`);
      }
    });

    const conCorrecta = preguntas.filter((p) => p.correcta !== undefined);
    const acertadas = conCorrecta.length
      ? preguntas.reduce(
          (n, p, i) => n + (p.correcta !== undefined && p.correcta === datos.elegidas[i] ? 1 : 0),
          0
        )
      : null;

    const puntos = conCorrecta.length
      ? Math.round(desafio.puntosPremio * ((acertadas ?? 0) / conCorrecta.length))
      : desafio.puntosPremio;

    const solucion = preguntas.map((p, i) => ({
      correcta: p.correcta ?? null,
      elegida: datos.elegidas[i]!,
    }));

    const [guardada] = await db
      .insert(challengeResponses)
      .values({
        challengeId: datos.challengeId,
        consumerId: datos.consumerId,
        accountId: datos.accountId ?? null,
        respuestas: datos.elegidas.map((elegida, pregunta) => ({ pregunta, elegida })),
        acertadas,
        puntosGanados: puntos,
        segundosRespuesta: datos.segundosRespuesta ?? null,
      })
      .onConflictDoNothing({
        target: [challengeResponses.challengeId, challengeResponses.consumerId],
      })
      .returning({ id: challengeResponses.id });

    // Sin fila, el índice único rechazó el insert: ya había respondido. Se le
    // enseña la solución, pero no se le dan los puntos otra vez.
    if (!guardada) {
      return {
        acertadas,
        total: preguntas.length,
        puntosGanados: 0,
        premioDescripcion: desafio.premioDescripcion,
        solucion,
        repetida: true,
      };
    }

    // Los puntos van después del insert y no dentro: si fallara el movimiento de
    // puntos, la respuesta ya está registrada y los puntos se recuperan; al
    // revés se habría pagado por una respuesta que no consta.
    if (puntos > 0) {
      await otorgarPuntos(db, {
        consumerId: datos.consumerId,
        puntos,
        motivo: 'desafio',
        referenciaId: guardada.id,
        descripcion: `Desafío: ${desafio.titulo}`,
      });
    }

    return {
      acertadas,
      total: preguntas.length,
      puntosGanados: puntos,
      premioDescripcion: desafio.premioDescripcion,
      solucion,
      repetida: false,
    };
  });
}

/** Cuántas respuestas lleva cada desafío. Para la pantalla del CRM. */
export async function conteoRespuestas(): Promise<Map<string, number>> {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select({ id: challengeResponses.challengeId, total: count(challengeResponses.id) })
      .from(challengeResponses)
      .groupBy(challengeResponses.challengeId);
    return new Map(filas.map((f) => [f.id, Number(f.total)]));
  });
}
