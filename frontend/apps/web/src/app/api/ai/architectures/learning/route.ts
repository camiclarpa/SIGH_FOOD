import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { crmLearningEngine } from '@/lib/ai/architectures/crm-learning-engine';

export const POST = conTrazas('/api/ai/architectures/learning', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'ingest') {
      const episode = await crmLearningEngine.ingestResolution(data);
      return NextResponse.json({ success: true, episode });
    }

    if (action === 'findSimilar') {
      const cases = await crmLearningEngine.findSimilarCases(data.module, data.issueType, data.limit);
      return NextResponse.json({ success: true, cases });
    }

    if (action === 'propose') {
      const proposal = await crmLearningEngine.proposeSolution(data.issue, data.cases);
      return NextResponse.json({ success: true, proposal });
    }

    if (action === 'applyForgetting') {
      await crmLearningEngine.applyForgettingCurve();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en LearningEngine', error, { ruta: '/api/ai/architectures/learning' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en LearningEngine',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});