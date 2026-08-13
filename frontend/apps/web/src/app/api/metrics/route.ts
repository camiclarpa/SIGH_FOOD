// =============================================================================
// SIGH_FOOD - Endpoint de Consulta de Metricas
// Endpoints:
//   GET /api/metrics                    - Metricas generales (North Star)
//   GET /api/metrics/accounts           - Metricas por cuenta (restaurante)
//   GET /api/metrics/products           - Metricas por linea de producto
//   GET /api/metrics/consumers          - Comensales unicos por cuenta
// Descripcion: Dashboard de metricas para el CRM administrativo
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  accounts,
  b2cConsumers,
  sensoryMoments,
  consignationLogs,
} from '@sighfood/domain/db/schema';
import { eq, and, count, sum, sql, desc } from 'drizzle-orm';
import { conCache } from '@sighfood/domain/lib/cache';
import { conBaseDeDatos } from '@/lib/cloudflare';

// =============================================================================
// Schemas de validacion con Zod
// =============================================================================

const accountIdSchema = z.object({
  account_id: z.string().uuid('El account_id debe ser un UUID valido').optional(),
});

// =============================================================================
// Helper: Formatear respuesta de error
// =============================================================================

function errorResponse(message: string, statusCode: number = 500) {
  return NextResponse.json(
    { success: false, error: message },
    { status: statusCode }
  );
}

// =============================================================================
// GET Handler - Metricas generales (North Star Metric)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metricType = searchParams.get('type') || 'general';
    const accountId = searchParams.get('account_id');
    
    // El cuerpo va dentro de conBaseDeDatos para que la conexión se cierre al
    // terminar la petición: en Workers, dejarla abierta cuelga la respuesta.
    return await conBaseDeDatos(async (db) => {

    // =============================================================================
    // TIPO 1: Metricas generales (North Star)
    // =============================================================================
    if (metricType === 'general') {
      // Estas cinco agregaciones son independientes entre sí. Encadenarlas con
      // `await` sumaba sus latencias: medido contra Neon, 696 ms en serie
      // frente a 148 ms con Promise.all (4,7x) sin tocar ninguna consulta.
      //
      // Además van cacheadas 60 s: dos de ellas son COUNT(*) sin filtro, que
      // recorren la tabla completa por definición y crecen con el volumen. El
      // panel no necesita precisión al segundo.
      const datos = await conCache('metrics:general', 60, async () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
          [totalMomentsResult],
          [totalConsumersResult],
          [totalAccountsResult],
          [totalConsignationResult],
          [recentMomentsResult],
        ] = await Promise.all([
          // Total de momentos sensoriales (North Star Metric)
          db.select({ total: count(sensoryMoments.id) }).from(sensoryMoments),

          // Total de comensales unicos
          db.select({ total: count(b2cConsumers.id) }).from(b2cConsumers),

          // Total de cuentas B2B activas
          db.select({ total: count(accounts.id) }).from(accounts).where(
            and(
              sql`${accounts.pipelineStage} != 'churned'`,
              sql`${accounts.pipelineStage} != 'lead_landing'`
            )
          ),

          // Total de unidades en consignacion activa
          db.select({ total: sum(consignationLogs.unitsDelivered) })
            .from(consignationLogs)
            .where(eq(consignationLogs.settlementStatus, 'pending')),

          // Momentos de los ultimos 7 dias (tendencia)
          db.select({ total: count(sensoryMoments.id) }).from(sensoryMoments).where(
            sql`${sensoryMoments.scannedAt} >= ${sevenDaysAgo.toISOString()}`
          ),
        ]);

        return {
          north_star: {
            total_sensory_moments: totalMomentsResult?.total || 0,
            moments_last_7_days: recentMomentsResult?.total || 0,
          },
          business_metrics: {
            total_consumers: totalConsumersResult?.total || 0,
            active_accounts: totalAccountsResult?.total || 0,
            pending_consignation_units: totalConsignationResult?.total || 0,
          },
        };
      });

      return NextResponse.json(
        {
          success: true,
          metric_type: 'general',
          ...datos,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // =============================================================================
    // TIPO 2: Metricas por cuenta (restaurante)
    // =============================================================================
    if (metricType === 'accounts') {
      console.log('Calculando metricas por cuenta...');
      
      const validationResult = accountIdSchema.safeParse({ account_id: accountId || undefined });
      
      if (accountId && !validationResult.success) {
        return errorResponse('account_id invalido', 400);
      }

      // Si hay account_id, devolver metricas de esa cuenta especifica
      if (accountId) {
        // Verificar que la cuenta exista
        const accountResult = await db.select()
          .from(accounts)
          .where(eq(accounts.id, accountId))
          .limit(1);
        
        if (!accountResult[0]) {
          return errorResponse('La cuenta especificada no existe', 404);
        }

        const [momentsResult] = await db.select({
          total: count(sensoryMoments.id),
        }).from(sensoryMoments).where(
          eq(sensoryMoments.accountId, accountId)
        );

        const [consumersResult] = await db.select({
          total: count(sql`DISTINCT ${sensoryMoments.consumerId}`),
        }).from(sensoryMoments).where(
          eq(sensoryMoments.accountId, accountId)
        );

        const [consignationResult] = await db.select({
          total_delivered: sum(consignationLogs.unitsDelivered),
          total_sold: sum(consignationLogs.unitsSold),
        }).from(consignationLogs).where(
          eq(consignationLogs.accountId, accountId)
        );

        return NextResponse.json(
          {
            success: true,
            metric_type: 'account_detail',
            account_id: accountId,
            account_name: accountResult[0].name,
            metrics: {
              sensoryMoments: momentsResult?.total || 0,
              unique_consumers: consumersResult?.total || 0,
              consignation: {
                units_delivered: parseInt(consignationResult?.total_delivered || '0'),
                units_sold: parseInt(consignationResult?.total_sold || '0'),
                units_pending: (parseInt(consignationResult?.total_delivered || '0') - parseInt(consignationResult?.total_sold || '0')),
              },
            },
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Sin account_id: listar metricas de todas las cuentas
      const accountsWithMetrics = await db.select({
        id: accounts.id,
        name: accounts.name,
        zone: accounts.zone,
        pipeline_stage: accounts.pipelineStage,
        moments_count: count(sensoryMoments.id),
        consumers_count: count(sql`DISTINCT ${sensoryMoments.consumerId}`),
      })
      .from(accounts)
      .leftJoin(sensoryMoments, eq(accounts.id, sensoryMoments.accountId))
      .groupBy(accounts.id, accounts.name, accounts.zone, accounts.pipelineStage)
      .orderBy(desc(count(sensoryMoments.id)))
      .limit(50);

      return NextResponse.json(
        {
          success: true,
          metric_type: 'accounts_list',
          count: accountsWithMetrics.length,
          data: accountsWithMetrics.map(a => ({
            account_id: a.id,
            name: a.name,
            zone: a.zone,
            pipeline_stage: a.pipeline_stage,
            sensoryMoments: a.moments_count,
            unique_consumers: a.consumers_count,
          })),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // =============================================================================
    // TIPO 3: Metricas por linea de producto
    // =============================================================================
    if (metricType === 'products') {
      console.log('Calculando metricas por linea de producto...');
      
      const productMetrics = await db.select({
        product_line: sensoryMoments.productLine,
        total_moments: count(sensoryMoments.id),
        unique_consumers: count(sql`DISTINCT ${sensoryMoments.consumerId}`),
        unique_accounts: count(sql`DISTINCT ${sensoryMoments.accountId}`),
      })
      .from(sensoryMoments)
      .groupBy(sensoryMoments.productLine)
      .orderBy(desc(count(sensoryMoments.id)));

      // Total general para calcular porcentajes
      const totalMoments = productMetrics.reduce((sum, p) => sum + p.total_moments, 0);

      return NextResponse.json(
        {
          success: true,
          metric_type: 'products',
          total_moments: totalMoments,
          data: productMetrics.map(p => ({
            product_line: p.product_line,
            total_moments: p.total_moments,
            percentage: totalMoments > 0 ? ((p.total_moments / totalMoments) * 100).toFixed(2) : '0.00',
            unique_consumers: p.unique_consumers,
            unique_accounts: p.unique_accounts,
          })),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // =============================================================================
    // TIPO 4: Comensales unicos por cuenta
    // =============================================================================
    if (metricType === 'consumers') {
      console.log('Calculando comensales unicos por cuenta...');
      
      const validationResult = accountIdSchema.safeParse({ account_id: accountId || undefined });
      
      if (accountId && !validationResult.success) {
        return errorResponse('account_id invalido', 400);
      }

      // Si hay account_id, listar comensales de esa cuenta
      if (accountId) {
        const consumers = await db.select({
          id: b2cConsumers.id,
          whatsapp: b2cConsumers.whatsappPhone,
          full_name: b2cConsumers.fullName,
          email: b2cConsumers.email,
          is_vip: b2cConsumers.isVipWhatsapp,
          flavor_preference: b2cConsumers.flavorPreference,
          moments_count: count(sensoryMoments.id),
          last_scan: sql`MAX(${sensoryMoments.scannedAt})`,
        })
        .from(b2cConsumers)
        .leftJoin(sensoryMoments, eq(b2cConsumers.id, sensoryMoments.consumerId))
        .where(
          sql`EXISTS (
            SELECT 1 FROM ${sensoryMoments} 
            WHERE ${sensoryMoments.consumerId} = ${b2cConsumers.id}
            AND ${sensoryMoments.accountId} = ${accountId}
          )`
        )
        .groupBy(
          b2cConsumers.id,
          b2cConsumers.whatsappPhone,
          b2cConsumers.fullName,
          b2cConsumers.email,
          b2cConsumers.isVipWhatsapp,
          b2cConsumers.flavorPreference
        )
        .orderBy(desc(count(sensoryMoments.id)))
        .limit(100);

        return NextResponse.json(
          {
            success: true,
            metric_type: 'consumers_by_account',
            account_id: accountId,
            count: consumers.length,
            data: consumers.map(c => ({
              consumer_id: c.id,
              whatsapp: c.whatsapp,
              full_name: c.full_name,
              email: c.email,
              is_vip: c.is_vip,
              flavor_preference: c.flavor_preference,
              moments_count: c.moments_count,
              last_scan: c.last_scan,
            })),
            timestamp: new Date().toISOString(),
          },
          { status: 200 }
        );
      }

      // Sin account_id: total de comensales y top por momentos
      const [totalConsumersResult] = await db.select({
        total: count(b2cConsumers.id),
      }).from(b2cConsumers);

      const topConsumers = await db.select({
        id: b2cConsumers.id,
        whatsapp: b2cConsumers.whatsappPhone,
        full_name: b2cConsumers.fullName,
        moments_count: count(sensoryMoments.id),
      })
      .from(b2cConsumers)
      .leftJoin(sensoryMoments, eq(b2cConsumers.id, sensoryMoments.consumerId))
      .groupBy(b2cConsumers.id, b2cConsumers.whatsappPhone, b2cConsumers.fullName)
      .orderBy(desc(count(sensoryMoments.id)))
      .limit(10);

      return NextResponse.json(
        {
          success: true,
          metric_type: 'consumers_general',
          total_consumers: totalConsumersResult?.total || 0,
          top_consumers: topConsumers.map(c => ({
            consumer_id: c.id,
            whatsapp: c.whatsapp,
            full_name: c.full_name,
            moments_count: c.moments_count,
          })),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // =============================================================================
    // TIPO NO RECONOCIDO
    // =============================================================================
    return errorResponse(`Tipo de metrica no reconocido: ${metricType}. Tipos validos: general, accounts, products, consumers`, 400);

    });

  } catch (error) {
    console.error('Error en GET /api/metrics:', error);
    
    return errorResponse(
      error instanceof Error ? error.message : 'Error desconocido en el servidor',
      500
    );
  }
}