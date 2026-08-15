import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { threeLayerMemory } from '@/lib/ai/architectures/three-layer-memory';

export const POST = conTrazas('/api/ai/architectures/memory', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    // Capa 1: episodica
    if (action === 'addEpisode') {
      const episode = await threeLayerMemory.addEpisode(data);
      return NextResponse.json({ success: true, episode });
    }

    // Capa 2: semantica
    if (action === 'getPatterns') {
      const patterns = await threeLayerMemory.getPatterns(data.domain, data.consolidation);
      return NextResponse.json({ success: true, patterns });
    }

    // Capa 3: procedimental
    if (action === 'getProcedures') {
      const procedures = await threeLayerMemory.getProcedures(data.domain, data.issueType);
      return NextResponse.json({ success: true, procedures });
    }

    if (action === 'validateProcedure') {
      const result = await threeLayerMemory.validateProcedure(data.procedureId, data.success);
      if (!result) {
        return NextResponse.json({ success: false, error: 'Procedimiento no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en ThreeLayerMemory', error, { ruta: '/api/ai/architectures/memory' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en ThreeLayerMemory',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
