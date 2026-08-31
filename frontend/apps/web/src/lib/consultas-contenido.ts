// =============================================================================
// Consultas de contenido, activaciones y embajadores
// =============================================================================
//
// Las tres herramientas de la capa de activación B2C. Comparten archivo porque
// comparten pregunta: ¿esto trae gente, y cuánto cuesta que la traiga?

import { and, count, desc, eq, gte, sql } from 'drizzle-orm';
import {
  activaciones,
  b2cConsumers,
  contenidos,
  embajadores,
  lotes,
  pedidos,
  qrCodes,
  sensoryMoments,
} from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

// -----------------------------------------------------------------------------
// Biblioteca de contenido
// -----------------------------------------------------------------------------

export async function listarContenidos(filtro?: { estado?: string; canal?: string }) {
  return conBaseDeDatos(async (db) => {
    const condiciones = [];
    if (filtro?.estado) condiciones.push(eq(contenidos.estado, filtro.estado as never));
    if (filtro?.canal) condiciones.push(eq(contenidos.canal, filtro.canal as never));

    const filas = await db
      .select({
        id: contenidos.id,
        titulo: contenidos.titulo,
        tipo: contenidos.tipo,
        canal: contenidos.canal,
        lineaProducto: contenidos.lineaProducto,
        estado: contenidos.estado,
        gancho: contenidos.gancho,
        notas: contenidos.notas,
        url: contenidos.url,
        mediaKey: contenidos.mediaKey,
        mediaTipo: contenidos.mediaTipo,
        loteId: contenidos.loteId,
        loteCodigo: lotes.codigo,
        publicadoEn: contenidos.publicadoEn,
        alcance: contenidos.alcance,
        interacciones: contenidos.interacciones,
        createdAt: contenidos.createdAt,
      })
      .from(contenidos)
      .leftJoin(lotes, eq(lotes.id, contenidos.loteId))
      .where(condiciones.length ? and(...condiciones) : undefined)
      // Lo publicado más reciente arriba; lo que aún no salió, al final. Sin el
      // NULLS LAST, las ideas sin fecha se comen la parte de arriba de la lista
      // y esconden lo que de verdad está en marcha.
      .orderBy(sql`${contenidos.publicadoEn} DESC NULLS LAST`, desc(contenidos.createdAt))
      .limit(200);

    const porEstado = await db
      .select({ estado: contenidos.estado, total: count(contenidos.id) })
      .from(contenidos)
      .groupBy(contenidos.estado);

    return { filas, porEstado };
  });
}

// -----------------------------------------------------------------------------
// Activaciones presenciales
// -----------------------------------------------------------------------------

export async function listarActivaciones() {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select({
        id: activaciones.id,
        nombre: activaciones.nombre,
        tipo: activaciones.tipo,
        estado: activaciones.estado,
        lugar: activaciones.lugar,
        fecha: activaciones.fecha,
        asistentes: activaciones.asistentes,
        aforoEstimado: activaciones.aforoEstimado,
        comensalesNuevos: activaciones.comensalesNuevos,
        ventasCOP: activaciones.ventasCOP,
        costeCOP: activaciones.costeCOP,
        notas: activaciones.notas,
        qrCodeId: activaciones.qrCodeId,
        qrMesa: qrCodes.tableNumber,
        /*
          Ventas de verdad atribuidas al QR del evento, no tecleadas.

          Quien escaneó el QR de esta activación queda vinculado por ese
          escaneo (sensory_moments.qr_code_id). Cualquier pedido ENTREGADO
          suyo, en cualquier momento después, se cuenta como traído por el
          evento — un QR de activación es de un solo uso específico, no una
          mesa recurrente, así que ese vínculo es fiable.

          Esto complementa a ventasCOP (que puede incluir ventas en efectivo
          del propio evento, sin QR de por medio), no lo sustituye.
        */
        ventasAtribuidasQrCOP: sql<number>`(
          SELECT COALESCE(SUM(p.total_cop), 0)::int FROM ${pedidos} p
          WHERE p.estado = 'entregado' AND p.consumer_id IN (
            SELECT DISTINCT sm.consumer_id FROM ${sensoryMoments} sm
            WHERE sm.qr_code_id = ${activaciones.qrCodeId} AND sm.consumer_id IS NOT NULL
          )
        )`,
        comensalesAtribuidosQr: sql<number>`(
          SELECT count(DISTINCT sm.consumer_id)::int FROM ${sensoryMoments} sm
          WHERE sm.qr_code_id = ${activaciones.qrCodeId} AND sm.consumer_id IS NOT NULL
        )`,
      })
      .from(activaciones)
      .leftJoin(qrCodes, eq(qrCodes.id, activaciones.qrCodeId))
      // Las próximas primero: la pantalla se abre para preparar lo que viene,
      // no para repasar lo que pasó.
      .orderBy(desc(activaciones.fecha))
      .limit(100);

    /*
      Rentabilidad de lo YA REALIZADO.

      Solo cuentan las realizadas: incluir las planificadas metería un coste
      previsto sin ninguna venta al lado, y el retorno saldría siempre negativo
      hasta el día del evento.
    */
    const [totales] = await db
      .select({
        eventos: count(activaciones.id),
        ventas: sql<number>`COALESCE(SUM(${activaciones.ventasCOP}), 0)::int`,
        coste: sql<number>`COALESCE(SUM(${activaciones.costeCOP}), 0)::int`,
        nuevos: sql<number>`COALESCE(SUM(${activaciones.comensalesNuevos}), 0)::int`,
      })
      .from(activaciones)
      .where(eq(activaciones.estado, 'realizada'));

    return { filas, totales };
  });
}

/** Lotes vivos, para vincular una pieza de contenido a la tanda de la que habla. */
export async function lotesDisponibles() {
  return conBaseDeDatos(async (db) =>
    db
      .select({ id: lotes.id, codigo: lotes.codigo })
      .from(lotes)
      .where(sql`${lotes.retirado} = false`)
      .orderBy(desc(lotes.producidoEn))
      .limit(100)
  );
}

/** QR disponibles para asignar a una activación. */
export async function qrParaActivaciones() {
  return conBaseDeDatos(async (db) =>
    db
      .select({ id: qrCodes.id, etiqueta: qrCodes.tableNumber, activo: qrCodes.isActive })
      .from(qrCodes)
      .orderBy(qrCodes.tableNumber)
      .limit(100)
  );
}

// -----------------------------------------------------------------------------
// Embajadores
// -----------------------------------------------------------------------------

export interface FilaEmbajador {
  id: string;
  consumerId: string;
  alias: string | null;
  nombre: string | null;
  telefono: string;
  codigo: string;
  estado: string;
  puntosPorPedido: number;
  comisionPorPedidoCop: number | null;
  comisionLiquidadaCop: number;
  seguidores: number | null;
  /** Pedidos entregados que trajo su código. */
  pedidos: number;
  /** Pesos facturados por esos pedidos. */
  ventas: number;
  /** Comensales distintos que llegaron por él. */
  personas: number;
  /** Comisión generada menos lo ya liquidado. 0 si no tiene comisión en pesos. */
  comisionPendienteCop: number;
}

/**
 * Embajadores con lo que han traído.
 *
 * Las ventas NO están guardadas en ninguna columna: se cruzan aquí contra
 * `pedidos.referido_por`. Un contador acumulado se desincronizaría en cuanto se
 * cancelara un pedido, y entonces habría dos cifras y nadie sabría cuál vale.
 *
 * Solo cuentan los ENTREGADOS, igual que en el resto del CRM: un pedido
 * cancelado no es una venta que nadie tenga que premiar.
 */
export async function listarEmbajadores(): Promise<FilaEmbajador[]> {
  return conBaseDeDatos(async (db) => {
    const filas = await db
      .select({
        id: embajadores.id,
        consumerId: embajadores.consumerId,
        alias: embajadores.alias,
        nombre: b2cConsumers.fullName,
        telefono: b2cConsumers.whatsappPhone,
        codigo: embajadores.codigo,
        estado: embajadores.estado,
        puntosPorPedido: embajadores.puntosPorPedido,
        comisionPorPedidoCop: embajadores.comisionPorPedidoCop,
        comisionLiquidadaCop: embajadores.comisionLiquidadaCop,
        seguidores: embajadores.seguidores,
        pedidos: sql<number>`(
          SELECT count(*)::int FROM ${pedidos} p
          WHERE p.referido_por = ${embajadores.codigo} AND p.estado = 'entregado'
        )`,
        ventas: sql<number>`(
          SELECT COALESCE(SUM(p.total_cop), 0)::int FROM ${pedidos} p
          WHERE p.referido_por = ${embajadores.codigo} AND p.estado = 'entregado'
        )`,
        personas: sql<number>`(
          SELECT count(DISTINCT p.consumer_id)::int FROM ${pedidos} p
          WHERE p.referido_por = ${embajadores.codigo} AND p.estado = 'entregado'
        )`,
      })
      .from(embajadores)
      .innerJoin(b2cConsumers, eq(b2cConsumers.id, embajadores.consumerId))
      .orderBy(desc(sql`(
        SELECT COALESCE(SUM(p.total_cop), 0) FROM ${pedidos} p
        WHERE p.referido_por = ${embajadores.codigo} AND p.estado = 'entregado'
      )`))
      .limit(200);

    return filas.map((f) => {
      const pedidos = Number(f.pedidos ?? 0);
      const generadoCop = f.comisionPorPedidoCop ? pedidos * f.comisionPorPedidoCop : 0;
      return {
        ...f,
        pedidos,
        ventas: Number(f.ventas ?? 0),
        personas: Number(f.personas ?? 0),
        comisionPendienteCop: Math.max(0, generadoCop - f.comisionLiquidadaCop),
      };
    });
  });
}

/**
 * Comensales que aún no son embajadores.
 *
 * Se ordenan por gasto: quien más compra es quien más convence, y además ya
 * conoce el producto lo bastante para hablar de él sin que suene a anuncio.
 */
export async function candidatosAEmbajador(limite = 30) {
  return conBaseDeDatos(async (db) =>
    db
      .select({
        id: b2cConsumers.id,
        nombre: b2cConsumers.fullName,
        telefono: b2cConsumers.whatsappPhone,
        gasto: sql<number>`(
          SELECT COALESCE(SUM(p.total_cop), 0)::int FROM ${pedidos} p
          WHERE p.consumer_id = ${b2cConsumers.id} AND p.estado = 'entregado'
        )`,
      })
      .from(b2cConsumers)
      .where(sql`NOT EXISTS (
        SELECT 1 FROM ${embajadores} e WHERE e.consumer_id = ${b2cConsumers.id}
      )`)
      .orderBy(desc(sql`(
        SELECT COALESCE(SUM(p.total_cop), 0) FROM ${pedidos} p
        WHERE p.consumer_id = ${b2cConsumers.id} AND p.estado = 'entregado'
      )`))
      .limit(limite)
  );
}

/** Pedidos traídos por embajadores en los últimos N días, para la cabecera. */
export async function resumenEmbajadores(dias = 30) {
  return conBaseDeDatos(async (db) => {
    const desde = new Date(Date.now() - dias * 24 * 3_600_000);

    const [activos] = await db
      .select({ total: count(embajadores.id) })
      .from(embajadores)
      .where(eq(embajadores.estado, 'activo'));

    const [traido] = await db
      .select({
        pedidos: count(pedidos.id),
        ventas: sql<number>`COALESCE(SUM(${pedidos.totalCOP}), 0)::int`,
      })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.estado, 'entregado'),
          gte(pedidos.createdAt, desde),
          sql`${pedidos.referidoPor} IS NOT NULL`
        )
      );

    return {
      activos: activos?.total ?? 0,
      pedidos: Number(traido?.pedidos ?? 0),
      ventas: Number(traido?.ventas ?? 0),
      dias,
    };
  });
}
