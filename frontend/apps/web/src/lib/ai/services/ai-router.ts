import { chatWithGroq } from './groq-service';
import { chatWithGemini } from './google-service';
import { chatWithDeepSeek } from './deepseek-service';
import { chatWithOllama } from './ollama-service';
import { variableDeEntorno } from '@/lib/cloudflare';

export type AIProvider = 'groq' | 'google' | 'deepseek' | 'ollama';

const PROVEEDORES: readonly AIProvider[] = ['groq', 'google', 'deepseek', 'ollama'];

/**
 * Proveedor por defecto, resuelto por petición.
 *
 * Antes era una constante de módulo leída de `process.env`. En Workers eso se
 * evalúa al importar, cuando `process.env` está vacío, así que DEFAULT_AI_PROVIDER
 * se ignoraba y siempre acababa en 'groq' independientemente de la configuración.
 */
export async function proveedorPorDefecto(): Promise<AIProvider> {
  const configurado = await variableDeEntorno('DEFAULT_AI_PROVIDER');
  return PROVEEDORES.includes(configurado as AIProvider) ? (configurado as AIProvider) : 'groq';
}

export async function chatWithAI(
  systemPrompt: string,
  userPrompt: string,
  provider?: AIProvider
): Promise<string> {
  const elegido = provider ?? (await proveedorPorDefecto());
  switch (elegido) {
    case 'groq':
      return chatWithGroq(systemPrompt, userPrompt);
    case 'google':
      return chatWithGemini(systemPrompt, userPrompt);
    case 'deepseek':
      return chatWithDeepSeek(systemPrompt, userPrompt);
    case 'ollama':
      return chatWithOllama(systemPrompt, userPrompt);
    default:
      throw new Error(`Proveedor no soportado: ${elegido}`);
  }
}

/**
 * Como `chatWithAI`, pero cae a otro proveedor si el elegido falla.
 *
 * Los workflows encadenan varios proveedores (deepseek → groq → google) y sin
 * esto basta con que uno se quede sin saldo para que el flujo entero devuelva
 * 500. Se comprobó en pruebas: DeepSeek respondió 402 "Insufficient Balance" y
 * el análisis de churn completo se perdía, aunque Groq estaba operativo.
 *
 * Devuelve también qué proveedor respondió, para que quien llame pueda dejarlo
 * en la traza: un respaldo silencioso oculta que el proveedor principal está
 * caído y nadie lo arregla.
 */
export async function chatWithAIConRespaldo(
  systemPrompt: string,
  userPrompt: string,
  provider?: AIProvider
): Promise<{ texto: string; proveedorUsado: AIProvider; fallos: Array<{ proveedor: AIProvider; error: string }> }> {
  const preferido = provider ?? (await proveedorPorDefecto());
  const orden: AIProvider[] = [preferido, ...PROVEEDORES.filter((p) => p !== preferido)];
  const fallos: Array<{ proveedor: AIProvider; error: string }> = [];

  for (const p of orden) {
    try {
      const texto = await chatWithAI(systemPrompt, userPrompt, p);
      return { texto, proveedorUsado: p, fallos };
    } catch (e) {
      fallos.push({ proveedor: p, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const detalle = fallos.map((f) => `${f.proveedor}: ${f.error}`).join(' | ');
  throw new Error(`Ningun proveedor de IA respondio. ${detalle}`);
}

/**
 * Pide JSON al proveedor y lo interpreta.
 *
 * `T` es lo que el llamador espera, no lo que el modelo garantiza: un LLM puede
 * devolver cualquier forma, así que quien llame debe comprobar los campos que
 * vaya a usar.
 */
export async function parseAIJsonResponse<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  provider?: AIProvider
): Promise<T> {
  const raw = await chatWithAI(systemPrompt, userPrompt, provider);
  try {
    return JSON.parse(raw) as T;
  } catch {
    // El contenido crudo no va al log: puede arrastrar datos del prompt.
    throw new Error(`La IA no devolvió JSON válido (${raw.length} caracteres)`);
  }
}
