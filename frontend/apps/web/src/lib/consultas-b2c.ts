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
  pushSuscripciones,
  badges,
  challenges,
  challengeResponses,
  consumerBadges,
  consumerReviews,
  dataConsents,
  pointTransactions,
  referrals,
  segments,
  consumerSegments,
  sensoryMoments,
  lotes,
  automationSequences,
  automationLogs,
  rewards,
  redemptions,
  staffUsers,
  mensajesEntrantes,
  chatConversations,
  chatMessages,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { conRespaldo } from '@/lib/respaldo';
import { nivelDeComensal } from '@/lib/fidelizacion';
import { umbralesActuales } from '@/lib/configuracion';
import { tablaRFM, type FilaRFM } from '@/lib/rfm';

/** Locales, para selectores: la consola de redención y el generador de QR. */
export async function cuentasActivas() {
  return conRespaldo('b2c:cuentas-activas', () => conBaseDeDatos(async (db) =>
    db
      .select({ id: accounts.id, nombre: accounts.name, zona: accounts.zone })
      .from(accounts)
      .orderBy(asc(accounts.name))
  ));
}

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

/**
 * Umbrales de inactividad, en días.
 *
 * Son los valores de DISEÑO. Los que se aplican de verdad salen de
 * umbralesActuales(), que lee lo calibrado desde la pantalla del agente. Se
 * conservan estos como respaldo y como referencia de con qué se pensó el
 * sistema.
 */
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

  // Los umbrales calibrados, no las constantes: si alguien baja "en riesgo" a
  // 10 días desde la pantalla del agente, este filtro debe seguirlo.
  const umbrales = await umbralesActuales();
  const diasRiesgo = umbrales.dias_riesgo ?? DIAS_RIESGO;
  const diasDormido = umbrales.dias_dormido ?? DIAS_DORMIDO;

  if (f.actividad === 'riesgo') {
    partes.push(sql`${ultimoMomento} < now() - (${diasRiesgo} || ' days')::interval`);
  } else if (f.actividad === 'dormidos') {
    partes.push(sql`(${ultimoMomento} IS NULL OR ${ultimoMomento} < now() - (${diasDormido} || ' days')::interval)`);
  } else if (f.actividad === 'activos') {
    partes.push(sql`${ultimoMomento} >= now() - (${diasRiesgo} || ' days')::interval`);
  }

  const donde = partes.length > 0 ? and(...partes) : undefined;

  const ordenacion = {
    escaneos: desc(escaneos),
    puntos: desc(b2cConsumers.points),
    reciente: sql`${ultimoMomento} DESC NULLS LAST`,
    alta: desc(b2cConsumers.createdAt),
    nombre: asc(b2cConsumers.fullName),
  }[f.orden ?? 'reciente'];

  // El umbral entra en la clave: sin él, cambiar "en riesgo" de 15 a 10 días
  // seguiría sirviendo el listado calculado con el valor viejo.
  const clave = `b2c:comensales:${limite}:${pagina}:${f.orden ?? 'reciente'}:` +
    `${f.buscar ?? ''}:${f.nivel ?? ''}:${f.linea ?? ''}:${f.zona ?? ''}:${f.actividad ?? ''}:` +
    `${diasRiesgo}:${diasDormido}`;

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
    const [totales, porHora, porDia, porLinea, porZona, porBar, ultimos, recurrencia, porCanal, porMaridaje] =
      await Promise.all([
      db
        .select({
          momentos: count(sensoryMoments.id),
          comensales: countDistinct(sensoryMoments.consumerId),
          bares: countDistinct(sensoryMoments.accountId),
          // Cuántos se hicieron desde una bolsa comprada, no desde una mesa. Es
          // la señal de que el producto empaquetado ya vive fuera del bar.
          enHogar: sql<number>`COUNT(*) FILTER (WHERE ${sensoryMoments.canal} = 'hogar')::int`,
          compartidos: sql<number>`COUNT(*) FILTER (WHERE ${sensoryMoments.compartido})::int`,
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

      // El feed en vivo: quién, qué, con qué y hace cuánto. Es lo primero que se
      // mira para saber si el QR de hoy está funcionando, sin esperar a que se
      // recalculen los agregados de arriba.
      db
        .select({
          id: sensoryMoments.id,
          linea: sensoryMoments.productLine,
          fecha: sensoryMoments.scannedAt,
          canal: sensoryMoments.canal,
          maridaje: sensoryMoments.maridaje,
          compartido: sensoryMoments.compartido,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
          whatsapp: b2cConsumers.whatsappPhone,
          bar: accounts.name,
          zona: sensoryMoments.zona,
          lote: lotes.codigo,
        })
        .from(sensoryMoments)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, sensoryMoments.consumerId))
        .leftJoin(accounts, eq(accounts.id, sensoryMoments.accountId))
        .leftJoin(lotes, eq(lotes.id, sensoryMoments.loteId))
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

      // HORECA (bar) contra hogar (bolsa comprada) contra evento. Un pico a las
      // seis de la tarde significa una cosa en un bar y otra en casa; antes de
      // separar canal, los dos caían en la misma barra del gráfico.
      db
        .select({ canal: sensoryMoments.canal, total: count(sensoryMoments.id) })
        .from(sensoryMoments)
        .groupBy(sensoryMoments.canal)
        .orderBy(desc(count(sensoryMoments.id))),

      db
        .select({ maridaje: sensoryMoments.maridaje, total: count(sensoryMoments.id) })
        .from(sensoryMoments)
        .where(sql`${sensoryMoments.maridaje} IS NOT NULL`)
        .groupBy(sensoryMoments.maridaje)
        .orderBy(desc(count(sensoryMoments.id))),
    ]);

    const filas = (recurrencia as unknown as { rows?: unknown[] }).rows ?? recurrencia;

    return {
      totales: totales[0] ?? { momentos: 0, comensales: 0, bares: 0, enHogar: 0, compartidos: 0 },
      porHora: Object.fromEntries(porHora.map((f) => [f.hora, Number(f.total)])),
      porDia: Object.fromEntries(porDia.map((f) => [f.dia, Number(f.total)])),
      porLinea,
      porZona,
      porBar,
      porCanal,
      porMaridaje,
      ultimos,
      recurrencia: filas as Array<{ tramo: string; comensales: number }>,
    };
  }));
}

// -----------------------------------------------------------------------------
// Fidelización
// -----------------------------------------------------------------------------

/**
 * Cuánto vale un punto en pesos, para el pasivo financiero.
 *
 * No hay un precio de mercado del punto: es una decisión del negocio, no un
 * dato que se pueda calcular. $50 es lo que Roys By Roys fijó — cambia aquí si
 * cambia la política, y el KPI de pasivo se recalcula solo.
 */
export const VALOR_PUNTO_COP = 50;

export async function resumenFidelizacion() {
  return conRespaldo('b2c:fidelizacion', () => conBaseDeDatos(async (db) => {
    const [catalogo, otorgadas, puntos, desafios, respuestas, topComensales, movimientos] = await Promise.all([
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

      // El libro mayor de la billetera: cada asiento, no solo el total. Sin
      // esto "Movimientos: 214" es una cifra que no se puede auditar.
      db
        .select({
          id: pointTransactions.id,
          puntos: pointTransactions.puntos,
          motivo: pointTransactions.motivo,
          descripcion: pointTransactions.descripcion,
          saldoResultante: pointTransactions.saldoResultante,
          creado: pointTransactions.createdAt,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
        })
        .from(pointTransactions)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, pointTransactions.consumerId))
        .orderBy(desc(pointTransactions.createdAt))
        .limit(50),
    ]);

    const conteo = new Map(otorgadas.map((o) => [o.badgeId, Number(o.total)]));
    const respuestasPorDesafio = new Map(respuestas.map((r) => [r.challengeId, Number(r.total)]));
    const datosPuntos = puntos[0] ?? { emitidos: 0, canjeados: 0, movimientos: 0 };
    const enCirculacion = datosPuntos.emitidos - datosPuntos.canjeados;

    return {
      insignias: catalogo.map((b) => ({ ...b, otorgadas: conteo.get(b.id) ?? 0 })),
      puntos: datosPuntos,
      pasivoCop: enCirculacion * VALOR_PUNTO_COP,
      desafios: desafios.map((d) => ({ ...d, respuestas: respuestasPorDesafio.get(d.id) ?? 0 })),
      topComensales,
      movimientos,
    };
  }));
}

// -----------------------------------------------------------------------------
// Segmentos dinámicos
// -----------------------------------------------------------------------------

/**
 * Segmentos con su conteo real, LTV y riesgo de fuga.
 *
 * ANTES esta función volvía a traducir la regla a SQL aquí mismo, en una copia
 * incompleta de la que ya vive en segmentacion.ts (le faltaban minPedidos,
 * minGasto y segmentoRfm — ver la nota en describirRegla, en la página). Dos
 * intérpretes de la misma regla es como se llega a que uno entienda "Alta
 * frecuencia" y el otro no.
 *
 * Ahora se cuenta lo que ya calculó `recalcularSegmentos()` en consumer_segments
 * —la tabla materializada que también usa Mensajería para dirigir campañas—, así
 * que la pantalla y los envíos reales por fin miden lo mismo.
 */
export async function segmentosConConteo() {
  return conRespaldo('b2c:segmentos', () => conBaseDeDatos(async (db) => {
    const [lista, conteos, valor] = await Promise.all([
      db.select().from(segments).orderBy(asc(segments.nombre)),

      db
        .select({ segmentId: consumerSegments.segmentId, total: count(consumerSegments.id) })
        .from(consumerSegments)
        .groupBy(consumerSegments.segmentId),

      // LTV y riesgo por segmento: se apoya en la misma tabla RFM que ya usa
      // segmentacion.ts, no en una consulta nueva que pueda dar otro número.
      tablaRFM(db, 3000),
    ]);

    const totalPorSegmento = new Map(conteos.map((c) => [c.segmentId, Number(c.total)]));
    const rfmPorConsumer = new Map(valor.map((f) => [f.consumerId, f]));

    const miembros = await db
      .select({ segmentId: consumerSegments.segmentId, consumerId: consumerSegments.consumerId })
      .from(consumerSegments);
    const miembrosPorSegmento = new Map<string, string[]>();
    for (const m of miembros) {
      const lista = miembrosPorSegmento.get(m.segmentId) ?? [];
      lista.push(m.consumerId);
      miembrosPorSegmento.set(m.segmentId, lista);
    }

    return lista.map((s) => {
      const ids = miembrosPorSegmento.get(s.id) ?? [];
      const filasRfm = ids.map((id) => rfmPorConsumer.get(id)).filter((f): f is FilaRFM => Boolean(f));
      const ltvPromedio = filasRfm.length > 0
        ? Math.round(filasRfm.reduce((acc, f) => acc + f.monetario, 0) / filasRfm.length)
        : 0;
      const enRiesgo = filasRfm.filter((f) => f.enRiesgo).length;

      return {
        ...s,
        comensales: totalPorSegmento.get(s.id) ?? 0,
        ltvPromedio,
        enRiesgo,
      };
    });
  }));
}

/** Comensales de un segmento, según la pertenencia materializada por el cron. */
export async function comensalesDeSegmento(segmentId: string, limite = 100) {
  return conRespaldo(`b2c:segmento:${segmentId}:${limite}`, () => conBaseDeDatos(async (db) => {
    const [segmento] = await db.select().from(segments).where(eq(segments.id, segmentId)).limit(1);
    if (!segmento) return null;

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
      .innerJoin(consumerSegments, eq(consumerSegments.consumerId, b2cConsumers.id))
      .where(eq(consumerSegments.segmentId, segmentId))
      .limit(limite);

    return { segmento, filas };
  }));
}

/** Secuencias que se pueden disparar ahora mismo a un segmento. */
export async function secuenciasActivas() {
  return conRespaldo('b2c:secuencias-activas', () => conBaseDeDatos(async (db) =>
    db
      .select({ id: automationSequences.id, nombre: automationSequences.name, canal: automationSequences.channel })
      .from(automationSequences)
      .where(eq(automationSequences.status, 'active'))
      .orderBy(asc(automationSequences.name))
  ));
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
          /*
            El desglose por canal, que es lo que hace visible el ahorro.

            Solo cuenta lo ENTREGADO ('sent'). Un fallo no se reparte por canal
            porque no llegó a nadie, y sumarlo haría creer que el push entrega
            más de lo que entrega.

            'omitidos' son los que no se intentaron por no haber canal gratuito:
            ni ventana abierta, ni notificaciones activadas, y la plantilla es de
            marketing. No es un error del sistema — es la cuenta de a cuánta
            gente no se puede llegar sin pagar, que es justo lo que hay que
            mirar para decidir si conviene empujar las notificaciones.
          */
          porPush: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.canal} = 'push' AND ${automationLogs.status} = 'sent')::int`,
          porTextoLibre: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.canal} = 'whatsapp_texto' AND ${automationLogs.status} = 'sent')::int`,
          porPlantilla: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.canal} = 'whatsapp_plantilla' AND ${automationLogs.status} = 'sent')::int`,
          omitidos: sql<number>`COUNT(*) FILTER (WHERE ${automationLogs.status} = 'skipped')::int`,
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
          // El canal REAL por el que salió, no el declarado en la secuencia.
          // Son cosas distintas desde que el canal se decide comensal a
          // comensal: la misma campaña puede salir por push y por texto libre.
          canal: automationLogs.canal,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
        })
        .from(automationLogs)
        .leftJoin(automationSequences, eq(automationSequences.id, automationLogs.sequenceId))
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, automationLogs.consumerId))
        .orderBy(desc(automationLogs.sentAt))
        .limit(25),
    ]);

    // Cuántos dispositivos hay alcanzables. Sin esto, "0 enviados por push" es
    // ambiguo: no se sabe si el canal falla o si es que no hay nadie suscrito.
    const [push] = await db
      .select({
        dispositivos: sql<number>`COUNT(*) FILTER (WHERE ${pushSuscripciones.activa})::int`,
        comensales: sql<number>`COUNT(DISTINCT ${pushSuscripciones.consumerId}) FILTER (WHERE ${pushSuscripciones.activa})::int`,
        bajas: sql<number>`COUNT(*) FILTER (WHERE NOT ${pushSuscripciones.activa})::int`,
      })
      .from(pushSuscripciones);

    const porId = new Map(porSecuencia.map((s) => [s.sequenceId, s]));

    return {
      push: push ?? { dispositivos: 0, comensales: 0, bajas: 0 },
      secuencias: secuencias.map((s) => ({
        ...s,
        metricas: porId.get(s.id) ?? { enviados: 0, abiertos: 0, clicados: 0, convertidos: 0, errores: 0 },
      })),
      totales: totales[0] ?? {
        enviados: 0, abiertos: 0, convertidos: 0, errores: 0,
        porPush: 0, porTextoLibre: 0, porPlantilla: 0, omitidos: 0,
      },
      ultimos,
    };
  }));
}

// -----------------------------------------------------------------------------
// Economía de canje
// -----------------------------------------------------------------------------

/** Bajo este umbral de stock, el catálogo avisa antes de que se agote del todo. */
export const STOCK_BAJO_UMBRAL = 5;

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
          // Rastro de la entrega: quién lo atendió y en qué local. Las dos
          // columnas ya existían en redemptions —canjeadoPor y accountId— pero
          // nadie las leía en la pantalla.
          atendioPor: staffUsers.fullName,
          puntoDeVenta: accounts.name,
        })
        .from(redemptions)
        .innerJoin(rewards, eq(rewards.id, redemptions.rewardId))
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, redemptions.consumerId))
        .leftJoin(staffUsers, eq(staffUsers.id, redemptions.canjeadoPor))
        .leftJoin(accounts, eq(accounts.id, redemptions.accountId))
        .orderBy(desc(redemptions.createdAt))
        .limit(30),
    ]);

    const porId = new Map(porPremio.map((p) => [p.rewardId, p]));
    const conPocoStock = catalogo.filter(
      (r) => r.activo && r.stock !== null && r.stock <= STOCK_BAJO_UMBRAL
    );

    return {
      catalogo: catalogo.map((r) => ({
        ...r,
        metricas: porId.get(r.id) ?? { emitidos: 0, entregados: 0, pendientes: 0 },
        stockBajo: r.stock !== null && r.stock <= STOCK_BAJO_UMBRAL,
      })),
      totales: {
        ...(totales[0] ?? { emitidos: 0, entregados: 0, pendientes: 0, caducados: 0, puntosGastados: 0 }),
        conPocoStock: conPocoStock.length,
      },
      ultimos,
    };
  }));
}

// -----------------------------------------------------------------------------
// Reseñas y moderación
// -----------------------------------------------------------------------------

export async function resumenResenas(filtro?: { soloAlertas?: boolean }) {
  const clave = `b2c:resenas:${filtro?.soloAlertas ? 'alertas' : 'todas'}`;

  return conRespaldo(clave, () => conBaseDeDatos(async (db) => {
    const [filas, [totales], porLinea] = await Promise.all([
      db
        .select({
          id: consumerReviews.id,
          puntuacion: consumerReviews.puntuacion,
          comentario: consumerReviews.comentario,
          sentimiento: consumerReviews.sentimiento,
          puntuacionSentimiento: consumerReviews.puntuacionSentimiento,
          atributos: consumerReviews.atributos,
          alertaCalidad: consumerReviews.alertaCalidad,
          analizadaEn: consumerReviews.analizadaEn,
          // La causa raíz y lo que marcó la persona de un toque. Sin estas dos,
          // la pantalla solo podía decir "sin analizar" — que es lo que decía.
          categoria: consumerReviews.categoria,
          motivos: consumerReviews.motivos,
          linea: consumerReviews.productLine,
          fecha: consumerReviews.createdAt,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
          bar: accounts.name,
          zona: accounts.zone,
        })
        .from(consumerReviews)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, consumerReviews.consumerId))
        .leftJoin(accounts, eq(accounts.id, consumerReviews.accountId))
        .where(filtro?.soloAlertas ? eq(consumerReviews.alertaCalidad, true) : undefined)
        // Las alertas primero: una tanda defectuosa no espera a que alguien
        // baje por la lista.
        .orderBy(desc(consumerReviews.alertaCalidad), desc(consumerReviews.createdAt))
        .limit(100),

      db
        .select({
          total: count(consumerReviews.id),
          alertas: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.alertaCalidad})::int`,
          positivas: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.sentimiento} = 'positivo')::int`,
          negativas: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.sentimiento} = 'negativo')::int`,
          sinAnalizar: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.analizadaEn} IS NULL)::int`,
          media: sql<number>`COALESCE(ROUND(AVG(${consumerReviews.puntuacion})::numeric, 2), 0)`,
        })
        .from(consumerReviews),

      db
        .select({
          linea: consumerReviews.productLine,
          total: count(consumerReviews.id),
          media: sql<number>`COALESCE(ROUND(AVG(${consumerReviews.puntuacion})::numeric, 2), 0)`,
          alertas: sql<number>`COUNT(*) FILTER (WHERE ${consumerReviews.alertaCalidad})::int`,
        })
        .from(consumerReviews)
        .groupBy(consumerReviews.productLine)
        .orderBy(desc(count(consumerReviews.id))),
    ]);

    return {
      filas,
      totales: totales ?? { total: 0, alertas: 0, positivas: 0, negativas: 0, sinAnalizar: 0, media: 0 },
      porLinea,
    };
  }));
}

/** Usuarios del equipo, con su actividad. */
export async function listarUsuarios() {
  return conRespaldo('crm:usuarios', () => conBaseDeDatos(async (db) =>
    db
      .select({
        id: staffUsers.id,
        email: staffUsers.email,
        nombre: staffUsers.fullName,
        rol: staffUsers.role,
        activo: staffUsers.isActive,
        ultimoAcceso: staffUsers.lastLoginAt,
        alta: staffUsers.createdAt,
      })
      .from(staffUsers)
      .orderBy(asc(staffUsers.email))
  ));
}

/** Respuestas entrantes de los comensales. */
export async function bandejaEntrada() {
  return conRespaldo('b2c:bandeja', () => conBaseDeDatos(async (db) => {
    const [filas, [totales]] = await Promise.all([
      db
        .select({
          id: mensajesEntrantes.id,
          texto: mensajesEntrantes.texto,
          canal: mensajesEntrantes.canal,
          remitente: mensajesEntrantes.remitente,
          atendido: mensajesEntrantes.atendido,
          notaInterna: mensajesEntrantes.notaInterna,
          recibido: mensajesEntrantes.recibidoEn,
          comensal: b2cConsumers.fullName,
          comensalId: b2cConsumers.id,
        })
        .from(mensajesEntrantes)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, mensajesEntrantes.consumerId))
        // Sin atender primero: son los que esperan a alguien.
        .orderBy(asc(mensajesEntrantes.atendido), desc(mensajesEntrantes.recibidoEn))
        .limit(50),

      db
        .select({
          total: count(mensajesEntrantes.id),
          pendientes: sql<number>`COUNT(*) FILTER (WHERE NOT ${mensajesEntrantes.atendido})::int`,
        })
        .from(mensajesEntrantes),
    ]);

    return { filas, totales: totales ?? { total: 0, pendientes: 0 } };
  }));
}

// -----------------------------------------------------------------------------
// Bandeja de WhatsApp
// -----------------------------------------------------------------------------

export async function listarConversaciones() {
  return conRespaldo('wa:conversaciones', () => conBaseDeDatos(async (db) => {
    const [filas, [totales]] = await Promise.all([
      db
        .select({
          id: chatConversations.id,
          telefono: chatConversations.telefono,
          nombrePerfil: chatConversations.nombrePerfil,
          estado: chatConversations.estado,
          sinLeer: chatConversations.sinLeer,
          ultimoMensajeEn: chatConversations.ultimoMensajeEn,
          ventanaExpiraEn: chatConversations.ventanaExpiraEn,
          comensalId: b2cConsumers.id,
          comensal: b2cConsumers.fullName,
          nivel: b2cConsumers.membershipTier,
          puntos: b2cConsumers.points,
          asignadoA: staffUsers.email,
          // Un extracto para la lista: traer el hilo entero de cada
          // conversación solo para pintar una línea sería absurdo.
          ultimoTexto: sql<string | null>`(
            SELECT ${chatMessages.texto} FROM ${chatMessages}
            WHERE ${chatMessages.conversationId} = ${chatConversations.id}
            ORDER BY ${chatMessages.createdAt} DESC LIMIT 1
          )`,
        })
        .from(chatConversations)
        .leftJoin(b2cConsumers, eq(b2cConsumers.id, chatConversations.consumerId))
        .leftJoin(staffUsers, eq(staffUsers.id, chatConversations.asignadoA))
        // Sin leer primero: son los que esperan a alguien.
        .orderBy(desc(chatConversations.sinLeer), desc(chatConversations.ultimoMensajeEn))
        .limit(50),

      db
        .select({
          total: count(chatConversations.id),
          sinAtender: sql<number>`COUNT(*) FILTER (WHERE ${chatConversations.sinLeer} > 0)::int`,
          abiertas: sql<number>`COUNT(*) FILTER (WHERE ${chatConversations.ventanaExpiraEn} > now())::int`,
        })
        .from(chatConversations),
    ]);

    return { filas, totales: totales ?? { total: 0, sinAtender: 0, abiertas: 0 } };
  }));
}

/** Hilo completo de una conversación. */
export async function hiloConversacion(conversationId: string) {
  return conRespaldo(`wa:hilo:${conversationId}`, () => conBaseDeDatos(async (db) => {
    const [conversacion] = await db
      .select({
        id: chatConversations.id,
        telefono: chatConversations.telefono,
        nombrePerfil: chatConversations.nombrePerfil,
        estado: chatConversations.estado,
        ventanaExpiraEn: chatConversations.ventanaExpiraEn,
        comensalId: b2cConsumers.id,
        comensal: b2cConsumers.fullName,
        nivel: b2cConsumers.membershipTier,
        puntos: b2cConsumers.points,
        asignadoA: staffUsers.email,
      })
      .from(chatConversations)
      .leftJoin(b2cConsumers, eq(b2cConsumers.id, chatConversations.consumerId))
      .leftJoin(staffUsers, eq(staffUsers.id, chatConversations.asignadoA))
      .where(eq(chatConversations.id, conversationId))
      .limit(1);

    if (!conversacion) return null;

    const mensajes = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(200);

    return { conversacion, mensajes };
  }));
}
