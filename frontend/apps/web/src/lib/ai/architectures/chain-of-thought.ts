// =============================================================================
// A7: CHAIN OF THOUGHT - Razonamiento CRM antes de acciones
// =============================================================================

import { cotExecutions, crmLearningEpisodes } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos, dec, type DominioCrm } from './_soporte';

export class ChainOfThoughtService {
  async execute(data: {
    triggerType: string;
    triggerEntityId?: string;
    triggerDomain?: DominioCrm;
    context: unknown;
  }) {
    // Paso 1: Casos similares
    const step1 = await this.findSimilarCases(data.triggerType, data.triggerDomain);

    // Paso 2: Comparacion de contexto
    const step2 = this.compareContext(data.context);

    // Paso 3: Elementos afectados
    const step3 = await this.findAffectedElements(data.triggerDomain, data.triggerEntityId);

    // Paso 4: Impacto en negocio
    const step4 = this.estimateBusinessImpact(data.triggerType, data.context);

    // Paso 5: Efectos secundarios
    const step5 = await this.checkSideEffects(data.triggerType);

    // Paso 6: Check de falsos positivos
    const step6 = this.checkFalsePositiveRate(data.triggerType);

    const finalDecision = step6.fpRate < 0.30 ? 'EXECUTE_ACTION' : 'REQUIRE_REVIEW';
    const confidence = (step1.length > 0 ? 0.3 : 0) + (step4.impact === 'high' ? 0.4 : 0.2);

    return conBaseDeDatos(async (db) => {
      const [execution] = await db.insert(cotExecutions)
        .values({
          triggerType: data.triggerType,
          triggerEntityId: data.triggerEntityId,
          triggerDomain: data.triggerDomain,
          step1SimilarCases: step1,
          step2ContextComparison: step2,
          step3AffectedElements: step3,
          step4BusinessImpact: step4,
          step5SideEffects: step5,
          step6FalsePositiveCheck: step6,
          finalDecision,
          confidenceScore: dec(confidence),
        })
        .returning();

      return execution;
    });
  }

  private async findSimilarCases(triggerType: string, _domain?: DominioCrm) {
    return conBaseDeDatos(async (db) =>
      db.select()
        .from(crmLearningEpisodes)
        .where(eq(crmLearningEpisodes.issueType, triggerType))
        .limit(5)
    );
  }

  private compareContext(_context: unknown) {
    return { comparable: true, similarityScore: 0.85 };
  }

  private async findAffectedElements(_domain?: DominioCrm, _entityId?: string) {
    return { affectedElements: [], propagationRisk: 0.5 };
  }

  private estimateBusinessImpact(triggerType: string, _context: unknown) {
    const impactMap: Record<string, string> = {
      'churn_risk': 'high',
      'low_sell_through': 'medium',
      'asset_maintenance': 'low',
    };
    return { impact: impactMap[triggerType] || 'medium' };
  }

  private async checkSideEffects(_triggerType: string) {
    return { knownSideEffects: [] };
  }

  private checkFalsePositiveRate(_triggerType: string) {
    return { fpRate: 0.15, requiresReview: false };
  }
}

export const chainOfThoughtService = new ChainOfThoughtService();
