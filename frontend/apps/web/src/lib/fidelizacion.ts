// =============================================================================
// Motor de fidelización del comensal
// =============================================================================
//
// El CRM ya guardaba puntos y nivel en b2c_consumers, pero nadie los movía: eran
// columnas que siempre valían lo que se puso al crear la fila. Aquí viven las
// reglas que las hacen significar algo.
//
// Regla de oro del módulo: los puntos NUNCA se escriben directamente sobre
// b2c_consumers.points. Se registra un movimiento y el saldo se deriva de él.
// Un saldo sin historial no se puede auditar, y ante una reclamación de un
// comensal no habría forma de explicar de dónde salió.

import { and, count, countDistinct, eq, sql } from 'drizzle-orm';
import {
  b2cConsumers,
  badges,
  consumerBadges,
  pointTransactions,
  sensoryMoments,
  accounts,
  referrals,
} from '@sighfood/domain/db/schema';
import type { Database } from '@sighfood/domain/db';

/** Puntos que otorga un escaneo. */
export const PUNTOS_POR_ESCANEO = 10;

/**
 * Niveles del pasaporte sensorial, por número de escaneos.
 *
 * De menor a mayor: el cálculo recorre la lista al revés y se queda con el
 * primero que alcance.
 */
export const NIVELES = [
  { nivel: 'explorador' as const, desde: 0, etiqueta: 'Explorador' },
  { nivel: 'aficionado' as const, desde: 5, etiqueta: 'Aficionado' },
  { nivel: 'catador_leyenda' as const, desde: 20, etiqueta: 'Catador Leyenda' },
];

export type NivelComensal = (typeof NIVELES)[number]['nivel'];

export function nivelDeComensal(escaneos: number): NivelComensal {
  for (let i = NIVELES.length - 1; i >= 0; i--) {
    if (escaneos >= NIVELES[i].desde) return NIVELES[i].nivel;
  }
  return 'explorador';
}

/** Cuántos escaneos faltan para el siguiente nivel, o null si ya es el último. */
export function progresoNivel(escaneos: number): { siguiente: string; faltan: number } | null {
  const siguiente = NIVELES.find((n) => escaneos < n.desde);
  return siguiente ? { siguiente: siguiente.etiqueta, faltan: siguiente.desde - escaneos } : null;
}

export function etiquetaNivel(nivel: string | null): string {
  return NIVELES.find((n) => n.nivel === nivel)?.etiqueta ?? nivel ?? 'Explorador';
}

// -----------------------------------------------------------------------------
// Billetera de puntos
// -----------------------------------------------------------------------------

export type MotivoPuntos =
  | 'escaneo' | 'insignia' | 'desafio' | 'referido' | 'canje' | 'ajuste_manual' | 'caducidad';

/**
 * Mueve puntos y deja constancia.
 *
 * Va dentro de una transacción a propósito: si se escribiera el movimiento y
 * luego fallara la actualización del saldo, el historial y el saldo contarían
 * cosas distintas y no habría forma de saber cuál es la buena.
 */
export async function otorgarPuntos(
  db: Database,
  datos: {
    consumerId: string;
    puntos: number;
    motivo: MotivoPuntos;
    referenciaId?: string;
    descripcion?: string;
  }
) {
  return db.transaction(async (tx) => {
    // El saldo se actualiza con una expresión SQL, no leyendo-sumando-escribiendo:
    // dos escaneos simultáneos del mismo comensal se pisarían y uno de los dos
    // premios se perdería sin dejar rastro.
    const [fila] = await tx
      .update(b2cConsumers)
      .set({ points: sql`COALESCE(${b2cConsumers.points}, 0) + ${datos.puntos}` })
      .where(eq(b2cConsumers.id, datos.consumerId))
      .returning({ saldo: b2cConsumers.points });

    if (!fila) throw new Error(`El comensal ${datos.consumerId} no existe`);

    const [movimiento] = await tx
      .insert(pointTransactions)
      .values({
        consumerId: datos.consumerId,
        puntos: datos.puntos,
        motivo: datos.motivo,
        referenciaId: datos.referenciaId,
        descripcion: datos.descripcion,
        saldoResultante: fila.saldo,
      })
      .returning();

    return movimiento;
  });
}

// -----------------------------------------------------------------------------
// Insignias
// -----------------------------------------------------------------------------

/** Métricas del comensal contra las que se evalúan los criterios. */
export interface MetricasComensal {
  escaneosTotales: number;
  lineasDistintas: number;
  baresDistintos: number;
  referidosConvertidos: number;
  /** Escaneos por franja horaria, indexado por hora local 0-23. */
  escaneosPorHora: Record<number, number>;
}

export async function medirComensal(db: Database, consumerId: string): Promise<MetricasComensal> {
  const [[totales], porHora, [refs]] = await Promise.all([
    db
      .select({
        escaneos: count(sensoryMoments.id),
        lineas: countDistinct(sensoryMoments.productLine),
        bares: countDistinct(sensoryMoments.accountId),
      })
      .from(sensoryMoments)
      .where(eq(sensoryMoments.consumerId, consumerId)),

    db
      .select({
        hora: sql<number>`EXTRACT(HOUR FROM ${sensoryMoments.scannedAt})::int`,
        total: count(sensoryMoments.id),
      })
      .from(sensoryMoments)
      .where(eq(sensoryMoments.consumerId, consumerId))
      .groupBy(sql`EXTRACT(HOUR FROM ${sensoryMoments.scannedAt})`),

    db
      .select({ total: count(referrals.id) })
      .from(referrals)
      .where(and(eq(referrals.referrerId, consumerId), eq(referrals.status, 'converted'))),
  ]);

  return {
    escaneosTotales: Number(totales?.escaneos ?? 0),
    lineasDistintas: Number(totales?.lineas ?? 0),
    baresDistintos: Number(totales?.bares ?? 0),
    referidosConvertidos: Number(refs?.total ?? 0),
    escaneosPorHora: Object.fromEntries(porHora.map((f) => [f.hora, Number(f.total)])),
  };
}

/** Valor del comensal para un criterio concreto. */
function valorDelCriterio(
  criterio: string,
  parametro: string | null,
  m: MetricasComensal
): number {
  switch (criterio) {
    case 'escaneos_totales':
      return m.escaneosTotales;
    case 'lineas_distintas':
      return m.lineasDistintas;
    case 'bares_distintos':
      return m.baresDistintos;
    case 'referidos_convertidos':
      return m.referidosConvertidos;
    case 'escaneos_en_franja': {
      // El parámetro llega como "22-4" (de 22h a 4h). La franja puede cruzar la
      // medianoche, así que no basta con comparar desde <= hora <= hasta.
      const [desde, hasta] = (parametro ?? '0-23').split('-').map(Number);
      let total = 0;
      for (const [hora, n] of Object.entries(m.escaneosPorHora)) {
        const h = Number(hora);
        const dentro = desde <= hasta ? h >= desde && h <= hasta : h >= desde || h <= hasta;
        if (dentro) total += n;
      }
      return total;
    }
    case 'racha_semanas':
      // Pendiente: exige recorrer el historial semana a semana. Devolver 0 evita
      // otorgar la insignia por accidente mientras no esté implementada.
      return 0;
    default:
      return 0;
  }
}

/**
 * Revisa qué insignias ha desbloqueado el comensal y se las otorga.
 *
 * Es idempotente: el índice único de consumer_badges impide duplicar, y solo se
 * otorgan puntos por las que realmente se insertan. Sin eso, cada reevaluación
 * regalaría los puntos otra vez.
 */
export async function evaluarInsignias(db: Database, consumerId: string) {
  const metricas = await medirComensal(db, consumerId);

  const [catalogo, yaTiene] = await Promise.all([
    db.select().from(badges).where(eq(badges.activa, true)),
    db.select({ badgeId: consumerBadges.badgeId }).from(consumerBadges).where(eq(consumerBadges.consumerId, consumerId)),
  ]);

  const tiene = new Set(yaTiene.map((b) => b.badgeId));
  const nuevas = [];

  for (const insignia of catalogo) {
    if (tiene.has(insignia.id)) continue;

    const valor = valorDelCriterio(insignia.criterio, insignia.parametro, metricas);
    if (valor < insignia.umbral) continue;

    // onConflictDoNothing por si dos peticiones evalúan a la vez: el índice
    // único es la garantía real, esto solo evita que salte el error.
    const [otorgada] = await db
      .insert(consumerBadges)
      .values({ consumerId, badgeId: insignia.id, valorAlDesbloquear: valor })
      .onConflictDoNothing()
      .returning();

    if (!otorgada) continue;

    if (insignia.puntosOtorgados > 0) {
      await otorgarPuntos(db, {
        consumerId,
        puntos: insignia.puntosOtorgados,
        motivo: 'insignia',
        referenciaId: insignia.id,
        descripcion: `Insignia: ${insignia.nombre}`,
      });
    }

    nuevas.push({ ...insignia, valorAlDesbloquear: valor });
  }

  return { metricas, nuevas };
}

/**
 * Actualiza el nivel del comensal si sus escaneos ya dan para más.
 *
 * Solo sube: bajar de nivel a alguien que dejó de escanear castiga
 * precisamente al que se quiere recuperar.
 */
export async function actualizarNivel(db: Database, consumerId: string, escaneos: number) {
  const nivel = nivelDeComensal(escaneos);
  const orden = NIVELES.map((n) => n.nivel);

  const [actual] = await db
    .select({ nivel: b2cConsumers.membershipTier })
    .from(b2cConsumers)
    .where(eq(b2cConsumers.id, consumerId));

  const indiceActual = orden.indexOf(actual?.nivel as NivelComensal);
  const indiceNuevo = orden.indexOf(nivel);

  // indiceActual === -1 cubre los valores antiguos (bronze/silver/gold), que se
  // migran al programa nuevo la primera vez que el comensal escanea.
  if (indiceActual !== -1 && indiceNuevo <= indiceActual) return null;

  await db.update(b2cConsumers).set({ membershipTier: nivel }).where(eq(b2cConsumers.id, consumerId));
  return nivel;
}

/**
 * Todo lo que hay que hacer cuando un comensal escanea un QR.
 *
 * Se llama después de registrar el momento sensorial: puntos, insignias y
 * nivel, en ese orden, porque las insignias pueden depender del escaneo recién
 * guardado y el nivel del total resultante.
 */
export async function procesarEscaneo(
  db: Database,
  datos: { consumerId: string; momentId: string }
) {
  await otorgarPuntos(db, {
    consumerId: datos.consumerId,
    puntos: PUNTOS_POR_ESCANEO,
    motivo: 'escaneo',
    referenciaId: datos.momentId,
    descripcion: 'Momento sensorial registrado',
  });

  const { metricas, nuevas } = await evaluarInsignias(db, datos.consumerId);
  const nivel = await actualizarNivel(db, datos.consumerId, metricas.escaneosTotales);

  return {
    puntosGanados: PUNTOS_POR_ESCANEO + nuevas.reduce((s, i) => s + i.puntosOtorgados, 0),
    insigniasNuevas: nuevas.map((i) => ({ codigo: i.codigo, nombre: i.nombre, icono: i.icono })),
    nivelNuevo: nivel,
    escaneosTotales: metricas.escaneosTotales,
  };
}

// -----------------------------------------------------------------------------
// Perfil de paladar
// -----------------------------------------------------------------------------

export const LINEAS_PRODUCTO = [
  { codigo: 'flavor_switch', etiqueta: 'Flavor Switch' },
  { codigo: 'taste_shock', etiqueta: 'Taste Shock' },
  { codigo: 'spicy_volcano', etiqueta: 'Spicy Volcano' },
  { codigo: 'umami_boost', etiqueta: 'Umami Boost' },
  { codigo: 'sweet_craft', etiqueta: 'Sweet Craft' },
] as const;

export function etiquetaLinea(codigo: string | null): string {
  return LINEAS_PRODUCTO.find((l) => l.codigo === codigo)?.etiqueta ?? codigo ?? 'Sin definir';
}

/**
 * Convierte el recuento por línea en porcentajes.
 *
 * Se normaliza sobre el total del propio comensal: comparar valores absolutos
 * entre alguien con 3 escaneos y alguien con 40 no dice nada sobre su paladar.
 */
export function perfilPaladar(preferencias: Record<string, number> | null) {
  const datos = preferencias ?? {};
  const total = Object.values(datos).reduce((s, n) => s + n, 0);

  return LINEAS_PRODUCTO.map((linea) => ({
    ...linea,
    veces: datos[linea.codigo] ?? 0,
    porcentaje: total === 0 ? 0 : Math.round(((datos[linea.codigo] ?? 0) / total) * 100),
  })).sort((a, b) => b.veces - a.veces);
}

/** La línea dominante, o null si aún no hay datos suficientes. */
export function lineaDominante(preferencias: Record<string, number> | null): string | null {
  const perfil = perfilPaladar(preferencias);
  return perfil[0]?.veces > 0 ? perfil[0].etiqueta : null;
}
