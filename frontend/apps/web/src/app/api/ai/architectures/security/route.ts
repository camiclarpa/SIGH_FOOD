import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { agentSecurityService } from '@/lib/ai/architectures/agent-security';

export const POST = conTrazas('/api/ai/architectures/security', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'logEvent') {
      const evento = await agentSecurityService.logSecurityEvent(data);
      return NextResponse.json({ success: true, evento });
    }

    if (action === 'detectInjection') {
      const detectado = await agentSecurityService.detectPromptInjection(data.input);
      return NextResponse.json({ success: true, promptInjectionDetected: detectado });
    }

    if (action === 'validatePrivilege') {
      const permitido = await agentSecurityService.validateMinimalPrivilege(data.agentName, data.action);
      return NextResponse.json({ success: true, allowed: permitido });
    }

    if (action === 'recentEvents') {
      const eventos = await agentSecurityService.getRecentSecurityEvents(data?.limit);
      return NextResponse.json({ success: true, eventos });
    }

    return NextResponse.json({ success: false, error: 'Action not recognized' }, { status: 400 });
  } catch (error) {
    log.error('Error en AgentSecurity', error, { ruta: '/api/ai/architectures/security' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en AgentSecurity',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
