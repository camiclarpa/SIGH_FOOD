import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { chainOfThoughtService } from '@/lib/ai/architectures/chain-of-thought';

export const POST = conTrazas('/api/ai/architectures/reasoning', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const result = await chainOfThoughtService.execute(body);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    log.error('Error en ChainOfThought', error, { ruta: '/api/ai/architectures/reasoning' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en ChainOfThought',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});