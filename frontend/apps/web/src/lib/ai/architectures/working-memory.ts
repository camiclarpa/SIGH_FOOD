// =============================================================================
// A4: WORKINGMEMORY - Contexto Activo entre Modulos CRM
// =============================================================================

import { workingMemoryCycles } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import { conBaseDeDatos } from './_soporte';

/** Hallazgos por módulo: nombre de módulo -> lista de hallazgos. */
type HallazgosPorModulo = Record<string, unknown[]>;

export class WorkingMemoryService {
  async startCycle(agentName: string, cycleType: string) {
    return conBaseDeDatos(async (db) => {
      const [cycle] = await db.insert(workingMemoryCycles)
        .values({
          agentName,
          cycleType,
          status: 'active',
          contextData: {},
          moduleFindings: {},
          crossModuleLinks: [],
          riskByModule: {},
        })
        .returning();

      return cycle;
    });
  }

  async addFinding(cycleId: string, module: string, finding: unknown) {
    return conBaseDeDatos(async (db) => {
      const [cycle] = await db.select()
        .from(workingMemoryCycles)
        .where(eq(workingMemoryCycles.id, cycleId))
        .limit(1);

      if (!cycle) return null;

      // La columna es jsonb sin $type<>, así que Drizzle la infiere como
      // `unknown`; sin este anclaje, indexarla por `module` no compila.
      const moduleFindings = (cycle.moduleFindings ?? {}) as HallazgosPorModulo;
      moduleFindings[module] = [...(moduleFindings[module] ?? []), finding];

      await db.update(workingMemoryCycles)
        .set({ moduleFindings })
        .where(eq(workingMemoryCycles.id, cycleId));

      return moduleFindings;
    });
  }

  async completeCycle(cycleId: string) {
    return conBaseDeDatos(async (db) => {
      await db.update(workingMemoryCycles)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(workingMemoryCycles.id, cycleId));
    });
  }

  async getActiveCycles(agentName?: string) {
    return conBaseDeDatos(async (db) => {
      if (agentName) {
        return db.select()
          .from(workingMemoryCycles)
          .where(eq(workingMemoryCycles.agentName, agentName));
      }
      return db.select().from(workingMemoryCycles);
    });
  }
}

export const workingMemoryService = new WorkingMemoryService();
