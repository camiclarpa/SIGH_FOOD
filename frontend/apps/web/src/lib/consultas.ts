// =============================================================================
// Consultas de lectura del CRM
// =============================================================================
//
// Vive aparte de las rutas de API porque las pantallas son Server Components y
// consultan la base directamente. Hacer que una página se llame a sí misma por
// HTTP añade un salto de red completo por render y obliga a reenviar la cookie
// de sesión a mano.
//
// Las rutas de /api/* delegan aquí, así que la lógica de cada consulta existe
// una sola vez.

import { conBaseDeDatos } from '@/lib/cloudflare';
import { conRespaldo } from '@/lib/respaldo';
import {
  accounts,
  consignationLogs,
  qrCodes,
  sensoryMoments,
  b2cConsumers,
} from '@sighfood/domain/db/schema';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

export const ETAPAS_PIPELINE = [
  'lead_landing',
  'lemon_test_pending',
  'lemon_test_passed',
  'consignation_active',
  'recurring_client',
  'saas_converted',
  'churned',
] as const;

export type EtapaPipeline = (typeof ETAPAS_PIPELINE)[number];

const ORDENABLES = {
  nombre: accounts.name,
  zona: accounts.zone,
  creado: accounts.createdAt,
  actividad: accounts.lastActivity,
  churn: accounts.churnScore,
  stock: accounts.currentConsignationStock,
} as const;

export type CampoOrden = keyof typeof ORDENABLES;

export interface FiltrosCuentas {
  limite?: number;
  pagina?: number;
  etapa?: string;
  zona?: string;
  riesgo?: string;
  buscar?: string;
  orden?: CampoOrden;
  dir?: 'asc' | 'desc';
}

function construirFiltros(f: FiltrosCuentas): SQL | undefined {
  const partes: SQL[] = [];
  if (f.etapa) partes.push(eq(accounts.pipelineStage, f.etapa as never));
  if (f.zona) partes.push(eq(accounts.zone, f.zona));
  if (f.riesgo) partes.push(eq(accounts.churnRisk, f.riesgo as never));
  if (f.buscar) {
    const patron = `%${f.buscar}%`;
    const porTexto = or(
      ilike(accounts.name, patron),
      ilike(accounts.commercialName, patron),
      ilike(accounts.email, patron),
      ilike(accounts.decisionMakerName, patron)
    );
    if (porTexto) partes.push(porTexto);
  }
  return partes.length > 0 ? and(...partes) : undefined;
}

export async function listarCuentas(f: FiltrosCuentas = {}) {
  // El techo de 100 no es cosmético: sin él una petición puede pedir la tabla
  // entera y obligar a Postgres a materializarla y serializarla completa.
  const limite = Math.min(100, Math.max(1, f.limite ?? 25));
  const pagina = Math.max(1, f.pagina ?? 1);
  const donde = construirFiltros(f);
  const columna = ORDENABLES[f.orden ?? 'creado'];
  const ordenacion = f.dir === 'asc' ? asc(columna) : desc(columna);

  const clave = `cuentas:${limite}:${pagina}:${f.orden ?? 'creado'}:${f.dir ?? 'desc'}:` +
    `${f.etapa ?? ''}:${f.zona ?? ''}:${f.riesgo ?? ''}:${f.buscar ?? ''}`;

  return conRespaldo(clave, () => conBaseDeDatos(async (db) => {
    // El total va en su propia consulta: con paginación, `filas.length` es el
    // tamaño de la página, no el número de resultados.
    const [filas, [{ total }]] = await Promise.all([
      db
        .select({
          id: accounts.id,
          nombre: accounts.name,
          nombreComercial: accounts.commercialName,
          zona: accounts.zone,
          etapa: accounts.pipelineStage,
          contacto: accounts.decisionMakerName,
          telefono: accounts.phone,
          email: accounts.email,
          stock: accounts.currentConsignationStock,
          umbralAlerta: accounts.reorderAlertThreshold,
          riesgoChurn: accounts.churnRisk,
          puntuacionChurn: accounts.churnScore,
          nivelLead: accounts.leadScore,
          probabilidadConversion: accounts.conversionProb,
          ultimaActividad: accounts.lastActivity,
          creado: accounts.createdAt,
        })
        .from(accounts)
        .where(donde)
        .orderBy(ordenacion)
        .limit(limite)
        .offset((pagina - 1) * limite),
      db.select({ total: count(accounts.id) }).from(accounts).where(donde),
    ]);

    return {
      filas,
      paginacion: {
        pagina,
        limite,
        total,
        paginas: Math.max(1, Math.ceil(total / limite)),
      },
    };
  }));
}

/** Valores distintos de zona, para poblar el filtro sin inventarse la lista. */
export async function listarZonas() {
  return conRespaldo('zonas', () => conBaseDeDatos(async (db) => {
    const filas = await db
      .selectDistinct({ zona: accounts.zone })
      .from(accounts)
      .orderBy(asc(accounts.zone));
    return filas.map((f) => f.zona).filter(Boolean);
  }));
}

export async function resumenPipeline() {
  return conRespaldo('pipeline', () => conBaseDeDatos(async (db) => {
    const [conteos, tarjetas] = await Promise.all([
      db
        .select({ etapa: accounts.pipelineStage, total: count(accounts.id) })
        .from(accounts)
        .groupBy(accounts.pipelineStage),

      // Se numeran las cuentas dentro de cada etapa y se cortan a 8: así el
      // tablero pinta una muestra por columna sin traerse las 1000 filas.
      db
        .select({
          id: accounts.id,
          nombre: accounts.name,
          zona: accounts.zone,
          etapa: accounts.pipelineStage,
          riesgoChurn: accounts.churnRisk,
          stock: accounts.currentConsignationStock,
          fila: sql<number>`row_number() over (
            partition by ${accounts.pipelineStage}
            order by ${accounts.createdAt} desc
          )`.as('fila'),
        })
        .from(accounts),
    ]);

    const porEtapa = new Map(conteos.map((c) => [c.etapa ?? 'lead_landing', c.total]));
    const muestra = tarjetas.filter((t) => Number(t.fila) <= 8);

    return {
      etapas: ETAPAS_PIPELINE.map((etapa) => ({
        etapa,
        total: porEtapa.get(etapa) ?? 0,
        cuentas: muestra.filter((t) => t.etapa === etapa),
      })),
      total: conteos.reduce((s, c) => s + c.total, 0),
    };
  }));
}

export async function resumenPanel() {
  return conRespaldo('panel', () => conBaseDeDatos(async (db) => {
    const [
      [cuentas],
      [activas],
      [comensales],
      [escaneos],
      [consignacion],
      porEtapa,
      porRiesgo,
      enRiesgo,
      stockBajo,
    ] = await Promise.all([
      db.select({ total: count(accounts.id) }).from(accounts),
      db
        .select({ total: count(accounts.id) })
        .from(accounts)
        .where(eq(accounts.pipelineStage, 'consignation_active')),
      db.select({ total: count(b2cConsumers.id) }).from(b2cConsumers),
      db.select({ total: count(sensoryMoments.id) }).from(sensoryMoments),
      db
        .select({
          entregadas: sql<string>`coalesce(sum(${consignationLogs.unitsDelivered}), 0)`,
          vendidas: sql<string>`coalesce(sum(${consignationLogs.unitsSold}), 0)`,
        })
        .from(consignationLogs),
      db
        .select({ etapa: accounts.pipelineStage, total: count(accounts.id) })
        .from(accounts)
        .groupBy(accounts.pipelineStage),
      db
        .select({ riesgo: accounts.churnRisk, total: count(accounts.id) })
        .from(accounts)
        .groupBy(accounts.churnRisk),

      // Las dos listas de trabajo del comercial: a quién llamar hoy.
      db
        .select({
          id: accounts.id,
          nombre: accounts.name,
          zona: accounts.zone,
          riesgoChurn: accounts.churnRisk,
          puntuacionChurn: accounts.churnScore,
          ultimaActividad: accounts.lastActivity,
        })
        .from(accounts)
        .where(or(eq(accounts.churnRisk, 'high'), eq(accounts.churnRisk, 'critical')))
        .orderBy(desc(accounts.churnScore))
        .limit(8),

      db
        .select({
          id: accounts.id,
          nombre: accounts.name,
          zona: accounts.zone,
          stock: accounts.currentConsignationStock,
          umbral: accounts.reorderAlertThreshold,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.pipelineStage, 'consignation_active'),
            // Comparar contra el umbral de cada cuenta y no contra un número
            // fijo: el punto de reposición depende del tamaño del local.
            sql`${accounts.currentConsignationStock} <= ${accounts.reorderAlertThreshold}`
          )
        )
        .orderBy(asc(accounts.currentConsignationStock))
        .limit(8),
    ]);

    const entregadas = Number(consignacion?.entregadas ?? 0);
    const vendidas = Number(consignacion?.vendidas ?? 0);

    return {
      cuentas: cuentas?.total ?? 0,
      activas: activas?.total ?? 0,
      comensales: comensales?.total ?? 0,
      escaneos: escaneos?.total ?? 0,
      consignacion: {
        entregadas,
        vendidas,
        enPoder: entregadas - vendidas,
        // 0/0 daría NaN, que se serializa como null y rompe la tarjeta.
        rotacion: entregadas === 0 ? 0 : Math.round((vendidas / entregadas) * 100),
      },
      porEtapa,
      porRiesgo,
      enRiesgo,
      stockBajo,
    };
  }));
}

export async function entregasRecientes(limite = 50) {
  return conRespaldo(`entregas:${limite}`, () => conBaseDeDatos(async (db) =>
    db
      .select({
        id: consignationLogs.id,
        cuentaId: consignationLogs.accountId,
        cuenta: accounts.name,
        zona: accounts.zone,
        entregadas: consignationLogs.unitsDelivered,
        vendidas: consignationLogs.unitsSold,
        precioUnitario: consignationLogs.unitPrice,
        lote: consignationLogs.batchNumber,
        caducidad: consignationLogs.expiryDate,
        estado: consignationLogs.settlementStatus,
        despachado: consignationLogs.dispatchedAt,
      })
      .from(consignationLogs)
      // innerJoin y no dos consultas: sin el join haría falta una consulta por
      // entrega para resolver el nombre de la cuenta.
      .innerJoin(accounts, eq(accounts.id, consignationLogs.accountId))
      .orderBy(desc(consignationLogs.dispatchedAt))
      .limit(Math.min(200, limite))
  ));
}

export async function codigosQr(limite = 200) {
  return conRespaldo(`qr:${limite}`, () => conBaseDeDatos(async (db) => {
    const [filas, escaneosPorCuenta, escaneosPorMesa] = await Promise.all([
      db
        .select({
          id: qrCodes.id,
          cuentaId: qrCodes.accountId,
          cuenta: accounts.name,
          zona: accounts.zone,
          mesa: qrCodes.tableNumber,
          token: qrCodes.qrToken,
          activo: qrCodes.isActive,
          creado: qrCodes.createdAt,
          destinoUrl: qrCodes.destinoUrl,
          campana: qrCodes.campana,
        })
        .from(qrCodes)
        .innerJoin(accounts, eq(accounts.id, qrCodes.accountId))
        .orderBy(asc(accounts.name), asc(qrCodes.tableNumber))
        .limit(Math.min(500, limite)),

      db
        .select({ cuentaId: sensoryMoments.accountId, total: count(sensoryMoments.id) })
        .from(sensoryMoments)
        .groupBy(sensoryMoments.accountId),

      // Desglose por mesa: solo cuenta lo escaneado DESDE que se guarda
      // qr_code_id en cada momento (migración 0021). Un QR con muchos
      // escaneos históricos y "0" aquí no está roto: es que esos escaneos
      // son de antes de que existiera esta columna.
      db
        .select({
          qrCodeId: sensoryMoments.qrCodeId,
          total: count(sensoryMoments.id),
          ultimo: sql<string | null>`MAX(${sensoryMoments.scannedAt})`,
        })
        .from(sensoryMoments)
        .where(sql`${sensoryMoments.qrCodeId} IS NOT NULL`)
        .groupBy(sensoryMoments.qrCodeId),
    ]);

    const porCuenta = new Map(escaneosPorCuenta.map((e) => [e.cuentaId, e.total]));
    const porMesa = new Map(escaneosPorMesa.map((e) => [e.qrCodeId, e]));

    return filas.map((f) => ({
      ...f,
      escaneosCuenta: porCuenta.get(f.cuentaId) ?? 0,
      escaneosMesa: porMesa.get(f.id)?.total ?? 0,
      ultimoEscaneoMesa: porMesa.get(f.id)?.ultimo ?? null,
    }));
  }));
}
