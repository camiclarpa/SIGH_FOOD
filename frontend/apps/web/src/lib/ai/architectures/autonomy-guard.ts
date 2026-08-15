// =============================================================================
// A12: GOBIERNO Y AUTONOMIA - Matriz CRM
// =============================================================================

import { crmAutonomyMatrix, approvalRequests } from '@sighfood/domain/db/schema';
import { eq, and } from 'drizzle-orm';
import { conBaseDeDatos, type AccionAutonomia, type DominioCrm, type Entorno } from './_soporte';

export class AutonomyGuardService {
  async checkAuthorization(data: {
    actionType: AccionAutonomia;
    domain: DominioCrm;
    environment: Entorno;
  }) {
    return conBaseDeDatos(async (db) => {
      const [rule] = await db.select()
        .from(crmAutonomyMatrix)
        .where(and(
          eq(crmAutonomyMatrix.actionType, data.actionType),
          eq(crmAutonomyMatrix.domain, data.domain),
          eq(crmAutonomyMatrix.environment, data.environment)
        ));

      // Cerrado por defecto: sin regla explicita no se autoriza nada.
      if (!rule) {
        return { authorized: false, reason: 'No rule found', requiresApproval: true };
      }

      const isProhibited = rule.autonomyLevel === 'prohibited';
      const requiresApproval = rule.approvalRequired ?? true;

      return {
        authorized: !isProhibited && !requiresApproval,
        requiresApproval,
        autonomyLevel: rule.autonomyLevel,
        approvalTimeoutMinutes: rule.approvalTimeoutMinutes,
        requiredApprovalsCount: rule.requiredApprovalsCount,
      };
    });
  }

  async requestApproval(data: {
    actionType: AccionAutonomia;
    requestedBy: string;
    approvalData: unknown;
    timeoutMinutes?: number;
  }) {
    const expiresAt = new Date(Date.now() + (data.timeoutMinutes || 30) * 60000);

    return conBaseDeDatos(async (db) => {
      const [request] = await db.insert(approvalRequests)
        .values({
          actionType: data.actionType,
          requestedBy: data.requestedBy,
          approvalData: data.approvalData,
          expiresAt,
        })
        .returning();

      return request;
    });
  }

  async approveRequest(requestId: string, approvedBy: string) {
    return conBaseDeDatos(async (db) => {
      await db.update(approvalRequests)
        .set({
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
        })
        .where(eq(approvalRequests.id, requestId));
    });
  }

  async rejectRequest(requestId: string, reason: string) {
    return conBaseDeDatos(async (db) => {
      await db.update(approvalRequests)
        .set({
          status: 'rejected',
          rejectedReason: reason,
        })
        .where(eq(approvalRequests.id, requestId));
    });
  }
}

export const autonomyGuardService = new AutonomyGuardService();
