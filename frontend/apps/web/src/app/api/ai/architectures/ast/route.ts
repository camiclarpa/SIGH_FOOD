import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { astAnalysisService } from '@/lib/ai/architectures/ast-analysis';

export const POST = conTrazas('/api/ai/architectures/ast', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'analyzeAccount') {
      const result = await astAnalysisService.analyzeAccountStructure(data.accountId);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'analyzeConsumer') {
      const result = await astAnalysisService.analyzeConsumerBehavior(data.consumerId);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en AstAnalysis', error, { ruta: '/api/ai/architectures/ast' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en AstAnalysis',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
