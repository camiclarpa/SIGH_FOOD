// =============================================================================
// SIGH_FOOD - Estado del agente de IA
// Endpoint: GET /api/agent/status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  crmAgentHealth,
  crmAgentMetrics,
  crmLearningEpisodes,
  crmPatterns,
  multivariatePredictions,
  approvalRequests,
  agentSecurityLog,
  cotExecutions,
  kgCrmNodes,
  embeddingIndex,
} from '@sighfood/domain/db/schema';
import { count, desc, eq } from 'drizzle-orm';

export const GET = conTrazas('/api/agent/status', async (_request: NextRequest) => {
  try {
    return await conBaseDeDatos(async (db) => {
      const [
        salud,
        metricas,
        episodios,
        patrones,
        predicciones,
        aprobaciones,
        seguridad,
        razonamientos,
        nodos,
        embeddings,
      ] = await Promise.all([
        db
          .select({
            agente: crmAgentHealth.agentName,
            estado: crmAgentHealth.healthStatus,
            inteligencia: crmAgentHealth.intelligenceScore,
            deriva: crmAgentHealth.driftScore,
            falsosPositivos: crmAgentHealth.fpRate,
            aceptacion: crmAgentHealth.acceptanceRate,
            revisado: crmAgentHealth.checkedAt,
          })
          .from(crmAgentHealth)
          .orderBy(desc(crmAgentHealth.checkedAt))
          .limit(5),

        db
          .select({
            nombre: crmAgentMetrics.metricName,
            valor: crmAgentMetrics.metricValue,
            tipo: crmAgentMetrics.metricType,
            registrado: crmAgentMetrics.recordedAt,
          })
          .from(crmAgentMetrics)
          .orderBy(desc(crmAgentMetrics.recordedAt))
          .limit(10),

        db
          .select({ resultado: crmLearningEpisodes.outcome, total: count(crmLearningEpisodes.id) })
          .from(crmLearningEpisodes)
          .groupBy(crmLearningEpisodes.outcome),

        db
          .select({ consolidacion: crmPatterns.consolidation, total: count(crmPatterns.id) })
          .from(crmPatterns)
          .groupBy(crmPatterns.consolidation),

        db
          .select({ tipo: multivariatePredictions.predictionType, total: count(multivariatePredictions.id) })
          .from(multivariatePredictions)
          .groupBy(multivariatePredictions.predictionType),

        db
          .select({
            id: approvalRequests.id,
            accion: approvalRequests.actionType,
            estado: approvalRequests.status,
            solicitado: approvalRequests.createdAt,
            expira: approvalRequests.expiresAt,
          })
          .from(approvalRequests)
          .where(eq(approvalRequests.status, 'pending'))
          .orderBy(desc(approvalRequests.createdAt))
          .limit(10),

        db
          .select({ severidad: agentSecurityLog.severity, total: count(agentSecurityLog.id) })
          .from(agentSecurityLog)
          .groupBy(agentSecurityLog.severity),

        db
          .select({ decision: cotExecutions.finalDecision, total: count(cotExecutions.id) })
          .from(cotExecutions)
          .groupBy(cotExecutions.finalDecision),

        db.select({ total: count(kgCrmNodes.id) }).from(kgCrmNodes),
        db.select({ total: count(embeddingIndex.id) }).from(embeddingIndex),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          salud,
          metricas,
          aprendizaje: { episodios, patrones },
          predicciones,
          razonamientos,
          aprobacionesPendientes: aprobaciones,
          seguridad,
          grafo: { nodos: nodos[0]?.total ?? 0 },
          embeddings: { indexados: embeddings[0]?.total ?? 0 },
        },
      });
    });
  } catch (error) {
    log.error('Error obteniendo el estado del agente', error, { ruta: '/api/agent/status' });
    return NextResponse.json(
      { success: false, error: 'Error al obtener el estado del agente' },
      { status: 500 }
    );
  }
});
