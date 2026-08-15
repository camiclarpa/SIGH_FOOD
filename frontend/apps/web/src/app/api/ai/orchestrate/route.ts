import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflow, Workflows, type WorkflowStep } from '@/lib/ai/services/ai-message-bus';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { accounts } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';

export const POST = conTrazas('/api/ai/orchestrate', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { accountId, workflowType = 'ADVANCED_CHURN_ANALYSIS' } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'accountId es requerido' },
        { status: 400 }
      );
    }

    // 1. Obtener datos del cliente.
    // La conexión se cierra aquí: el workflow que viene después son llamadas a
    // proveedores de IA y puede tardar decenas de segundos. Mantener la conexión
    // abierta durante ese tiempo agota el pool de Neon bajo concurrencia.
    const client = await conBaseDeDatos(async (db) => {
      const [fila] = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
      return fila;
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // 2. Seleccionar y ejecutar el workflow
    let steps: WorkflowStep[] = [];
    if (workflowType === 'ADVANCED_CHURN_ANALYSIS') {
      steps = Workflows.ADVANCED_CHURN_ANALYSIS(client);
    } else {
      return NextResponse.json(
        { success: false, error: 'Workflow no soportado' },
        { status: 400 }
      );
    }

    // 3. Ejecutar el Bus de Mensajes
    const result = await executeWorkflow(workflowType, steps, { clientData: client });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, steps: result.steps },
        { status: 500 }
      );
    }

    // 4. (Opcional) Guardar el resultado final en la BD
    // await db.update(accounts).set({ ... }).where(eq(accounts.id, accountId));

    return NextResponse.json({
      success: true,
      workflow: workflowType,
      executionSummary: {
        totalSteps: result.steps.length,
        totalExecutionTimeMs: result.steps.reduce((acc, step) => acc + step.executionTimeMs, 0),
        modelsUsed: [...new Set(result.steps.map(s => s.proveedorUsado ?? s.model))],
      },
      finalResult: result.finalOutput,
      stepDetails: result.steps.map(s => ({
        step: s.stepId,
        model: s.model,
        // Se expone el proveedor real: si un paso cayó al respaldo, quien mira
        // la respuesta debe poder verlo sin rebuscar en los logs.
        proveedorUsado: s.proveedorUsado ?? s.model,
        timeMs: s.executionTimeMs,
      })),
    });

  } catch (error) {
    log.error('Error en orquestación de IA', error, { ruta: '/api/ai/orchestrate' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno en orquestación',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});