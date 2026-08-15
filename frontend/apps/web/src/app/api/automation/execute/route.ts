import { NextRequest, NextResponse } from 'next/server';
import { parseAIJsonResponse } from '@/lib/ai/services/ai-router';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log as traza, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { automationSequences, automationLogs, b2cConsumers, accounts } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';
import type { AIProvider } from '@/lib/ai/services/ai-router';

const AUTOMATION_SYSTEM_PROMPT = `Eres el motor de automatización de marketing de SIGH_FOOD.
Analiza el trigger y el contexto del usuario, y genera el mensaje personalizado
que debe enviarse por el canal indicado (email, whatsapp, sms o push).
Responde SOLO en JSON con esta estructura:
{
  "message": "mensaje personalizado",
  "subject": "asunto (si aplica)",
  "personalization": { "variable1": "valor1" },
  "confidence": 0.95
}`;

/** Lo que se le pide al modelo. Que lo cumpla es otra cosa: se valida abajo. */
interface MensajeGenerado {
  message?: unknown;
  subject?: unknown;
  personalization?: unknown;
  confidence?: unknown;
}

export const POST = conTrazas('/api/automation/execute', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      sequenceId,
      consumerId,
      accountId,
      triggerContext,
      provider = 'groq',
    } = body;

    if (!sequenceId) {
      return NextResponse.json(
        { success: false, error: 'sequenceId es requerido' },
        { status: 400 }
      );
    }

    return await conBaseDeDatos(async (db) => {
      // 1. Obtener la secuencia de automatización
      const sequence = await db.select()
        .from(automationSequences)
        .where(eq(automationSequences.id, sequenceId))
        .limit(1);

      if (!sequence[0]) {
        return NextResponse.json(
          { success: false, error: 'Secuencia no encontrada' },
          { status: 404 }
        );
      }

      const seq = sequence[0];

      // 2. Obtener contexto del consumidor/cuenta
      let consumerData: unknown = null;
      let accountData: unknown = null;

      if (consumerId) {
        const [c] = await db.select()
          .from(b2cConsumers)
          .where(eq(b2cConsumers.id, consumerId))
          .limit(1);
        consumerData = c ?? null;
      }

      if (accountId) {
        const [a] = await db.select()
          .from(accounts)
          .where(eq(accounts.id, accountId))
          .limit(1);
        accountData = a ?? null;
      }

      // 3. Construir prompt con contexto
      const userPrompt = `
TRIGGER: ${seq.trigger}
CANAL: ${seq.channel}
PLANTILLA BASE: ${seq.template}
CONTEXTO DEL USUARIO: ${JSON.stringify(triggerContext || {})}
DATOS CONSUMIDOR: ${JSON.stringify(consumerData || {})}
DATOS CUENTA: ${JSON.stringify(accountData || {})}

Genera el mensaje personalizado para enviar.
`;

      // 4. Llamar a IA
      const aiResult = await parseAIJsonResponse<MensajeGenerado>(
        AUTOMATION_SYSTEM_PROMPT,
        userPrompt,
        provider as AIProvider
      );

      // 5. Registrar en automation_logs
      const [registro] = await db.insert(automationLogs).values({
        sequenceId: seq.id,
        consumerId: consumerId || null,
        accountId: accountId || null,
        status: 'generated',
        sentAt: new Date(),
      }).returning();

      return NextResponse.json({
        success: true,
        data: {
          logId: registro.id,
          sequenceName: seq.name,
          channel: seq.channel,
          // El modelo puede omitir campos o devolverlos con otro tipo; se
          // normalizan aqui para que la respuesta de la API sea estable.
          message: typeof aiResult.message === 'string' ? aiResult.message : '',
          subject: typeof aiResult.subject === 'string' ? aiResult.subject : '',
          personalization: aiResult.personalization ?? {},
          confidence: typeof aiResult.confidence === 'number' ? aiResult.confidence : 0,
          provider,
        },
      });
    });

  } catch (error) {
    traza.error('Error en automatización', error, { ruta: '/api/automation/execute' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en automatización',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
