import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { workingMemoryService } from '@/lib/ai/architectures/working-memory';

export const POST = conTrazas('/api/ai/architectures/working-memory', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'startCycle') {
      const cycle = await workingMemoryService.startCycle(data.agentName, data.cycleType);
      return NextResponse.json({ success: true, cycle });
    }

    if (action === 'addFinding') {
      const findings = await workingMemoryService.addFinding(data.cycleId, data.module, data.finding);
      if (!findings) {
        return NextResponse.json({ success: false, error: 'Ciclo no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, findings });
    }

    if (action === 'completeCycle') {
      await workingMemoryService.completeCycle(data.cycleId);
      return NextResponse.json({ success: true });
    }

    if (action === 'getActiveCycles') {
      const cycles = await workingMemoryService.getActiveCycles(data?.agentName);
      return NextResponse.json({ success: true, cycles });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en WorkingMemory', error, { ruta: '/api/ai/architectures/working-memory' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en WorkingMemory',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
