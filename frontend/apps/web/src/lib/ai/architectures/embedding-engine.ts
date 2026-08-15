// =============================================================================
// A2: MOTOR DE EMBEDDINGS - Busqueda Semantica CRM
// =============================================================================

import { embeddingIndex } from '@sighfood/domain/db/schema';
import { sql } from 'drizzle-orm';
import { conBaseDeDatos, type DominioCrm } from './_soporte';

export class EmbeddingEngine {
  async generateEmbedding(_text: string): Promise<number[]> {
    // En produccion: llamar a OpenAI/DeepSeek para generar embedding de 1536 dims
    // Aqui retornamos un vector dummy para desarrollo
    return new Array(1536).fill(0).map(() => Math.random());
  }

  async indexEntity(entityType: DominioCrm, entityId: string, text: string) {
    const embedding = await this.generateEmbedding(text);

    return conBaseDeDatos(async (db) => {
      const [result] = await db.insert(embeddingIndex)
        .values({
          entityType,
          entityId,
          embedding,
          textSource: text,
        })
        .returning();

      return result;
    });
  }

  async findSimilarEntities(entityType: DominioCrm, queryText: string, limit = 5) {
    const queryEmbedding = await this.generateEmbedding(queryText);
    // pgvector espera el literal '[a,b,c]', no un array de postgres.js.
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    return conBaseDeDatos(async (db) => {
      return db.execute(sql`
        SELECT *,
          1 - (embedding <=> ${vectorLiteral}::vector) as similarity
        FROM embedding_index
        WHERE entity_type = ${entityType}
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${limit}
      `);
    });
  }

  async findSimilarAccounts(accountId: string, limit = 5) {
    return this.findSimilarEntities('b2b_accounts', accountId, limit);
  }

  async findSimilarConsumers(consumerId: string, limit = 5) {
    return this.findSimilarEntities('b2c_consumers', consumerId, limit);
  }
}

export const embeddingEngine = new EmbeddingEngine();
