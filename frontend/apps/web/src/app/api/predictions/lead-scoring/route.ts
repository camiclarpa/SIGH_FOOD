import { NextRequest, NextResponse } from 'next/server';
import { scoreLead } from '@/lib/ai/services/groq-service';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { accounts } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';

export const POST = conTrazas('/api/predictions/lead-scoring', async (request: NextRequest) => {
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

      const scoring = await scoreLead({
        name: clientData.name,
        zone: clientData.zone,
        decisionMakerRole: clientData.decisionMakerRole || 'Desconocido',
        pipelineStage: clientData.pipelineStage || 'lead_landing',
        estimatedSize: 'medium',
      });

      await db.update(accounts)
        .set({
          leadScore: scoring.leadScore,
          // `conversion_prob` es NUMERIC(5,2): Drizzle lo espera como string.
          conversionProb: scoring.conversionProb.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, accountId));

      return NextResponse.json({ success: true, data: scoring });
    });

  } catch (error) {
    log.error('Error en lead scoring', error, { ruta: '/api/predictions/lead-scoring' });
    return NextResponse.json(
      { success: false, error: 'Error en scoring' },
      { status: 500 }
    );
  }
});
