import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { validationSandboxService } from '@/lib/ai/architectures/validation-sandbox';

export const POST = conTrazas('/api/ai/architectures/sandbox', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const result = await validationSandboxService.execute(body);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    log.error('Error en Sandbox', error, { ruta: '/api/ai/architectures/sandbox' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en Sandbox',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});