// =============================================================================
// A9: KNOWLEDGE GRAPH - Grafo del Dominio CRM
// =============================================================================

import { kgCrmNodes, kgCrmEdges } from '@sighfood/domain/db/schema';
import { count, eq, sql } from 'drizzle-orm';
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

  /**
   * Recalcula la centralidad de todos los nodos.
   *
   * Antes recorría los nodos en JavaScript y por cada uno lanzaba un SELECT de
   * sus aristas y un UPDATE: con N nodos eran 2N+1 viajes a la base dentro de
   * una sola petición. Con un grafo de 1000 cuentas eso son más de 2000 idas y
   * vueltas, y el Worker agota su tiempo antes de terminar.
   *
   * Ahora es una única sentencia: el grado de cada nodo se cuenta en un
   * agregado y el UPDATE toma el valor de ahí. El coste deja de depender del
   * número de nodos en número de consultas.
   */
  async calculateCentrality() {
    return conBaseDeDatos(async (db) => {
      const [{ total }] = await db.select({ total: count(kgCrmNodes.id) }).from(kgCrmNodes);
      if (total === 0) return { nodes: 0 };

      await db.execute(sql`
        UPDATE kg_crm_nodes AS n
        SET centrality_score = ROUND(COALESCE(g.grado, 0)::numeric / ${total}, 2)
        FROM (
          SELECT n2.id, COUNT(e.id) AS grado
          FROM kg_crm_nodes n2
          LEFT JOIN kg_crm_edges e ON e.source_node_id = n2.id
          GROUP BY n2.id
        ) AS g
        WHERE g.id = n.id
      `);

      return { nodes: total };
    });
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
