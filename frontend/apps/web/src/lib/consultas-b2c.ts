// =============================================================================
// Consultas de lectura del CRM B2C
// =============================================================================
//
// El sujeto aquí es el comensal, no la cuenta. Vive aparte de consultas.ts —que
// sigue sirviendo a la operación B2B— porque las preguntas son de otra
// naturaleza: no "cuánto stock tiene este bar" sino "qué paladar tiene esta
// persona, cuándo consume y cuándo dejó de hacerlo".

import { and, asc, count, countDistinct, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import {
  accounts,
  b2cConsumers,
  badges,
  challenges,
  challengeResponses,
  consumerBadges,
  consumerReviews,
  dataConsents,
  pointTransactions,
  referrals,
  segments,
  sensoryMoments,
  automationSequences,
  automationLogs,
  rewards,
  redemptions,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { conRespaldo } from '@/lib/respaldo';
import { nivelDeComensal } from '@/lib/fidelizacion';

// -----------------------------------------------------------------------------
// Directorio de comensales
// -----------------------------------------------------------------------------

export type CampoOrdenComensal = 'escaneos' | 'puntos' | 'reciente' | 'alta' | 'nombre';

export interface FiltrosComensales {
  buscar?: string;
  nivel?: string;
  linea?: string;
  zona?: string;
  /** 'activos' | 'riesgo' | 'dormidos' — por días sin escanear. */
  actividad?: string;
  orden?: CampoOrdenComensal;
  pagina?: number;
  limite?: number;
}

/** Umbrales de inactividad, en días. Coinciden con los segmentos sembrados. */
export const DIAS_RIESGO = 15;
export const DIAS_DORMIDO = 45;

/**
 * Listado de comensales con su actividad agregada.
 *
 * Los escaneos, el último momento y las insignias se traen con subconsultas
 * correlacionadas en lugar de un JOIN + GROUP BY: agrupar por todas las
 * columnas de b2c_consumers para poder contar momentos obliga a Postgres a
 * ordenar la tabla entera, y aquí solo hacen falta tres números por fila.
 */
export async function listarComensales(f: FiltrosComensales = {}) {
  const limite = Math.min(100, Math.max(1, f.limite ?? 25));
  const pagina = Math.max(1, f.pagina ?? 1);

  const escaneos = sql<number>`(
    SELECT COUNT(*)::int FROM ${sensoryMoments}
    WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
  )`;

  const ultimoMomento = sql<Date | null>`(
    SELECT MAX(${sensoryMoments.scannedAt}) FROM ${sensoryMoments}
    WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
  )`;

  const insignias = sql<number>`(
    SELECT COUNT(*)::int FROM ${consumerBadges}
    WHERE ${consumerBadges.consumerId} = ${b2cConsumers.id}
  )`;

  const partes: SQL[] = [];

  if (f.buscar) {
    const patron = `%${f.buscar}%`;
    const porTexto = or(
      ilike(b2cConsumers.fullName, patron),
      ilike(b2cConsumers.whatsappPhone, patron),
      ilike(b2cConsumers.email, patron)
    );
    if (porTexto) partes.push(porTexto);
  }

  if (f.nivel) partes.push(eq(b2cConsumers.membershipTier, f.nivel as never));

  // La línea dominante vive en el jsonb de preferencias; se filtra por presencia
  // porque el comensal puede haber probado varias.
  if (f.linea) {
    partes.push(sql`${b2cConsumers.flavorPreference} ? ${f.linea}`);
  }

  if (f.zona) {
    partes.push(sql`EXISTS (
      SELECT 1 FROM ${sensoryMoments}
      JOIN ${accounts} ON ${accounts.id} = ${sensoryMoments.accountId}
      WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id} AND ${accounts.zone} = ${f.zona}
    )`);
  }

  if (f.actividad === 'riesgo') {
    partes.push(sql`${ultimoMomento} < now() - (${DIAS_RIESGO} || ' days')::interval`);
  } else if (f.actividad === 'dormidos') {
    partes.push(sql`(${ultimoMomento} IS NULL OR ${ultimoMomento} < now() - (${DIAS_DORMIDO} || ' days')::interval)`);
  } else if (f.actividad === 'activos') {
    partes.push(sql`${ultimoMomento} >= now() - (${DIAS_RIESGO} || ' days')::interval`);
  }

  const donde = partes.length > 0 ? and(...partes) : undefined;

  const ordenacion = {
    escaneos: desc(escaneos),
    puntos: desc(b2cConsumers.points),
    reciente: sql`${ultimoMomento} DESC NULLS LAST`,
    alta: desc(b2cConsumers.createdAt),
    nombre: asc(b2cConsumers.fullName),
  }[f.orden ?? 'reciente'];

  const clave = `b2c:comensales:${limite}:${pagina}:${f.orden ?? 'reciente'}:` +
    `${f.buscar ?? ''}:${f.nivel ?? ''}:${f.linea ?? ''}:${f.zona ?? ''}:${f.actividad ?? ''}`;

  return conRespaldo(clave, () => conBaseDeDatos(async (db) => {
    const [filas, [{ total }]] = await Promise.all([
      db
        .select({
          id: b2cConsumers.id,
          nombre: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          email: b2cConsumers.email,
          nivel: b2cConsumers.membershipTier,
          puntos: b2cConsumers.points,
          cashback: b2cConsumers.cashbackBalance,
          ltv: b2cConsumers.ltv,
          preferencias: b2cConsumers.flavorPreference,
          codigoReferido: b2cConsumers.referralCode,
          alta: b2cConsumers.createdAt,
          escaneos,
          ultimoMomento,
          insignias,
        })
        .from(b2cConsumers)
        .where(donde)
        .orderBy(ordenacion)
        .limit(limite)
        .offset((pagina - 1) * limite),

      db.select({ total: count(b2cConsumers.id) }).from(b2cConsumers).where(donde),
    ]);

    return {
      filas,
      paginacion: { pagina, limite, total, paginas: Math.max(1, Math.ceil(total / limite)) },
    };
  }));
}

// -----------------------------------------------------------------------------
// Pasaporte del comensal (ficha 360)
// -----------------------------------------------------------------------------

export async function pasaporteComensal(consumerId: string) {
  return conRespaldo(`b2c:pasaporte:${consumerId}`, () => conBaseDeDatos(async (db) => {
    const [comensal] = await db
      .select()
      .from(b2cConsumers)
      .where(eq(b2cConsumers.id, consumerId))
      .limit(1);

    if (!comensal) return null;

    const [historial, insigniasObtenidas, catalogo, movimientos, consentimientos, resenas, porHora, referidos] =
      await Promise.all([
        // Historial completo: qué, cuándo y dónde.
        db
          .select({
            id: sensoryMoments.id,
            linea: sensoryMoments.productLine,
            fecha: sensoryMoments.scannedAt,
            bar: accounts.name,
            barId: accounts.id,
            zona: accounts.zone,
          })
          .from(sensoryMoments)
          .leftJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
          .where(eq(sensoryMoments.consumerId, consumerId))
          .orderBy(desc(sensoryMoments.scannedAt))
          .limit(100),

        db
          .select({
            codigo: badges.codigo,
            nombre: badges.nombre,
            descripcion: badges.descripcion,
            icono: badges.icono,
            puntos: badges.puntosOtorgados,
            desbloqueadaEn: consumerBadges.desbloqueadaEn,
            valorAlDesbloquear: consumerBadges.valorAlDesbloquear,
          })
          .from(consumerBadges)
          .innerJoin(badges, eq(badges.id, consumerBadges.badgeId))
          .where(eq(consumerBadges.consumerId, consumerId))
          .orderBy(desc(consumerBadges.desbloqueadaEn)),

        // El catálogo completo, para poder pintar también las que faltan: una
        // insignia bloqueada visible es lo que empuja al siguiente escaneo.
        db.select().from(badges).where(eq(badges.activa, true)).orderBy(asc(badges.umbral)),

        db
          .select()
          .from(pointTransactions)
          .where(eq(pointTransactions.consumerId, consumerId))
          .orderBy(desc(pointTransactions.createdAt))
          .limit(50),

        db
          .select()
          .from(dataConsents)
          .where(eq(dataConsents.consumerId, consumerId))
          .orderBy(desc(dataConsents.grantedAt)),

        db
          .select({
            id: consumerReviews.id,
            puntuacion: consumerReviews.puntuacion,
            comentario: consumerReviews.comentario,
            sentimiento: consumerReviews.sentimiento,
            linea: consumerReviews.productLine,
            alertaCalidad: consumerReviews.alertaCalidad,
            fecha: consumerReviews.createdAt,
          })
          .from(consumerReviews)
          .where(eq(consumerReviews.consumerId, consumerId))
          .orderBy(desc(consumerReviews.createdAt))
          .limit(20),

        // Hábito horario: a qué hora consume esta persona.
        db
          .select({
            hora: sql<number>`EXTRACT(HOUR FROM ${sensoryMoments.scannedAt})::int`,
            total: count(sensoryMoments.id),
          })
          .from(sensoryMoments)
          .where(eq(sensoryMoments.consumerId, consumerId))
          .groupBy(sql`EXTRACT(HOUR FROM ${sensoryMoments.scannedAt})`),

        db
          .select({ total: count(referrals.id), estado: referrals.status })
          .from(referrals)
          .where(eq(referrals.referrerId, consumerId))
          .groupBy(referrals.status),
      ]);

    const escaneos = historial.length;
    const baresDistintos = new Set(historial.map((h) => h.barId).filter(Boolean)).size;
    const lineasDistintas = new Set(historial.map((h) => h.linea).filter(Boolean)).size;

    return {
      comensal,
      historial,
      insigniasObtenidas,
      catalogo,
      movimientos,
      consentimientos,
      resenas,
      porHora: Object.fromEntries(porHora.map((f) => [f.hora, Number(f.total)])),
      referidos,
      metricas: {
        escaneos,
        baresDistintos,
        lineasDistintas,
        nivelCalculado: nivelDeComensal(escaneos),
        ultimoMomento: historial[0]?.fecha ?? null,
        primerMomento: historial[historial.length - 1]?.fecha ?? null,
      },
    };
  }));
}

// -----------------------------------------------------------------------------
// Analítica de momentos sensoriales
// -----------------------------------------------------------------------------

export async function analiticaMomentos() {
  return conRespaldo('b2c:analitica-momentos', () => conBaseDeDatos(async (db) => {
    const [totales, porHora, porDia, porLinea, porZona, porBar, ultimos, recurrencia] = await Promise.all([
      db
        .select({
          momentos: count(sensoryMoments.id),
          comensales: countDistinct(sensoryMoments.consumerId),
          bares: countDistinct(sensoryMoments.accountId),
        })
        .from(sensoryMoments),

      // Mapa de calor: hora del día.
      db
        .select({
          hora: sql<number>`EXTRACT(HOUR FROM ${sensoryMoments.scannedAt})::int`,
          total: count(sensoryMoments.id),
        })
        .from(sensoryMoments)
        .groupBy(sql`EXTRACT(HOUR FROM ${sensoryMoments.scannedAt})`),

      // Mapa de calor: día de la semana (0 = domingo en Postgres).
      db
        .select({
          dia: sql<number>`EXTRACT(DOW FROM ${sensoryMoments.scannedAt})::int`,
          total: count(sensoryMoments.id),
        })
        .from(sensoryMoments)
        .groupBy(sql`EXTRACT(DOW FROM ${sensoryMoments.scannedAt})`),

      db
        .select({ linea: sensoryMoments.productLine, total: count(sensoryMoments.id) })
        .from(sensoryMoments)
        .groupBy(sensoryMoments.productLine)
        .orderBy(desc(count(sensoryMoments.id))),

      db
        .select({ zona: accounts.zone, total: count(sensoryMoments.id) })
        .from(sensoryMoments)
        .innerJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
        .groupBy(accounts.zone)
        .orderBy(desc(count(sensoryMoments.id)))
        .limit(12),

      db
        .select({
          bar: accounts.name,
          zona: accounts.zone,
          total: count(sensoryMoments.id),
          comensales: countDistinct(sensoryMoments.consumerId),
        })
        .from(sensoryMoments)
        .innerJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
        .groupBy(accounts.id, accounts.name, accounts.zone)
        .orderBy(desc(count(sensoryMoments.id)))
        .limit(10),

      db
        .select({
          id: sensoryMoments.id,
          linea: sensoryMoments.productLine,
          fecha: sensoryMoments.scannedAt,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
          whatsapp: b2cConsumers.whatsappPhone,
          bar: accounts.name,
          zona: accounts.zone,
        })
        .from(sensoryMoments)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, sensoryMoments.consumerId))
        .leftJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
        .orderBy(desc(sensoryMoments.scannedAt))
        .limit(30),

      // Recurrencia: cuántos escanearon una sola vez y cuántos volvieron. Es LA
      // métrica del programa — si casi todos tienen un solo momento, el QR
      // capta pero no fideliza.
      db.execute(sql`
        SELECT
          CASE
            WHEN n = 1 THEN '1'
            WHEN n BETWEEN 2 AND 4 THEN '2-4'
            WHEN n BETWEEN 5 AND 9 THEN '5-9'
            ELSE '10+'
          END AS tramo,
          COUNT(*)::int AS comensales
        FROM (
          SELECT consumer_id, COUNT(*)::int AS n
          FROM sensory_moments
          WHERE consumer_id IS NOT NULL
          GROUP BY consumer_id
        ) AS por_comensal
        GROUP BY tramo
      `),
    ]);

    const filas = (recurrencia as unknown as { rows?: unknown[] }).rows ?? recurrencia;

    return {
      totales: totales[0] ?? { momentos: 0, comensales: 0, bares: 0 },
      porHora: Object.fromEntries(porHora.map((f) => [f.hora, Number(f.total)])),
      porDia: Object.fromEntries(porDia.map((f) => [f.dia, Number(f.total)])),
      porLinea,
      porZona,
      porBar,
      ultimos,
      recurrencia: filas as Array<{ tramo: string; comensales: number }>,
    };
  }));
}

// -----------------------------------------------------------------------------
// Fidelización
// -----------------------------------------------------------------------------

export async function resumenFidelizacion() {
  return conRespaldo('b2c:fidelizacion', () => conBaseDeDatos(async (db) => {
    const [catalogo, otorgadas, puntos, desafios, respuestas, topComensales] = await Promise.all([
      db.select().from(badges).orderBy(asc(badges.criterio), asc(badges.umbral)),

      db
        .select({ badgeId: consumerBadges.badgeId, total: count(consumerBadges.id) })
        .from(consumerBadges)
        .groupBy(consumerBadges.badgeId),

      db
        .select({
          emitidos: sql<number>`COALESCE(SUM(CASE WHEN ${pointTransactions.puntos} > 0 THEN ${pointTransactions.puntos} ELSE 0 END), 0)::int`,
          canjeados: sql<number>`COALESCE(SUM(CASE WHEN ${pointTransactions.puntos} < 0 THEN -${pointTransactions.puntos} ELSE 0 END), 0)::int`,
          movimientos: count(pointTransactions.id),
        })
        .from(pointTransactions),

      db.select().from(challenges).orderBy(desc(challenges.createdAt)).limit(20),

      db
        .select({ challengeId: challengeResponses.challengeId, total: count(challengeResponses.id) })
        .from(challengeResponses)
        .groupBy(challengeResponses.challengeId),

      db
        .select({
          id: b2cConsumers.id,
          nombre: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          nivel: b2cConsumers.membershipTier,
          puntos: b2cConsumers.points,
          insignias: sql<number>`(
            SELECT COUNT(*)::int FROM ${consumerBadges}
            WHERE ${consumerBadges.consumerId} = ${b2cConsumers.id}
          )`,
        })
        .from(b2cConsumers)
        .orderBy(desc(b2cConsumers.points))
        .limit(10),
    ]);

    const conteo = new Map(otorgadas.map((o) => [o.badgeId, Number(o.total)]));
    const respuestasPorDesafio = new Map(respuestas.map((r) => [r.challengeId, Number(r.total)]));

    return {
      insignias: catalogo.map((b) => ({ ...b, otorgadas: conteo.get(b.id) ?? 0 })),
      puntos: puntos[0] ?? { emitidos: 0, canjeados: 0, movimientos: 0 },
      desafios: desafios.map((d) => ({ ...d, respuestas: respuestasPorDesafio.get(d.id) ?? 0 })),
      topComensales,
    };
  }));
}

// -----------------------------------------------------------------------------
// Segmentos dinámicos
// -----------------------------------------------------------------------------

/**
 * Traduce la regla de un segmento a una condición SQL.
 *
 * Se evalúa en el momento de consultar, no se materializa: un comensal que deja
 * de cumplir la regla debe salir del segmento solo, o seguiría recibiendo
 * campañas que ya no le corresponden.
 */
function condicionDeSegmento(regla: Record<string, unknown> | null): SQL | undefined {
  if (!regla) return undefined;
  const partes: SQL[] = [];

  if (typeof regla.minEscaneos === 'number') {
    partes.push(sql`(
      SELECT COUNT(*) FROM ${sensoryMoments}
      WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
    ) >= ${regla.minEscaneos}`);
  }

  if (typeof regla.diasInactivo === 'number') {
    partes.push(sql`COALESCE((
      SELECT MAX(${sensoryMoments.scannedAt}) FROM ${sensoryMoments}
      WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
    ), ${b2cConsumers.createdAt}) < now() - (${regla.diasInactivo} || ' days')::interval`);
  }

  if (typeof regla.lineaProducto === 'string') {
    partes.push(sql`EXISTS (
      SELECT 1 FROM ${sensoryMoments}
      WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
        AND ${sensoryMoments.productLine} = ${regla.lineaProducto}
    )`);
  }

  if (typeof regla.zona === 'string') {
    partes.push(sql`EXISTS (
      SELECT 1 FROM ${sensoryMoments} sm
      JOIN ${accounts} a ON a.id = sm.account_id
      WHERE sm.consumer_id = ${b2cConsumers.id} AND a.zone = ${regla.zona}
    )`);
  }

  if (typeof regla.franjaDesde === 'number' && typeof regla.franjaHasta === 'number') {
    const { franjaDesde: desde, franjaHasta: hasta } = regla as { franjaDesde: number; franjaHasta: number };
    // La franja puede cruzar la medianoche (22 a 4): en ese caso la condición es
    // OR, no BETWEEN, o no seleccionaría a nadie.
    const dentro = desde <= hasta
      ? sql`EXTRACT(HOUR FROM sm.scanned_at) BETWEEN ${desde} AND ${hasta}`
      : sql`(EXTRACT(HOUR FROM sm.scanned_at) >= ${desde} OR EXTRACT(HOUR FROM sm.scanned_at) <= ${hasta})`;

    partes.push(sql`EXISTS (
      SELECT 1 FROM ${sensoryMoments} sm
      WHERE sm.consumer_id = ${b2cConsumers.id} AND ${dentro}
    )`);
  }

  if (typeof regla.nivel === 'string') {
    partes.push(sql`${b2cConsumers.membershipTier} = ${regla.nivel}`);
  }

  return partes.length > 0 ? and(...partes) : undefined;
}

export async function segmentosConConteo() {
  return conRespaldo('b2c:segmentos', () => conBaseDeDatos(async (db) => {
    const lista = await db.select().from(segments).orderBy(asc(segments.nombre));

    // Un conteo por segmento. Son pocos y la alternativa —una sola consulta con
    // un CASE por regla— sería ilegible y habría que rehacerla al añadir reglas.
    const conConteo = await Promise.all(
      lista.map(async (s) => {
        const donde = condicionDeSegmento(s.regla as Record<string, unknown> | null);
        const [{ total }] = await db
          .select({ total: count(b2cConsumers.id) })
          .from(b2cConsumers)
          .where(donde);
        return { ...s, comensales: Number(total) };
      })
    );

    return conConteo;
  }));
}

/** Comensales de un segmento, resueltos en el momento. */
export async function comensalesDeSegmento(segmentId: string, limite = 100) {
  return conRespaldo(`b2c:segmento:${segmentId}:${limite}`, () => conBaseDeDatos(async (db) => {
    const [segmento] = await db.select().from(segments).where(eq(segments.id, segmentId)).limit(1);
    if (!segmento) return null;

    const donde = condicionDeSegmento(segmento.regla as Record<string, unknown> | null);

    const filas = await db
      .select({
        id: b2cConsumers.id,
        nombre: b2cConsumers.fullName,
        whatsapp: b2cConsumers.whatsappPhone,
        nivel: b2cConsumers.membershipTier,
        puntos: b2cConsumers.points,
        preferencias: b2cConsumers.flavorPreference,
        escaneos: sql<number>`(
          SELECT COUNT(*)::int FROM ${sensoryMoments}
          WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
        )`,
        ultimoMomento: sql<Date | null>`(
          SELECT MAX(${sensoryMoments.scannedAt}) FROM ${sensoryMoments}
          WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
        )`,
      })
      .from(b2cConsumers)
      .where(donde)
      .limit(limite);

    return { segmento, filas };
  }));
}

// -----------------------------------------------------------------------------
// Panel B2C
// -----------------------------------------------------------------------------

export async function resumenPanelB2C() {
  return conRespaldo('b2c:panel', () => conBaseDeDatos(async (db) => {
    const [
      [comensales], [momentos], [puntos], porNivel, porLinea,
      [recurrentes], [enRiesgo], [insigniasDadas], [conConsentimiento], recientes, [resenas],
    ] = await Promise.all([
      db.select({ total: count(b2cConsumers.id) }).from(b2cConsumers),
      db.select({ total: count(sensoryMoments.id) }).from(sensoryMoments),
      db
        .select({ total: sql<number>`COALESCE(SUM(${b2cConsumers.points}), 0)::int` })
        .from(b2cConsumers),

      db
        .select({ nivel: b2cConsumers.membershipTier, total: count(b2cConsumers.id) })
        .from(b2cConsumers)
        .groupBy(b2cConsumers.membershipTier),

      db
        .select({ linea: sensoryMoments.productLine, total: count(sensoryMoments.id) })
        .from(sensoryMoments)
        .groupBy(sensoryMoments.productLine)
        .orderBy(desc(count(sensoryMoments.id))),

      // Recurrentes: más de un momento. Es la métrica que dice si el QR
      // fideliza o solo capta.
      db.execute(sql`
        SELECT COUNT(*)::int AS total FROM (
          SELECT consumer_id FROM sensory_moments
          WHERE consumer_id IS NOT NULL
          GROUP BY consumer_id HAVING COUNT(*) > 1
        ) AS r
      `),

      db.execute(sql`
        SELECT COUNT(*)::int AS total FROM b2c_consumers c
        WHERE COALESCE(
          (SELECT MAX(scanned_at) FROM sensory_moments WHERE consumer_id = c.id),
          c.created_at
        ) < now() - interval '15 days'
      `),

      db.select({ total: count(consumerBadges.id) }).from(consumerBadges),

      db
        .select({ total: countDistinct(dataConsents.consumerId) })
        .from(dataConsents),

      db
        .select({
          id: b2cConsumers.id,
          nombre: b2cConsumers.fullName,
          whatsapp: b2cConsumers.whatsappPhone,
          nivel: b2cConsumers.membershipTier,
          puntos: b2cConsumers.points,
          alta: b2cConsumers.createdAt,
        })
        .from(b2cConsumers)
        .orderBy(desc(b2cConsumers.createdAt))
        .limit(8),

      db
        .select({
          total: count(consumerReviews.id),
          alertas: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.alertaCalidad})::int`,
          negativas: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.sentimiento} = 'negativo')::int`,
        })
        .from(consumerReviews),
    ]);

    const leerTotal = (r: unknown) => {
      const filas = (r as { rows?: Array<{ total: number }> }).rows ?? (r as Array<{ total: number }>);
      return Number(filas?.[0]?.total ?? 0);
    };

    const totalComensales = Number(comensales?.total ?? 0);
    const totalRecurrentes = leerTotal(recurrentes);

    return {
      comensales: totalComensales,
      momentos: Number(momentos?.total ?? 0),
      puntosEnCirculacion: Number(puntos?.total ?? 0),
      recurrentes: totalRecurrentes,
      // 0/0 daría NaN, que se serializa como null y rompe la tarjeta.
      tasaRecurrencia: totalComensales === 0 ? 0 : Math.round((totalRecurrentes / totalComensales) * 100),
      enRiesgo: leerTotal(enRiesgo),
      insigniasDadas: Number(insigniasDadas?.total ?? 0),
      conConsentimiento: Number(conConsentimiento?.total ?? 0),
      porNivel,
      porLinea,
      recientes,
      resenas: resenas ?? { total: 0, alertas: 0, negativas: 0 },
    };
  }));
}

/** Zonas donde hay actividad B2C, para poblar filtros. */
export async function zonasConMomentos() {
  return conRespaldo('b2c:zonas', () => conBaseDeDatos(async (db) => {
    const filas = await db
      .selectDistinct({ zona: accounts.zone })
      .from(sensoryMoments)
      .innerJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
      .orderBy(asc(accounts.zone));
    return filas.map((f) => f.zona).filter(Boolean);
  }));
}

// -----------------------------------------------------------------------------
// Mensajería del ciclo de vida
// -----------------------------------------------------------------------------

/**
 * Secuencias automatizadas y su rendimiento.
 *
 * Se cuenta el embudo completo —enviado, abierto, clicado, convertido— porque
 * una secuencia que se envía mucho y no convierte nada es peor que no tenerla:
 * gasta la paciencia del comensal y su permiso de contacto.
 */
export async function resumenMensajeria() {
  return conRespaldo('b2c:mensajeria', () => conBaseDeDatos(async (db) => {
    const [secuencias, porSecuencia, totales, ultimos] = await Promise.all([
      db.select().from(automationSequences).orderBy(asc(automationSequences.name)),

      db
        .select({
          sequenceId: automationLogs.sequenceId,
          enviados: count(automationLogs.id),
          abiertos: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.openedAt} IS NOT NULL)::int`,
          clicados: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.clickedAt} IS NOT NULL)::int`,
          convertidos: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.convertedAt} IS NOT NULL)::int`,
          errores: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.errorMessage} IS NOT NULL)::int`,
        })
        .from(automationLogs)
        .groupBy(automationLogs.sequenceId),

      db
        .select({
          enviados: count(automationLogs.id),
          abiertos: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.openedAt} IS NOT NULL)::int`,
          convertidos: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.convertedAt} IS NOT NULL)::int`,
          errores: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.errorMessage} IS NOT NULL)::int`,
        })
        .from(automationLogs),

      db
        .select({
          id: automationLogs.id,
          estado: automationLogs.status,
          enviado: automationLogs.sentAt,
          abierto: automationLogs.openedAt,
          convertido: automationLogs.convertedAt,
          error: automationLogs.errorMessage,
          secuencia: automationSequences.name,
          canal: automationSequences.channel,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
        })
        .from(automationLogs)
        .leftJoin(automationSequences, eq(automationSequences.id, automationLogs.sequenceId))
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, automationLogs.consumerId))
        .orderBy(desc(automationLogs.sentAt))
        .limit(25),
    ]);

    const porId = new Map(porSecuencia.map((s) => [s.sequenceId, s]));

    return {
      secuencias: secuencias.map((s) => ({
        ...s,
        metricas: porId.get(s.id) ?? { enviados: 0, abiertos: 0, clicados: 0, convertidos: 0, errores: 0 },
      })),
      totales: totales[0] ?? { enviados: 0, abiertos: 0, convertidos: 0, errores: 0 },
      ultimos,
    };
  }));
}

// -----------------------------------------------------------------------------
// Economía de canje
// -----------------------------------------------------------------------------

export async function resumenPremios() {
  return conRespaldo('b2c:premios', () => conBaseDeDatos(async (db) => {
    const [catalogo, porPremio, totales, ultimos] = await Promise.all([
      db.select().from(rewards).orderBy(asc(rewards.costePuntos)),

      db
        .select({
          rewardId: redemptions.rewardId,
          emitidos: count(redemptions.id),
          entregados: sql<number>`COUNT(*) FILTER (WHERE ${redemptions.estado} = 'canjeado')::int`,
          pendientes: sql<number>`COUNT(*) FILTER (WHERE ${redemptions.estado} = 'pendiente')::int`,
        })
        .from(redemptions)
        .groupBy(redemptions.rewardId),

      db
        .select({
          emitidos: count(redemptions.id),
          entregados: sql<number>`COUNT(*) FILTER (WHERE ${redemptions.estado} = 'canjeado')::int`,
          pendientes: sql<number>`COUNT(*) FILTER (WHERE ${redemptions.estado} = 'pendiente')::int`,
          caducados: sql<number>`COUNT(*) FILTER (WHERE ${redemptions.estado} = 'pendiente' AND ${redemptions.expiraEn} < now())::int`,
          puntosGastados: sql<number>`COALESCE(SUM(${redemptions.puntosGastados}), 0)::int`,
        })
        .from(redemptions),

      db
        .select({
          id: redemptions.id,
          codigo: redemptions.codigo,
          estado: redemptions.estado,
          puntos: redemptions.puntosGastados,
          expiraEn: redemptions.expiraEn,
          canjeadoEn: redemptions.canjeadoEn,
          creado: redemptions.createdAt,
          premio: rewards.nombre,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
          whatsapp: b2cConsumers.whatsappPhone,
        })
        .from(redemptions)
        .innerJoin(rewards, eq(rewards.id, redemptions.rewardId))
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, redemptions.consumerId))
        .orderBy(desc(redemptions.createdAt))
        .limit(30),
    ]);

    const porId = new Map(porPremio.map((p) => [p.rewardId, p]));

    return {
      catalogo: catalogo.map((r) => ({
        ...r,
        metricas: porId.get(r.id) ?? { emitidos: 0, entregados: 0, pendientes: 0 },
      })),
      totales: totales[0] ?? { emitidos: 0, entregados: 0, pendientes: 0, caducados: 0, puntosGastados: 0 },
      ultimos,
    };
  }));
}
