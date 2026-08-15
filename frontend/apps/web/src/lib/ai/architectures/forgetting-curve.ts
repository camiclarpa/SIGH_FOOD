// =============================================================================
// A6: FORGETTING CURVE - Depreciacion de Conocimiento CRM
// =============================================================================

import { crmPatterns, forgettingCurveLog } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos, dec, num } from './_soporte';

export class ForgettingCurveService {
  async applyWeeklyDecay() {
    return conBaseDeDatos(async (db) => {
      const patterns = await db.select().from(crmPatterns);
      const logs = [];

      for (const pattern of patterns) {
        const previousConfidence = num(pattern.confidenceScore);
        const daysSinceLastUse = 7; // simplificado
        const decayFactor = 1 - (num(pattern.decayRate) * (daysSinceLastUse / 7));
        const newConfidence = Math.max(0, previousConfidence * decayFactor);

        let newState = pattern.consolidation;
        if (newConfidence < 0.30) newState = 'deprecated';
        else if (newConfidence < 0.50) newState = 'active';

        await db.update(crmPatterns)
          .set({
            confidenceScore: dec(newConfidence),
            consolidation: newState,
            updatedAt: new Date(),
          })
          .where(eq(crmPatterns.id, pattern.id));

        const [log] = await db.insert(forgettingCurveLog)
          .values({
            patternId: pattern.id,
            previousConfidence: dec(previousConfidence),
            newConfidence: dec(newConfidence),
            previousState: pattern.consolidation,
            newState,
            daysSinceLastUse,
          })
          .returning();

        logs.push(log);
      }

      return logs;
    });
  }

  async getDeprecatedPatterns() {
    return conBaseDeDatos(async (db) =>
      db.select()
        .from(crmPatterns)
        .where(eq(crmPatterns.consolidation, 'deprecated'))
    );
  }

  async archivePattern(patternId: string) {
    return conBaseDeDatos(async (db) => {
      await db.update(crmPatterns)
        .set({ consolidation: 'archived' })
        .where(eq(crmPatterns.id, patternId));
    });
  }
}

export const forgettingCurveService = new ForgettingCurveService();
