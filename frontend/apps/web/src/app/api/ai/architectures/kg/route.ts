import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { knowledgeGraphService } from '@/lib/ai/architectures/knowledge-graph';

export const POST = conTrazas('/api/ai/architectures/kg', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'addNode') {
      const node = await knowledgeGraphService.addNode(data.nodeType, data.nodeId, data.nodeName, data.metadata);
      return NextResponse.json({ success: true, node });
    }

    if (action === 'addEdge') {
      const edge = await knowledgeGraphService.addEdge(
        data.sourceNodeId, data.targetNodeId, data.edgeType, data.couplingStrength
      );
      return NextResponse.json({ success: true, edge });
    }

    if (action === 'getRelated') {
      const related = await knowledgeGraphService.getRelatedEntities(data.nodeId, data.maxDepth);
      if (!related) {
        return NextResponse.json({ success: false, error: 'Nodo no encontrado' }, { status: 404 });
      }
      return NextResponse.json({ success: true, related });
    }

    if (action === 'calculateCentrality') {
      const result = await knowledgeGraphService.calculateCentrality();
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en KnowledgeGraph', error, { ruta: '/api/ai/architectures/kg' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en KnowledgeGraph',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
