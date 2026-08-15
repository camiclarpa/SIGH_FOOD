// =============================================================================
// A3: LEARNINGENGINE - Motor Central de Aprendizaje CRM
// =============================================================================

import { crmLearningEpisodes, crmPatterns } from '@sighfood/domain/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { conBaseDeDatos, dec, num } from './_soporte';

/** Lo minimo que proposeSolution necesita de un episodio. */
export interface EpisodioSimilar {
  id: string;
  solutionDescription: string | null;
}

export class CrmLearningEngine {
  async ingestResolution(data: {
    module: string;
    issueType: string;
    problemDescription: string;
    solutionDescription?: string;
    resolutionTimeHours?: number;
    outcome?: 'SUCCESS' | 'PARTIAL' | 'FAILED';
    accountId?: string;
    consumerId?: string;
    humanNotes?: string;
  }) {
    const episode = await conBaseDeDatos(async (db) => {
      const [fila] = await db.insert(crmLearningEpisodes)
        .values({
          module: data.module,
          issueType: data.issueType,
          problemDescription: data.problemDescription,
          solutionDescription: data.solutionDescription,
          // `resolution_time_hours` es NUMERIC: Drizzle lo tipa como string.
          resolutionTimeHours: dec(data.resolutionTimeHours),
          outcome: data.outcome || 'SUCCESS',
          accountId: data.accountId,
          consumerId: data.consumerId,
          humanNotes: data.humanNotes,
        })
        .returning();
      return fila;
    });

    await this.checkPatternCreation(data.module, data.issueType);
    return episode;
  }

  async findSimilarCases(module: string, issueType: string, limit = 5) {
    return conBaseDeDatos(async (db) =>
      db.select()
        .from(crmLearningEpisodes)
        .where(and(
          eq(crmLearningEpisodes.module, module),
          eq(crmLearningEpisodes.issueType, issueType),
          // Antes: gte(resolutionTimeHours, 0) sobre una columna NUMERIC
          // comparada con un number. Lo que se quiere es "ya resuelto".
          isNotNull(crmLearningEpisodes.resolutionTimeHours)
        ))
        .limit(limit)
    );
  }

  async proposeSolution(_issue: unknown, cases: EpisodioSimilar[]) {
    if (cases.length === 0) return null;
    const topCase = cases[0];
    return {
      solution: topCase.solutionDescription,
      confidence: 0.85,
      sourceEpisodeId: topCase.id,
    };
  }

  private async checkPatternCreation(module: string, issueType: string) {
    return conBaseDeDatos(async (db) => {
      const similarEpisodes = await db.select()
        .from(crmLearningEpisodes)
        .where(and(
          eq(crmLearningEpisodes.module, module),
          eq(crmLearningEpisodes.issueType, issueType)
        ));

      if (similarEpisodes.length < 3) return;

      await db.insert(crmPatterns).values({
        patternName: `${module}:${issueType}`,
        domain: 'b2b_accounts',
        patternDescription: `Patron detectado en ${module} para ${issueType}`,
        issueType,
        episodeCount: similarEpisodes.length,
        confidenceScore: dec(0.75),
        consolidation: 'emerging',
      }).onConflictDoNothing();
    });
  }

  async applyForgettingCurve() {
    return conBaseDeDatos(async (db) => {
      const patterns = await db.select().from(crmPatterns);
      for (const pattern of patterns) {
        const newConfidence = num(pattern.confidenceScore) * (1 - num(pattern.decayRate));
        let newConsolidation = pattern.consolidation;
        if (newConfidence < 0.30) newConsolidation = 'deprecated';
        else if (newConfidence < 0.50) newConsolidation = 'active';

        await db.update(crmPatterns)
          .set({
            confidenceScore: dec(newConfidence),
            consolidation: newConsolidation,
            updatedAt: new Date(),
          })
          .where(eq(crmPatterns.id, pattern.id));
      }
    });
  }
}

export const crmLearningEngine = new CrmLearningEngine();
