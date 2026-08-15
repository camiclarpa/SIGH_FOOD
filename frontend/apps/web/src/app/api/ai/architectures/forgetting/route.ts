import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { forgettingCurveService } from '@/lib/ai/architectures/forgetting-curve';

export const POST = conTrazas('/api/ai/architectures/forgetting', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'applyWeeklyDecay') {
      const logs = await forgettingCurveService.applyWeeklyDecay();
      return NextResponse.json({ success: true, logs });
    }

    if (action === 'getDeprecated') {
      const patterns = await forgettingCurveService.getDeprecatedPatterns();
      return NextResponse.json({ success: true, patterns });
    }

    if (action === 'archive') {
      await forgettingCurveService.archivePattern(data.patternId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en ForgettingCurve', error, { ruta: '/api/ai/architectures/forgetting' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en ForgettingCurve',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
