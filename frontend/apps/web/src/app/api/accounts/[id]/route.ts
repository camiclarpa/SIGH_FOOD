// =============================================================================
// SIGH_FOOD - Ficha de una cuenta B2B
// Endpoint: GET /api/accounts/[id]
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  accounts,
  consignationLogs,
  qrCodes,
  sensoryMoments,
  multivariatePredictions,
} from '@sighfood/domain/db/schema';
import { count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const idSchema = z.string().uuid('El identificador debe ser un UUID');

export const GET = conTrazas('/api/accounts/[id]', async (
  request: NextRequest,
  contexto: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await contexto.params;
    const validacion = idSchema.safeParse(id);

    if (!validacion.success) {
      return NextResponse.json(
        { success: false, error: 'Identificador inválido' },
        { status: 400 }
      );
    }

    return await conBaseDeDatos(async (db) => {
      const [cuenta] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);

      if (!cuenta) {
        return NextResponse.json(
          { success: false, error: 'Cuenta no encontrada' },
          { status: 404 }
        );
      }

      // Todo lo relacionado en paralelo: son consultas independientes y en serie
      // sumaban su latencia una detrás de otra.
      const [entregas, codigos, resumenConsignacion, escaneos, predicciones] = await Promise.all([
        db
          .select({
            id: consignationLogs.id,
            entregadas: consignationLogs.unitsDelivered,
            vendidas: consignationLogs.unitsSold,
            precioUnitario: consignationLogs.unitPrice,
            lote: consignationLogs.batchNumber,
            caducidad: consignationLogs.expiryDate,
            estado: consignationLogs.settlementStatus,
            despachado: consignationLogs.dispatchedAt,
            liquidado: consignationLogs.settledAt,
          })
          .from(consignationLogs)
          .where(eq(consignationLogs.accountId, id))
          .orderBy(desc(consignationLogs.dispatchedAt))
          .limit(20),

        db
          .select({
            id: qrCodes.id,
            mesa: qrCodes.tableNumber,
            token: qrCodes.qrToken,
            activo: qrCodes.isActive,
            creado: qrCodes.createdAt,
          })
          .from(qrCodes)
          .where(eq(qrCodes.accountId, id))
          .orderBy(qrCodes.tableNumber),

        // Los totales se agregan en SQL y no sumando en JavaScript las 20
        // entregas de arriba: esa lista está paginada y el total saldría corto.
        db
          .select({
            entregadas: sql<string>`coalesce(sum(${consignationLogs.unitsDelivered}), 0)`,
            vendidas: sql<string>`coalesce(sum(${consignationLogs.unitsSold}), 0)`,
            pendientesLiquidar: sql<string>`
              coalesce(sum(case when ${consignationLogs.settlementStatus} = 'pending'
                then ${consignationLogs.unitsSold} else 0 end), 0)
            `,
          })
          .from(consignationLogs)
          .where(eq(consignationLogs.accountId, id)),

        db
          .select({
            linea: sensoryMoments.productLine,
            total: count(sensoryMoments.id),
          })
          .from(sensoryMoments)
          .where(eq(sensoryMoments.accountId, id))
          .groupBy(sensoryMoments.productLine),

        db
          .select({
            tipo: multivariatePredictions.predictionType,
            horizonte: multivariatePredictions.horizon,
            valor: multivariatePredictions.predictedValue,
            confianza: multivariatePredictions.confidence,
            riesgo: multivariatePredictions.riskScore,
            factores: multivariatePredictions.factors,
          })
          .from(multivariatePredictions)
          .where(eq(multivariatePredictions.targetEntityId, id))
          .limit(10),
      ]);

      const totales = resumenConsignacion[0] ?? { entregadas: '0', vendidas: '0', pendientesLiquidar: '0' };
      const entregadas = Number(totales.entregadas);
      const vendidas = Number(totales.vendidas);

      return NextResponse.json({
        success: true,
        data: {
          cuenta,
          consignacion: {
            entregas,
            totales: {
              entregadas,
              vendidas,
              enPoder: entregadas - vendidas,
              pendientesLiquidar: Number(totales.pendientesLiquidar),
              // Sin el guardo, una cuenta sin entregas daba 0/0 = NaN.
              rotacion: entregadas === 0 ? 0 : Math.round((vendidas / entregadas) * 100),
            },
          },
          qr: codigos,
          escaneosPorLinea: escaneos,
          predicciones,
        },
      });
    });
  } catch (error) {
    log.error('Error obteniendo la ficha de cuenta', error, { ruta: '/api/accounts/[id]' });
    return NextResponse.json(
      { success: false, error: 'Error al obtener la cuenta' },
      { status: 500 }
    );
  }
});
