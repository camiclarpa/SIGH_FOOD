// =============================================================================
// A5: MEMORIA DE TRES CAPAS - Episodica, Semantica, Procedimental
// =============================================================================

import { crmLearningEngine } from './crm-learning-engine';
import { crmPatterns, crmProcedures } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos, dec, num, type DominioCrm, type Consolidacion } from './_soporte';

export class ThreeLayerMemory {
  // Capa 1: Episodica - casos concretos
  async addEpisode(data: Parameters<typeof crmLearningEngine.ingestResolution>[0]) {
    return crmLearningEngine.ingestResolution(data);
  }

  // Capa 2: Semantica - patrones generalizados
  async getPatterns(domain: DominioCrm, consolidation?: Consolidacion) {
    return conBaseDeDatos(async (db) => {
      if (consolidation) {
        return db.select()
          .from(crmPatterns)
          .where(eq(crmPatterns.consolidation, consolidation));
      }
      return db.select()
        .from(crmPatterns)
        .where(eq(crmPatterns.domain, domain));
    });
  }

  // Capa 3: Procedimental - pasos validados
  async getProcedures(domain: DominioCrm, issueType?: string) {
    return conBaseDeDatos(async (db) => {
      if (issueType) {
        return db.select()
          .from(crmProcedures)
          .where(eq(crmProcedures.issueType, issueType));
      }
      return db.select()
        .from(crmProcedures)
        .where(eq(crmProcedures.domain, domain));
    });
  }

  async validateProcedure(procedureId: string, success: boolean) {
    return conBaseDeDatos(async (db) => {
      const [procedure] = await db.select()
        .from(crmProcedures)
        .where(eq(crmProcedures.id, procedureId))
        .limit(1);

      if (!procedure) return null;

      // `validation_count` es INTEGER anulable y `success_rate` NUMERIC, que
      // Drizzle entrega como string: sin convertir, `successRate * count`
      // concatena en lugar de multiplicar y la media sale disparatada.
      const validaciones = num(procedure.validationCount);
      const tasaActual = num(procedure.successRate);

      const newValidationCount = validaciones + 1;
      const aciertosPrevios = tasaActual * validaciones;
      const newSuccessRate = (aciertosPrevios + (success ? 1 : 0)) / newValidationCount;

      await db.update(crmProcedures)
        .set({
          validationCount: newValidationCount,
          successRate: dec(newSuccessRate),
          status: newSuccessRate >= 0.80 ? 'validated' : 'draft',
        })
        .where(eq(crmProcedures.id, procedureId));

      return { procedureId, validationCount: newValidationCount, successRate: newSuccessRate };
    });
  }
}

export const threeLayerMemory = new ThreeLayerMemory();
