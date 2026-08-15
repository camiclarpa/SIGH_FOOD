// =============================================================================
// A9: KNOWLEDGE GRAPH - Grafo del Dominio CRM
// =============================================================================

import { kgCrmNodes, kgCrmEdges } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos, dec, num, type DominioCrm, type TipoRelacionKg } from './_soporte';

export class KnowledgeGraphService {
  async addNode(nodeType: DominioCrm, nodeId: string, nodeName: string, metadata?: unknown) {
    return conBaseDeDatos(async (db) => {
      const [node] = await db.insert(kgCrmNodes)
        .values({
          nodeType,
          nodeId,
          nodeName,
          metadata,
        })
        .returning();

      return node;
    });
  }

  async addEdge(sourceNodeId: string, targetNodeId: string, edgeType: TipoRelacionKg, couplingStrength = 0.5) {
    return conBaseDeDatos(async (db) => {
      const [edge] = await db.insert(kgCrmEdges)
        .values({
          sourceNodeId,
          targetNodeId,
          edgeType,
          couplingStrength: dec(couplingStrength),
        })
        .returning();

      return edge;
    });
  }

  async getRelatedEntities(nodeId: string, _maxDepth = 2) {
    return conBaseDeDatos(async (db) => {
      const [node] = await db.select()
        .from(kgCrmNodes)
        .where(eq(kgCrmNodes.nodeId, nodeId))
        .limit(1);

      if (!node) return null;

      const edges = await db.select()
        .from(kgCrmEdges)
        .where(eq(kgCrmEdges.sourceNodeId, node.id));

      // Un nodo sin aristas daba 0/0 = NaN, que además se serializaba como
      // `null` en el JSON de respuesta sin que nadie lo notara.
      const propagatedRisk = edges.length === 0
        ? 0
        : edges.reduce((sum, e) => sum + num(e.couplingStrength), 0) / edges.length;

      return { node, relatedEdges: edges, propagatedRisk };
    });
  }

  async calculateCentrality() {
    return conBaseDeDatos(async (db) => {
      const nodes = await db.select().from(kgCrmNodes);
      if (nodes.length === 0) return { nodes: 0 };

      for (const node of nodes) {
        const edgeCount = await db.select()
          .from(kgCrmEdges)
          .where(eq(kgCrmEdges.sourceNodeId, node.id));

        const centrality = edgeCount.length / nodes.length;
        await db.update(kgCrmNodes)
          .set({ centralityScore: dec(centrality) })
          .where(eq(kgCrmNodes.id, node.id));
      }

      return { nodes: nodes.length };
    });
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
