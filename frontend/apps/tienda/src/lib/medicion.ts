// =============================================================================
// Embudo de conversión y cobertura de envío
// =============================================================================
//
// MEDICIÓN PROPIA, SIN PÍXEL DE TERCEROS
// --------------------------------------
// La pregunta que hay que contestar es "¿dónde pierdo clientes?", y la respuesta
// está en la misma base donde viven los pedidos. Mandarle a Meta o a Google el
// recorrido de cada comensal para averiguarlo tiene tres costes:
//
//   · Obliga a un banner de consentimiento, que a su vez cuesta conversión.
//   · Entrega a un tercero el mapa completo de un negocio pequeño.
//   · Añade un script bloqueante al camino crítico de la compra.
//
// Con esto, medir el propio negocio no requiere el permiso de nadie ni le pide
// nada al visitante.
//
// Lo que se guarda es QUÉ pasó, no QUIÉN: `sesionAnonima` es un identificador
// de navegador, se puede borrar y no se cruza con el teléfono.

import { count, desc, eq, gte, sql } from 'drizzle-orm';
import { eventosEmbudo, productos, zonasEnvio } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export {
  PASOS,
  ETIQUETAS_PASO,
  type Evento,
} from '@/lib/medicion-tipos';

import { PASOS, ETIQUETAS_PASO, type Evento } from '@/lib/medicion-tipos';

/**
 * Registra un paso del embudo.
 *
 * No lanza NUNCA. La medición es información de gestión: si falla, se pierde un
 * dato, y eso es infinitamente preferible a que alguien no pueda comprar porque
 * la analítica tuvo un mal día.
 */
export async function registrar(datos: {
  evento: Evento;
  sesionAnonima: string;
  productoId?: string;
  pedidoId?: string;
  valorCOP?: number;
  qrToken?: string;
  /** Canal de origen de la visita, para medir la conversión por canal. */
  utmSource?: string;
}): Promise<void> {
  try {
    await conBaseDeDatos(async (db) => {
      await db.insert(eventosEmbudo).values({
        evento: datos.evento,
        sesionAnonima: datos.sesionAnonima.slice(0, 64),
        productoId: datos.productoId ?? null,
        pedidoId: datos.pedidoId ?? null,
        valorCOP: datos.valorCOP ?? null,
        qrToken: datos.qrToken ?? null,
        utmSource: datos.utmSource?.slice(0, 80) ?? null,
      });
    });
  } catch {
    // Silencio deliberado. Ver el comentario de arriba.
  }
}

export interface PasoEmbudo {
  evento: Evento;
  etiqueta: string;
  sesiones: number;
  /** Qué porcentaje del paso ANTERIOR llegó hasta aquí. */
  conversion: number;
  /** Cuántas se perdieron respecto al paso anterior. */
  perdidas: number;
}

/**
 * El embudo de los últimos N días.
 *
 * Se cuentan SESIONES DISTINTAS, no eventos. Quien mira cuatro productos no son
 * cuatro personas interesadas: es una sola mirando cuatro veces, y contarlo como
 * cuatro inventa un embudo que no existe.
 */
export async function embudo(dias = 7): Promise<PasoEmbudo[]> {
  return conBaseDeDatos(async (db) => {
    const desde = new Date(Date.now() - dias * 86_400_000);

    const filas = await db
      .select({
        evento: eventosEmbudo.evento,
        sesiones: sql<number>`COUNT(DISTINCT ${eventosEmbudo.sesionAnonima})::int`,
      })
      .from(eventosEmbudo)
      .where(gte(eventosEmbudo.createdAt, desde))
      .groupBy(eventosEmbudo.evento);

    const porEvento = new Map(filas.map((f) => [f.evento, Number(f.sesiones)]));

    let anterior = 0;
    return PASOS.map((p, i) => {
      const sesiones = porEvento.get(p) ?? 0;
      const conversion = i === 0 || anterior === 0 ? 100 : Math.round((sesiones / anterior) * 100);
      const perdidas = i === 0 ? 0 : Math.max(0, anterior - sesiones);
      anterior = i === 0 ? sesiones : sesiones;
      return { evento: p, etiqueta: ETIQUETAS_PASO[p], sesiones, conversion, perdidas };
    });
  });
}

/** Qué productos se miran y cuáles se piden. La diferencia dice mucho. */
export async function interesPorProducto(dias = 7) {
  return conBaseDeDatos(async (db) => {
    const desde = new Date(Date.now() - dias * 86_400_000);

    return db
      .select({
        nombre: productos.nombre,
        vistas: sql<number>`COUNT(*) FILTER (WHERE ${eventosEmbudo.evento} = 'vio_producto')::int`,
        alCarrito: sql<number>`COUNT(*) FILTER (WHERE ${eventosEmbudo.evento} = 'anadio_carrito')::int`,
      })
      .from(eventosEmbudo)
      .innerJoin(productos, eq(productos.id, eventosEmbudo.productoId))
      .where(gte(eventosEmbudo.createdAt, desde))
      .groupBy(productos.nombre)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(20);
  });
}

// -----------------------------------------------------------------------------
// Cobertura de envío
// -----------------------------------------------------------------------------

export interface Cobertura {
  cubierta: boolean;
  zona: string | null;
  costoCOP: number;
  minutos: string | null;
  minimoCOP: number;
}

/**
 * Coste del domicilio a partir de la dirección escrita.
 *
 * Se resuelve contra una tabla de zonas y NO contra una API de mapas. Un
 * servicio de geocodificación cobra por consulta, exige una clave y mete una
 * dependencia externa en el camino crítico de la compra: si Google no responde,
 * nadie puede pedir. Para un local con cuatro barrios alrededor, una tabla es
 * más barata, más rápida y no se cae.
 *
 * Cuando haya varios locales y decenas de zonas tocará geocodificar de verdad,
 * y por eso todo el cálculo está detrás de esta única función.
 *
 * Sin coincidencia NO se rechaza el pedido: se devuelve la tarifa por defecto y
 * se avisa de que hay que confirmar. Rechazar por no reconocer una dirección
 * escrita a mano perdería pedidos perfectamente entregables.
 */
export async function coberturaDe(direccion: string, porDefectoCOP: number): Promise<Cobertura> {
  const texto = direccion
    .toLowerCase()
    // Sin tildes: la gente escribe "bogota" y "Chapinero" indistintamente.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  return conBaseDeDatos(async (db) => {
    const zonas = await db
      .select()
      .from(zonasEnvio)
      .where(eq(zonasEnvio.activa, true))
      .orderBy(zonasEnvio.orden);

    for (const z of zonas) {
      const nombres = [z.nombre, ...(z.alias ?? [])].map((n) =>
        n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      );

      if (nombres.some((n) => texto.includes(n))) {
        return {
          cubierta: true,
          zona: z.nombre,
          costoCOP: z.costoCOP,
          minutos: z.minutosEstimados,
          minimoCOP: z.minimoCOP,
        };
      }
    }

    return {
      cubierta: false,
      zona: null,
      costoCOP: porDefectoCOP,
      minutos: null,
      minimoCOP: 0,
    };
  });
}

/** Zonas para enseñar en la tienda. */
export async function zonasActivas() {
  return conBaseDeDatos(async (db) =>
    db
      .select({
        nombre: zonasEnvio.nombre,
        costoCOP: zonasEnvio.costoCOP,
        minutos: zonasEnvio.minutosEstimados,
      })
      .from(zonasEnvio)
      .where(eq(zonasEnvio.activa, true))
      .orderBy(zonasEnvio.orden)
  );
}

/** Cuántos eventos se han registrado. Para saber si la medición está viva. */
export async function hayMedicion(): Promise<boolean> {
  return conBaseDeDatos(async (db) => {
    const [r] = await db.select({ n: count(eventosEmbudo.id) }).from(eventosEmbudo);
    return Number(r?.n ?? 0) > 0;
  });
}
