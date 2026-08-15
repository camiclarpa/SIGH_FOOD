import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { multivariatePredictionService } from '@/lib/ai/architectures/multivariate-prediction';

export const POST = conTrazas('/api/ai/architectures/prediction', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'predictChurn') {
      const result = await multivariatePredictionService.predictChurnRisk(data.accountId, data.horizon);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'predictRevenue') {
      const result = await multivariatePredictionService.predictRevenue(data.accountId, data.horizon);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'predictLtv') {
      const result = await multivariatePredictionService.predictConsumerLtv(data.consumerId, data.horizon);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'verify') {
      await multivariatePredictionService.verifyPrediction(data.predictionId, data.actualValue);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en Prediction', error, { ruta: '/api/ai/architectures/prediction' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en Prediction',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});