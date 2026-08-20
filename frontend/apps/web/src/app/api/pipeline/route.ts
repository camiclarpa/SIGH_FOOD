// =============================================================================
// SIGH_FOOD - Resumen del pipeline B2B
// Endpoint: GET /api/pipeline
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { accounts } from '@sighfood/domain/db/schema';
import { count, eq, sql } from 'drizzle-orm';

/** Orden real del embudo. El GROUP BY no lo garantiza, así que se fija aquí. */
export const ETAPAS = [
  'lead_landing',
  'lemon_test_pending',
  'lemon_test_passed',
  'consignation_active',
  'recurring_client',
  'saas_converted',
  'churned',
] as const;

export const GET = conTrazas('/api/pipeline', async (_request: NextRequest) => {
  try {
    return await conBaseDeDatos(async (db) => {
      // Un solo GROUP BY para el recuento de las 7 etapas. Contar etapa por
      // etapa serían 7 viajes a la base para responder lo mismo.
      const [conteos, porRiesgo, muestras] = await Promise.all([
        db
          .select({ etapa: accounts.pipelineStage, total: count(accounts.id) })
          .from(accounts)
          .groupBy(accounts.pipelineStage),

        db
          .select({ riesgo: accounts.churnRisk, total: count(accounts.id) })
          .from(accounts)
          .groupBy(accounts.churnRisk),

        // Hasta 8 cuentas por etapa para pintar las tarjetas del tablero, sin
        // traerse las 1000: se numeran dentro de cada partición y se corta.
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
      const tarjetas = muestras.filter((m) => Number(m.fila) <= 8);

      return NextResponse.json({
        success: true,
        data: {
          etapas: ETAPAS.map((etapa) => ({
            etapa,
            total: porEtapa.get(etapa) ?? 0,
            cuentas: tarjetas
              .filter((t) => t.etapa === etapa)
              .map(({ fila: _fila, ...resto }) => resto),
          })),
          riesgo: porRiesgo,
          total: conteos.reduce((suma, c) => suma + c.total, 0),
        },
      });
    });
  } catch (error) {
    log.error('Error obteniendo el pipeline', error, { ruta: '/api/pipeline' });
    return NextResponse.json(
      { success: false, error: 'Error al obtener el pipeline' },
      { status: 500 }
    );
  }
});

/**
 * Mueve una cuenta de etapa.
 *
 * Es la única escritura que la vista de pipeline necesita, y va aquí en vez de
 * en /api/accounts/[id] para no abrir un PATCH genérico sobre la cuenta entera.
 */
export const PATCH = conTrazas('/api/pipeline', async (request: NextRequest) => {
  try {
    const { accountId, etapa } = await request.json();

    if (!accountId || !ETAPAS.includes(etapa)) {
      return NextResponse.json(
        { success: false, error: 'Se requieren accountId y una etapa válida' },
        { status: 400 }
      );
    }

    return await conBaseDeDatos(async (db) => {
      const [fila] = await db
        .update(accounts)
        .set({
          pipelineStage: etapa,
          updatedAt: new Date(),
          lastActivity: new Date(),
          // Marcar la baja aquí evita que quede una cuenta en 'churned' sin
          // fecha, que es lo que rompe cualquier informe de bajas por periodo.
          ...(etapa === 'churned' ? { churnedAt: new Date() } : {}),
        })
        .where(eq(accounts.id, accountId))
        .returning({ id: accounts.id, nombre: accounts.name, etapa: accounts.pipelineStage });

      if (!fila) {
        return NextResponse.json(
          { success: false, error: 'Cuenta no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: fila });
    });
  } catch (error) {
    log.error('Error moviendo la cuenta de etapa', error, { ruta: '/api/pipeline' });
    return NextResponse.json(
      { success: false, error: 'Error al mover la cuenta' },
      { status: 500 }
    );
  }
});
