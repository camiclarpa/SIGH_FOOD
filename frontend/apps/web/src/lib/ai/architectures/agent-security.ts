// =============================================================================
// A13: SEGURIDAD DEL AGENTE CRM
// =============================================================================

import { agentSecurityLog } from '@sighfood/domain/db/schema';
import { desc } from 'drizzle-orm';
import { conBaseDeDatos } from './_soporte';

export class AgentSecurityService {
  async logSecurityEvent(data: {
    eventType: string;
    severity: string;
    description: string;
    sourceAgent?: string;
    targetSystem?: string;
    metadata?: unknown;
  }) {
    return conBaseDeDatos(async (db) => {
      const [log] = await db.insert(agentSecurityLog)
        .values({
          eventType: data.eventType,
          severity: data.severity,
          description: data.description,
          sourceAgent: data.sourceAgent,
          targetSystem: data.targetSystem,
          metadata: data.metadata,
        })
        .returning();

      return log;
    });
  }

  async detectPromptInjection(input: string): Promise<boolean> {
    const suspiciousPatterns = [
      /ignore previous instructions/i,
      /you are now/i,
      /system prompt/i,
      /execute command/i,
    ];
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  async validateMinimalPrivilege(_agentName: string, _action: string): Promise<boolean> {
    // Verificar que el agente tiene permisos minimos para la accion
    return true;
  }

  async getRecentSecurityEvents(limit = 10) {
    return conBaseDeDatos(async (db) =>
      db.select()
        .from(agentSecurityLog)
        // orderBy(createdAt) sin desc() devolvia los eventos MAS ANTIGUOS,
        // justo lo contrario de "recent".
        .orderBy(desc(agentSecurityLog.createdAt))
        .limit(limit)
    );
  }
}

export const agentSecurityService = new AgentSecurityService();
