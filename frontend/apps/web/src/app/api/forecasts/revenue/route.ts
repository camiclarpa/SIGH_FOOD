import { NextRequest, NextResponse } from 'next/server';
import { forecastRevenue } from '@/lib/ai/services/groq-service';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';

export const POST = conTrazas('/api/forecasts/revenue', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      last3MonthsRevenue,
      growthTrend,
      pipelineValue,
      avgCloseProb,
      seasonality
    } = body;

    // Antes: `if (!last3MonthsRevenue || !pipelineValue)`, que rechazaba un
    // pipeline de 0 —un dato perfectamente válido— como "datos insuficientes".
    if (last3MonthsRevenue === undefined || last3MonthsRevenue === null ||
        pipelineValue === undefined || pipelineValue === null) {
      return NextResponse.json(
        { success: false, error: 'Datos insuficientes' },
        { status: 400 }
      );
    }

    const forecast = await forecastRevenue({
      last3MonthsRevenue: String(last3MonthsRevenue),
      growthTrend: growthTrend || 'stable',
      pipelineValue: Number(pipelineValue),
      avgCloseProb: avgCloseProb ?? 0.5,
      seasonality: seasonality || 'normal',
    });

    return NextResponse.json({ success: true, data: forecast });

  } catch (error) {
    log.error('Error en proyección de ingresos', error, { ruta: '/api/forecasts/revenue' });
    return NextResponse.json(
      { success: false, error: 'Error en proyección' },
      { status: 500 }
    );
  }
});
