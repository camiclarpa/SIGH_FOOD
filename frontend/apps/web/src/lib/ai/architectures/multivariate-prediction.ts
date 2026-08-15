// =============================================================================
// A8: PREDICCION MULTIVARIADA - CRM Predictivo
// =============================================================================

import { multivariatePredictions } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos, dec, num, type Horizonte } from './_soporte';

export class MultivariatePredictionService {
  async predictChurnRisk(accountId: string, horizon: Horizonte = '30_days') {
    return conBaseDeDatos(async (db) => {
      const [prediction] = await db.insert(multivariatePredictions)
        .values({
          predictionType: 'churn_risk',
          targetEntityId: accountId,
          targetDomain: 'b2b_accounts',
          horizon,
          predictedValue: dec(0.25),
          confidence: dec(0.78),
          factors: {
            daysSinceLastOrder: 45,
            sellThroughDecline: 0.15,
            engagementDrop: 0.20,
          },
          riskScore: dec(0.72),
        })
        .returning();

      return prediction;
    });
  }

  async predictRevenue(accountId: string, horizon: Horizonte = '90_days') {
    return conBaseDeDatos(async (db) => {
      const [prediction] = await db.insert(multivariatePredictions)
        .values({
          predictionType: 'revenue_forecast',
          targetEntityId: accountId,
          targetDomain: 'b2b_accounts',
          horizon,
          predictedValue: dec(15000.00),
          confidence: dec(0.82),
          factors: {
            historicalAverage: 12000,
            growthTrend: 0.08,
            seasonalityFactor: 1.15,
          },
          riskScore: dec(0.35),
        })
        .returning();

      return prediction;
    });
  }

  async predictConsumerLtv(consumerId: string, horizon: Horizonte = 'yearly') {
    return conBaseDeDatos(async (db) => {
      const [prediction] = await db.insert(multivariatePredictions)
        .values({
          predictionType: 'consumer_ltv',
          targetEntityId: consumerId,
          targetDomain: 'b2c_consumers',
          horizon,
          predictedValue: dec(850.00),
          confidence: dec(0.75),
          factors: {
            purchaseFrequency: 4,
            averageTicket: 45,
            retentionProbability: 0.68,
          },
          riskScore: dec(0.40),
        })
        .returning();

      return prediction;
    });
  }

  async verifyPrediction(predictionId: string, actualValue: number) {
    return conBaseDeDatos(async (db) => {
      const [prediction] = await db.select()
        .from(multivariatePredictions)
        .where(eq(multivariatePredictions.id, predictionId))
        .limit(1);

      if (!prediction) return null;

      const previsto = num(prediction.predictedValue);
      // Sin este guardo, una predicción de 0 daba accuracy = -Infinity o NaN y
      // se guardaba tal cual en la columna.
      const accuracy = previsto === 0
        ? (actualValue === 0 ? 1 : 0)
        : 1 - Math.abs(previsto - actualValue) / Math.abs(previsto);

      await db.update(multivariatePredictions)
        .set({
          actualValue: dec(actualValue),
          accuracy: dec(Math.max(0, accuracy)),
          verifiedAt: new Date(),
        })
        .where(eq(multivariatePredictions.id, predictionId));

      return { predictionId, predictedValue: previsto, actualValue, accuracy: Math.max(0, accuracy) };
    });
  }
}

export const multivariatePredictionService = new MultivariatePredictionService();
