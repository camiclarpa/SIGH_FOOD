// =============================================================================
// A10: XAI - Explicabilidad de Decisiones CRM
// =============================================================================

import { xaiExplanations } from '@sighfood/domain/db/schema';
import { conBaseDeDatos, dec, type TipoEvidenciaXai } from './_soporte';

export class XaiService {
  async explainDecision(data: {
    decisionType: string;
    decisionId?: string;
    evidenceType: TipoEvidenciaXai;
    evidenceData: unknown;
    confidenceScore: number;
    businessImpactTranslation?: string;
    similarCasesUsed?: unknown[];
    knownSideEffects?: unknown[];
  }) {
    return conBaseDeDatos(async (db) => {
      const [explanation] = await db.insert(xaiExplanations)
        .values({
          decisionType: data.decisionType,
          decisionId: data.decisionId,
          evidenceType: data.evidenceType,
          evidenceData: data.evidenceData,
          confidenceScore: dec(data.confidenceScore),
          businessImpactTranslation: data.businessImpactTranslation,
          similarCasesUsed: data.similarCasesUsed,
          knownSideEffects: data.knownSideEffects,
        })
        .returning();

      return explanation;
    });
  }

  async explainChurnDecision(accountId: string, riskScore: number) {
    return this.explainDecision({
      decisionType: 'churn_prediction',
      decisionId: accountId,
      evidenceType: 'historical_pattern',
      evidenceData: {
        daysSinceLastOrder: 45,
        sellThroughDecline: 0.15,
      },
      confidenceScore: riskScore,
      businessImpactTranslation: `Riesgo de perder $15,000 en ingresos anuales si el bar cancela`,
      similarCasesUsed: [
        { caseId: 'ep_001', similarity: 0.92, outcome: 'retained_with_discount' },
      ],
      knownSideEffects: ['Descuento puede afectar margen en otros bares similares'],
    });
  }
}

export const xaiService = new XaiService();
