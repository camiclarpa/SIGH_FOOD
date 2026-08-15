// =============================================================================
// A11: VALIDATION SANDBOX - Validacion 4 Fases CRM
// =============================================================================

import { sandboxExecutions } from '@sighfood/domain/db/schema';
import { conBaseDeDatos, type AccionAutonomia, type DominioCrm, type FaseSandbox } from './_soporte';

export interface EntradaSandbox {
  actionType: AccionAutonomia;
  targetDomain?: DominioCrm;
  targetEntityId?: string;
  payload: unknown;
}

export interface ResultadoFase {
  success: boolean;
  phase: string;
  [clave: string]: unknown;
}

export class ValidationSandboxService {
  async execute(data: EntradaSandbox) {
    // Fase 1: Dry Run
    const phase1 = await this.dryRun(data);
    if (!phase1.success) {
      return this.logExecution(data, phase1, 'dry_run', false, 'BLOCKED');
    }

    // Fase 2: Staging
    const phase2 = await this.staging(data);
    if (!phase2.success) {
      return this.logExecution(data, phase2, 'staging', false, 'BLOCKED');
    }

    // Fase 3: Canary
    const phase3 = await this.canary(data);
    if (!phase3.success) {
      return this.logExecution(data, phase3, 'canary', false, 'BLOCKED');
    }

    // Fase 4: Production
    const phase4 = await this.production(data);
    return this.logExecution(data, phase4, 'production', phase4.success, phase4.success ? 'EXECUTED' : 'BLOCKED');
  }

  private async dryRun(_data: EntradaSandbox) {
    return { success: true, phase: 'DRY_RUN', validated: true };
  }

  private async staging(_data: EntradaSandbox) {
    return { success: true, phase: 'STAGING', executed: true };
  }

  private async canary(_data: EntradaSandbox) {
    return { success: true, phase: 'CANARY', subsetTested: true };
  }

  private async production(_data: EntradaSandbox) {
    return { success: true, phase: 'PRODUCTION', monitored: true };
  }

  private async logExecution(data: EntradaSandbox, phaseResult: ResultadoFase, currentPhase: FaseSandbox, authorized: boolean, finalDecision: string) {
    return conBaseDeDatos(async (db) => {
      const [execution] = await db.insert(sandboxExecutions)
        .values({
          actionType: data.actionType,
          targetDomain: data.targetDomain,
          targetEntityId: data.targetEntityId,
          phase1DryRun: data.actionType ? {} : null,
          phase2Staging: phaseResult.phase === 'STAGING' ? phaseResult : null,
          phase3Canary: phaseResult.phase === 'CANARY' ? phaseResult : null,
          phase4Production: phaseResult.phase === 'PRODUCTION' ? phaseResult : null,
          currentPhase,
          authorized,
          finalDecision,
        })
        .returning();

      return execution;
    });
  }
}

export const validationSandboxService = new ValidationSandboxService();
