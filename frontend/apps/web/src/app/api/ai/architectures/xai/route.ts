import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { xaiService } from '@/lib/ai/architectures/xai-service';

export const POST = conTrazas('/api/ai/architectures/xai', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'explain') {
      const explanation = await xaiService.explainDecision(data);
      return NextResponse.json({ success: true, explanation });
    }

    if (action === 'explainChurn') {
      const explanation = await xaiService.explainChurnDecision(data.accountId, data.riskScore);
      return NextResponse.json({ success: true, explanation });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en XAI', error, { ruta: '/api/ai/architectures/xai' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en XAI',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
