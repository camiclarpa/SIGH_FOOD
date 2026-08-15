import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { embeddingEngine } from '@/lib/ai/architectures/embedding-engine';

export const POST = conTrazas('/api/ai/architectures/embedding', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'index') {
      const result = await embeddingEngine.indexEntity(data.entityType, data.entityId, data.text);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'findSimilar') {
      const results = await embeddingEngine.findSimilarEntities(data.entityType, data.queryText, data.limit);
      return NextResponse.json({ success: true, results });
    }

    if (action === 'findSimilarAccounts') {
      const results = await embeddingEngine.findSimilarAccounts(data.accountId, data.limit);
      return NextResponse.json({ success: true, results });
    }

    if (action === 'findSimilarConsumers') {
      const results = await embeddingEngine.findSimilarConsumers(data.consumerId, data.limit);
      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en EmbeddingEngine', error, { ruta: '/api/ai/architectures/embedding' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en EmbeddingEngine',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});