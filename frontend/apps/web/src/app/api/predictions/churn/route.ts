import { NextRequest, NextResponse } from 'next/server';
import { predictChurn } from '@/lib/ai/services/groq-service';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { accounts } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';

export const POST = conTrazas('/api/predictions/churn', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'accountId es requerido' },
        { status: 400 }
      );
    }

    return await conBaseDeDatos(async (db) => {
      const account = await db.select()
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (!account[0]) {
        return NextResponse.json(
          { success: false, error: 'Cliente no encontrado' },
          { status: 404 }
        );
      }

      const clientData = account[0];

      const prediction = await predictChurn({
        name: clientData.name,
        pipelineStage: clientData.pipelineStage || 'unknown',
        avgConsumptionDays: clientData.avgConsumptionDays ?? 30,
        lastActivity: clientData.lastActivity?.toISOString() || 'N/A',
        currentStock: clientData.currentConsignationStock ?? 0,
        engagementScore: clientData.engagementScore ?? 0,
      });

      await db.update(accounts)
        .set({
          churnRisk: prediction.churnRisk,
          // `churn_score` es NUMERIC(5,2): Drizzle lo espera como string.
          churnScore: prediction.churnScore.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId));

      return NextResponse.json({ success: true, data: prediction });
    });

  } catch (error) {
    log.error('Error en predicción de churn', error, { ruta: '/api/predictions/churn' });
    return NextResponse.json(
      { success: false, error: 'Error en predicción' },
      { status: 500 }
    );
  }
});
