// =============================================================================
// Clasificar reseñas: qué falló y de quién es
// =============================================================================
//
// POR QUÉ EL PANEL DECÍA "SIN ANALIZAR" EN TODO
// ---------------------------------------------
// `analizarResena()` existía y funcionaba, pero nadie la llamaba: solo era
// alcanzable por una ruta manual que ninguna pantalla invoca. Las reseñas
// entraban y se quedaban ahí. Este archivo es lo que faltaba — el proceso que sí
// las mira.
//
// LAS CUATRO ETIQUETAS, Y POR QUÉ ESAS
// ------------------------------------
// Una nota de dos estrellas no dice qué hacer. Estas dos son la misma nota:
//
//   "llegó frío"              -> se arregla en reparto
//   "no me gusta el picante"  -> NO se arregla
//
// La segunda no es un fallo: es información de paladar. Tratarla como avería
// llevaría a suavizar un producto que a los demás les gusta justo así, y a
// perseguir un problema que no existe.
//
//   · fallo_cocina    — poca salsa, quemado, crudo, falta un producto.
//   · fallo_logistica — frío, derramado, tarde, empaque roto.
//   · preferencia     — no es un fallo, es que no era para esa persona.
//   · elogio          — le gustó. Saber QUÉ gusta vale tanto como lo contrario.
//
// POR QUÉ WORKERS AI Y NO GROQ
// ----------------------------
// El binding corre DENTRO del Worker: no sale a la red pública ni consume una
// clave de terceros. Para clasificar en cuatro cajas no hace falta más, y
// mantiene la operación sin dependencias externas que puedan caerse o caducar.

import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { consumerReviews, pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';

export type CategoriaResena =
  | 'fallo_cocina'
  | 'fallo_logistica'
  | 'preferencia'
  | 'elogio'
  | 'sugerencia';

/** Modelo pequeño: la tarea es meter un texto corto en una de cuatro cajas. */
const MODELO = '@cf/meta/llama-3.1-8b-instruct';

/** Cuántas se clasifican por ejecución. Evita agotar la cuota de una vez. */
const MAXIMO_POR_TANDA = 20;

interface BindingAI {
  run(modelo: string, entrada: Record<string, unknown>): Promise<{ response?: string }>;
}

async function bindingAI(): Promise<BindingAI | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as unknown as { AI?: BindingAI }).AI;
  } catch {
    return undefined;
  }
}

const INSTRUCCIONES = `Clasificas reseñas de un negocio de comida en Colombia.

Devuelve SOLO una de estas cuatro palabras, sin explicar nada:

fallo_cocina — algo salió mal al prepararlo: crudo, quemado, sin sal, falta un producto, poca cantidad.
fallo_logistica — se preparó bien pero llegó mal: frío, derramado, tarde, empaque roto, dirección equivocada.
preferencia — no es un fallo del negocio, es gusto personal: "muy picante para mí", "no me gustan las salsas dulces".
elogio — le gustó y no pide nada más.
sugerencia — pide un producto que no existe: 'me gustaría con picante medio', 'saquen una bolsa más grande'. Aunque venga con elogio, si pide algo nuevo es sugerencia.

Ojo con la diferencia entre fallo_cocina y preferencia: "le falta sabor" es un fallo; "no me gusta el picante" es una preferencia, porque el producto salió como debía.`;

/** Traduce lo que devuelva el modelo a una de las cuatro etiquetas. */
function aCategoria(texto: string | undefined): CategoriaResena | null {
  const t = (texto ?? '').toLowerCase();
  if (t.includes('fallo_cocina')) return 'fallo_cocina';
  if (t.includes('fallo_logistica') || t.includes('fallo_logística')) return 'fallo_logistica';
  if (t.includes('preferencia')) return 'preferencia';
  // 'sugerencia' se comprueba ANTES que 'elogio': un comentario que elogia y
  // ademas pide algo nuevo vale mas como peticion de producto que como halago.
  if (t.includes('sugerencia')) return 'sugerencia';
  if (t.includes('elogio')) return 'elogio';
  return null;
}

/**
 * Clasifica sin modelo, a partir de lo que la persona marcó.
 *
 * Los motivos de un toque —"llegó frío", "tardó mucho"— ya dicen de quién es el
 * problema sin que nadie tenga que interpretar nada. Usarlos primero ahorra una
 * llamada al modelo y, sobre todo, da una respuesta ESTABLE: la misma reseña se
 * clasifica igual mañana.
 *
 * Devuelve null cuando los motivos no bastan y sí hace falta leer el texto.
 */
export function categoriaPorMotivos(
  motivos: string[] | null,
  puntuacion: number | null,
  hayComentario = false
): CategoriaResena | null {
  /*
    Una nota alta SIN comentario es un elogio y no hace falta molestar al modelo.

    Con comentario no se decide aqui: alguien puede poner cinco estrellas y pedir
    'saquen una bolsa mas grande', y eso vale mas como peticion de producto que
    como halago. Esa distincion necesita leer el texto.
  */
  if (puntuacion !== null && puntuacion >= 4 && !hayComentario) return 'elogio';
  if (!motivos?.length) return null;

  // Estos dos solo pueden pasar entre la cocina y la puerta del cliente.
  if (motivos.includes('temperatura') || motivos.includes('tiempo') || motivos.includes('empaque')) {
    return 'fallo_logistica';
  }
  // La cantidad es cosa de quien lo sirve.
  if (motivos.includes('cantidad')) return 'fallo_cocina';

  /*
    "sabor" a secas NO se clasifica aquí.

    Puede ser un fallo —salió sin sal— o una preferencia —no le gusta el
    picante—, y son cosas opuestas. Para distinguirlas hace falta leer lo que
    escribió, así que se deja para el modelo.
  */
  return null;
}

export interface ResultadoClasificacion {
  revisadas: number;
  clasificadas: number;
  sinModelo: number;
}

/**
 * Clasifica las reseñas que aún no lo están.
 *
 * Nunca lanza: lo llama un cron y una reseña rara no puede detener las demás.
 */
export async function clasificarPendientes(): Promise<ResultadoClasificacion> {
  const base: ResultadoClasificacion = { revisadas: 0, clasificadas: 0, sinModelo: 0 };

  const pendientes = await conBaseDeDatos((db) =>
    db
      .select({
        id: consumerReviews.id,
        puntuacion: consumerReviews.puntuacion,
        comentario: consumerReviews.comentario,
        motivos: consumerReviews.motivos,
      })
      .from(consumerReviews)
      .where(isNull(consumerReviews.analizadaEn))
      .limit(MAXIMO_POR_TANDA)
  );

  if (pendientes.length === 0) return base;
  base.revisadas = pendientes.length;

  const ai = await bindingAI();

  for (const r of pendientes) {
    let categoria = categoriaPorMotivos(
      r.motivos ?? null,
      r.puntuacion,
      Boolean(r.comentario?.trim())
    );

    // Solo se llama al modelo cuando los motivos no alcanzan Y hay texto que
    // leer. Una reseña de dos estrellas sin comentario ni motivos no tiene nada
    // que interpretar.
    if (!categoria && r.comentario?.trim() && ai) {
      try {
        const salida = await ai.run(MODELO, {
          messages: [
            { role: 'system', content: INSTRUCCIONES },
            {
              role: 'user',
              content: `Nota: ${r.puntuacion ?? '?'}/5\nComentario: ${r.comentario.trim().slice(0, 500)}`,
            },
          ],
          max_tokens: 10,
        });
        categoria = aCategoria(salida.response);
      } catch (e) {
        log.warn('El clasificador de reseñas falló', {
          ruta: '/lib/resenas',
          detalle: [r.id, e instanceof Error ? e.message : String(e)],
        });
      }
    }

    if (!categoria) {
      base.sinModelo++;
      /*
        Sin categoría NO se marca como analizada.

        Dejarla pendiente permite reintentarlo cuando haya modelo o cuota. Si se
        marcara, una caída de un rato dejaría un hueco permanente de reseñas que
        nadie volvería a mirar.
      */
      continue;
    }

    /*
      La alerta de calidad se recalcula con la categoría.

      Al guardarse, cualquier nota de 3 o menos levanta alerta — es lo prudente
      sin saber más. Ahora que se sabe: una PREFERENCIA deja de ser alerta.
      "No me gusta el picante" no es un fallo que revisar, y tenerlo en la lista
      de alertas hace que se deje de mirar la lista.
    */
    // Ni una preferencia ni una sugerencia son averias que revisar.
    const esFallo = categoria === 'fallo_cocina' || categoria === 'fallo_logistica';

    await conBaseDeDatos((db) =>
      db
        .update(consumerReviews)
        .set({
          categoria,
          alertaCalidad: esFallo,
          sentimiento: categoria === 'elogio' ? 'positivo' : esFallo ? 'negativo' : 'neutro',
          analizadaEn: new Date(),
        })
        .where(eq(consumerReviews.id, r.id))
    );

    base.clasificadas++;
  }

  return base;
}

// -----------------------------------------------------------------------------
// Pedir la opinión en el momento adecuado
// -----------------------------------------------------------------------------

/** Minutos tras la entrega antes de preguntar. El tiempo de sentarse y comer. */
export const MINUTOS_ANTES_DE_PREGUNTAR = 35;

/**
 * Y hasta cuándo tiene sentido. Pasadas unas horas el recuerdo ya es vago y el
 * mensaje llega a deshora — a nadie le interesa que le pregunten a las tres de
 * la madrugada por una cena.
 */
export const MINUTOS_LIMITE = 180;

/** Pedidos entregados que ya tocaría preguntar, y a los que no se ha preguntado. */
export async function pedidosPorPreguntar() {
  const desde = new Date(Date.now() - MINUTOS_LIMITE * 60_000);
  const hasta = new Date(Date.now() - MINUTOS_ANTES_DE_PREGUNTAR * 60_000);

  return conBaseDeDatos((db) =>
    db
      .select({
        id: pedidos.id,
        codigo: pedidos.codigo,
        telefono: pedidos.telefono,
        consumerId: pedidos.consumerId,
      })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.estado, 'entregado'),
          isNull(pedidos.resenaPedidaEn),
          lt(pedidos.entregadoEn, hasta),
          sql`${pedidos.entregadoEn} > ${desde}`
        )
      )
      .limit(30)
  );
}

/** Deja constancia de que ya se preguntó, para no repetirlo cada diez minutos. */
export async function marcarResenaPedida(pedidoId: string): Promise<void> {
  await conBaseDeDatos((db) =>
    db.update(pedidos).set({ resenaPedidaEn: new Date() }).where(eq(pedidos.id, pedidoId))
  );
}
