import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { autonomyGuardService } from '@/lib/ai/architectures/autonomy-guard';

export const POST = conTrazas('/api/ai/architectures/autonomy', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'check') {
      const result = await autonomyGuardService.checkAuthorization(data);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'requestApproval') {
      const result = await autonomyGuardService.requestApproval(data);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'approve') {
      await autonomyGuardService.approveRequest(data.requestId, data.approvedBy);
      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      await autonomyGuardService.rejectRequest(data.requestId, data.reason);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en Autonomy', error, { ruta: '/api/ai/architectures/autonomy' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en Autonomy',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});