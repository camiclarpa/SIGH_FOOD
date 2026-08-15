// =============================================================================
// SIGH_FOOD - AI Message Bus (Orquestador de Workflows)
// Descripción: Permite que múltiples modelos de IA colaboren en secuencia
// =============================================================================

import { chatWithAIConRespaldo } from './ai-router';
import type { AIProvider } from './ai-router';

export interface BusMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  sourceModel?: AIProvider;
  timestamp: Date;
}

export interface WorkflowStep {
  id: string;
  model: AIProvider;
  systemPrompt: string;
  userPromptTemplate: string; // Puede contener {{step_id}} para inyectar resultados anteriores
  timeoutMs?: number;
}

export interface WorkflowResult {
  success: boolean;
  steps: {
    stepId: string;
    /** Proveedor pedido por el paso. */
    model: AIProvider;
    /** Proveedor que realmente respondio (difiere si hubo respaldo). */
    proveedorUsado?: AIProvider;
    output: string;
    executionTimeMs: number;
  }[];
  finalOutput: unknown;
  error?: string;
}

/**
 * Ejecuta el modelo del paso, con respaldo a otro proveedor si falla.
 *
 * El switch manual que habia aqui duplicaba el del router y, al no tener
 * respaldo, un proveedor sin saldo tumbaba el workflow entero.
 */
async function executeModel(
  model: AIProvider,
  systemPrompt: string,
  userPrompt: string
): Promise<{ texto: string; proveedorUsado: AIProvider }> {
  const { texto, proveedorUsado } = await chatWithAIConRespaldo(systemPrompt, userPrompt, model);
  return { texto, proveedorUsado };
}

// Función principal del Bus: Ejecuta un workflow encadenado
export async function executeWorkflow(
  workflowId: string,
  steps: WorkflowStep[],
  initialContext: Record<string, unknown>
): Promise<WorkflowResult> {
  const results: WorkflowResult['steps'] = [];
  const context = { ...initialContext };

  try {
    for (const step of steps) {
      const startTime = Date.now();
      
      // Reemplazar placeholders {{step_id}} con resultados anteriores
      let userPrompt = step.userPromptTemplate;
      for (const key of Object.keys(context)) {
        const placeholder = `{{${key}}}`;
        if (userPrompt.includes(placeholder)) {
          // Si el contexto es un objeto, stringificarlo; si ya es string, usarlo directo
          const value = typeof context[key] === 'string' 
            ? context[key] 
            : JSON.stringify(context[key], null, 2);
          userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), value);
        }
      }

      console.log(`[AI Bus] Ejecutando paso: ${step.id} con modelo: ${step.model}`);
      
      // Faltaba `step.model`: los argumentos se recibian corridos, asi que el
      // modelo del paso se ignoraba y el system prompt viajaba como nombre de
      // proveedor. La traza de arriba ya imprimia el modelo correcto, lo que
      // hacia el fallo invisible en los logs.
      const { texto: output, proveedorUsado } = await executeModel(
        step.model,
        step.systemPrompt,
        userPrompt
      );
      const executionTime = Date.now() - startTime;

      if (proveedorUsado !== step.model) {
        console.warn(`[AI Bus] Paso ${step.id}: ${step.model} no respondio, se uso ${proveedorUsado}`);
      }

      results.push({
        stepId: step.id,
        model: step.model,
        proveedorUsado,
        output,
        executionTimeMs: executionTime,
      });

      // Guardar en contexto para el siguiente paso
      context[step.id] = output;
    }

    // Intentar parsear la salida final como JSON si es posible
    const bruto = context[steps[steps.length - 1].id];
    let finalOutput: unknown = bruto;
    if (typeof bruto === 'string') {
      try {
        finalOutput = JSON.parse(bruto);
      } catch {
        // Si no es JSON válido, dejarlo como string
      }
    }

    return {
      success: true,
      steps: results,
      finalOutput,
    };

  } catch (error) {
    console.error(`[AI Bus] Error en workflow ${workflowId}:`, error);
    return {
      success: false,
      steps: results,
      finalOutput: null,
      // `error.message` a secas: si lo lanzado no era un Error —un string, o el
      // rechazo de un fetch— esto era `undefined` y el motivo se perdia.
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// WORKFLOWS PREDEFINIDOS
// =============================================================================

export const Workflows = {
  // Ejemplo: Análisis de Churn Avanzado (DeepSeek analiza -> Groq decide -> Gemini redacta)
  ADVANCED_CHURN_ANALYSIS: (clientData: Record<string, unknown>) => [
    {
      id: 'analysis',
      model: 'deepseek' as AIProvider,
      systemPrompt: 'Eres un analista de datos experto. Analiza los datos del cliente y determina las 3 razones principales de riesgo de abandono. Responde en JSON: {"reasons": ["razon1", "razon2", "razon3"], "riskLevel": "low|medium|high|critical"}',
      userPromptTemplate: `Datos del cliente: ${JSON.stringify(clientData)}`,
    },
    {
      id: 'strategy',
      model: 'groq' as AIProvider,
      systemPrompt: 'Eres un estratega de retención de clientes. Basándote en el análisis de riesgo, genera 2 acciones concretas y rápidas para retener a este cliente. Responde en JSON: {"actions": [{"action": "descripción", "expectedImpact": "alto|medio|bajo"}]}',
      userPromptTemplate: `Análisis de riesgo previo: {{analysis}}`,
    },
    {
      id: 'communication',
      model: 'google' as AIProvider,
      systemPrompt: 'Eres un redactor empático de correos electrónicos B2B. Redacta un mensaje corto y personalizado para el cliente, ofreciendo las acciones de retención sin sonar desesperado. Responde en JSON: {"subject": "asunto", "body": "cuerpo del mensaje"}',
      userPromptTemplate: `Cliente: ${clientData.name}. Acciones a ofrecer: {{strategy}}`,
    }
  ],
};