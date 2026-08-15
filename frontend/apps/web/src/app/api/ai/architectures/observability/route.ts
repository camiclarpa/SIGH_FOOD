import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { observabilityService } from '@/lib/ai/architectures/observability';

export const POST = conTrazas('/api/ai/architectures/observability', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'recordMetric') {
      const result = await observabilityService.recordMetric(data);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'updateHealth') {
      const result = await observabilityService.updateHealth(data);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'intelligenceScore') {
      const score = await observabilityService.getIntelligenceScore(data.agentName);
      return NextResponse.json({ success: true, score });
    }

    if (action === 'weeklyReport') {
      const report = await observabilityService.generateWeeklyReport(data.agentName);
      return NextResponse.json({ success: true, report });
    }

    if (action === 'health') {
      const health = await observabilityService.checkHealth();
      return NextResponse.json({ success: true, health });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en Observability', error, { ruta: '/api/ai/architectures/observability' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en Observability',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});