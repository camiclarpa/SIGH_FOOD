// =============================================================================
// A2: MOTOR DE EMBEDDINGS - Busqueda Semantica CRM
// =============================================================================

import { embeddingIndex } from '@sighfood/domain/db/schema';
import { sql } from 'drizzle-orm';
import { conBaseDeDatos, type DominioCrm } from './_soporte';
import {
  comoLiteralVector,
  generarEmbedding,
  generarEmbeddings,
  type Embedding,
} from '@/lib/ai/services/embeddings-service';

export class EmbeddingEngine {
  /**
   * Antes devolvía `Math.random()`: 1536 números sin relación con el texto.
   * Ahora delega en un proveedor real y, si no hay ninguno, lanza en vez de
   * inventarse un vector (ver embeddings-service).
   */
  async generateEmbedding(texto: string): Promise<number[]> {
    const { vector } = await generarEmbedding(texto);
    return vector;
  }

  async indexEntity(entityType: DominioCrm, entityId: string, text: string) {
    const emb = await generarEmbedding(text);
    return this.guardar(entityType, [{ entityId, text, emb }]);
  }

  /**
   * Indexa muchas entidades con una sola llamada al proveedor y un solo INSERT.
   *
   * Es lo que hace viable indexar 1000 cuentas: una por una serían 1000
   * llamadas HTTP al proveedor y 1000 INSERT, cada uno con su ida y vuelta.
   */
  async indexEntities(
    entityType: DominioCrm,
    entidades: Array<{ entityId: string; text: string }>
  ) {
    if (entidades.length === 0) return [];

    const embeddings = await generarEmbeddings(entidades.map((e) => e.text));
    return this.guardar(
      entityType,
      entidades.map((e, i) => ({ entityId: e.entityId, text: e.text, emb: embeddings[i] }))
    );
  }

  private async guardar(
    entityType: DominioCrm,
    filas: Array<{ entityId: string; text: string; emb: Embedding }>
  ) {
    return conBaseDeDatos(async (db) =>
      db
        .insert(embeddingIndex)
        .values(
          filas.map((f) => ({
            entityType,
            entityId: f.entityId,
            embedding: f.emb.vector,
            // Se guarda el modelo real: al cambiar de proveedor hay que saber
            // qué filas quedaron con vectores de otro espacio vectorial, porque
            // mezclarlos hace que las distancias dejen de ser comparables.
            model: f.emb.modelo,
            textSource: f.text,
          }))
        )
        .returning()
    );
  }

  async findSimilarEntities(entityType: DominioCrm, queryText: string, limit = 5) {
    const { vector } = await generarEmbedding(queryText);
    const literal = comoLiteralVector(vector);

    return conBaseDeDatos(async (db) => {
      const filas = await db.execute(sql`
        SELECT
          id,
          entity_type,
          entity_id,
          text_source,
          model,
          1 - (embedding <=> ${literal}::vector) AS similarity
        FROM embedding_index
        WHERE entity_type = ${entityType}
          -- Sin este filtro la fila entra en el ORDER BY con distancia NULL y
          -- se cuela entre los resultados como si fuera muy parecida.
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${literal}::vector
        LIMIT ${limit}
      `);
      return filas;
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
