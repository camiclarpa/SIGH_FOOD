import { variableDeEntorno } from '@/lib/cloudflare';

/**
 * Modelo por defecto.
 *
 * Era `llama-3.3-70b-versatile`, que Groq ya no sirve: devolvía 404
 * "model_not_found" y con él fallaban todas las llamadas a la IA. Los modelos
 * se retiran con regularidad, así que conviene comprobarlo contra
 * https://api.groq.com/openai/v1/models antes de dar por buena una avería.
 */
const MODELO_POR_DEFECTO = 'openai/gpt-oss-120b';

/**
 * Tope de tokens de la respuesta.
 *
 * Estaba en 1024 y con los modelos actuales no basta: emiten su razonamiento
 * antes del JSON, y al truncarse la respuesta Groq la rechaza con
 * "Failed to validate JSON". El síntoma apunta al prompt y la causa es el
 * límite, así que el error despista.
 */
const MAX_TOKENS = 4096;

/**
 * Llama al chat completions de Groq por REST directo.
 *
 * Antes se usaba `groq-sdk`, cuya API es idéntica a esta (Groq es
 * compatible con el formato de OpenAI): el SDK completo solo aportaba
 * reintentos y streaming que aquí no se usan, y su peso empujó al Worker
 * por encima del límite de tamaño de Cloudflare. Un `fetch` a mano cubre
 * lo mismo con cero dependencias.
 */
export async function chatWithGroq(
  systemPrompt: string,
  userPrompt: string,
  model: string = MODELO_POR_DEFECTO
): Promise<string> {
  const apiKey = await variableDeEntorno('GROQ_API_KEY');
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

  const respuesta = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model,
      temperature: 0.3,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
    }),
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.text().catch(() => '');
    throw new Error(`Groq respondió ${respuesta.status}: ${cuerpo.slice(0, 300)}`);
  }

  const datos = (await respuesta.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return datos.choices?.[0]?.message?.content || '';
}

// =============================================================================
// Utilidades de análisis
// =============================================================================

/**
 * Pide un JSON al modelo y lo interpreta.
 *
 * Un LLM devuelve texto: aunque se le pida `response_format: json_object`, la
 * respuesta puede venir vacía o truncada. Sin este envoltorio, un `JSON.parse`
 * suelto revienta la ruta con un error que no dice nada del origen.
 */
async function pedirJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const bruto = await chatWithGroq(systemPrompt, userPrompt);
  try {
    return JSON.parse(bruto) as T;
  } catch {
    throw new Error(`La IA no devolvió JSON válido: ${bruto.slice(0, 200)}`);
  }
}

/** Fuerza un número dentro de [min, max]; devuelve `porDefecto` si no lo es. */
function acotar(valor: unknown, min: number, max: number, porDefecto: number): number {
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(max, Math.max(min, n));
}

/** Se queda con el valor solo si pertenece al enum; si no, con `porDefecto`. */
function unoDe<T extends string>(valor: unknown, permitidos: readonly T[], porDefecto: T): T {
  return permitidos.includes(valor as T) ? (valor as T) : porDefecto;
}

export const RIESGOS_CHURN = ['low', 'medium', 'high', 'critical'] as const;
export const NIVELES_LEAD = ['cold', 'warm', 'hot', 'qualified'] as const;

export type RiesgoChurn = (typeof RIESGOS_CHURN)[number];
export type NivelLead = (typeof NIVELES_LEAD)[number];

// =============================================================================
// Predicción de abandono (churn)
// =============================================================================

export interface DatosChurn {
  name: string;
  pipelineStage: string;
  avgConsumptionDays: number;
  lastActivity: string;
  currentStock: number;
  engagementScore: number | string;
}

export interface PrediccionChurn {
  churnRisk: RiesgoChurn;
  churnScore: number;
  reasons: string[];
  recommendedActions: string[];
}

export async function predictChurn(datos: DatosChurn): Promise<PrediccionChurn> {
  const salida = await pedirJson<Partial<PrediccionChurn>>(
    `Eres un analista de retención de clientes B2B para una distribuidora de salsas y condimentos.
Evalúas el riesgo de que un bar o restaurante deje de comprar.
Responde SOLO con JSON: {"churnRisk":"low|medium|high|critical","churnScore":0-1,"reasons":["..."],"recommendedActions":["..."]}
churnScore es la probabilidad de abandono entre 0 y 1.`,
    JSON.stringify(datos)
  );

  return {
    // Se valida en vez de confiar: el modelo puede inventarse un nivel que no
    // existe en el enum y el INSERT fallaria con un error opaco de Postgres.
    churnRisk: unoDe(salida.churnRisk, RIESGOS_CHURN, 'low'),
    churnScore: acotar(salida.churnScore, 0, 1, 0),
    reasons: Array.isArray(salida.reasons) ? salida.reasons : [],
    recommendedActions: Array.isArray(salida.recommendedActions) ? salida.recommendedActions : [],
  };
}

// =============================================================================
// Puntuación de leads
// =============================================================================

export interface DatosLead {
  name: string;
  zone: string;
  decisionMakerRole: string;
  pipelineStage: string;
  estimatedSize: string;
}

export interface PuntuacionLead {
  leadScore: NivelLead;
  conversionProb: number;
  reasons: string[];
  nextBestAction: string;
}

export async function scoreLead(datos: DatosLead): Promise<PuntuacionLead> {
  const salida = await pedirJson<Partial<PuntuacionLead>>(
    `Eres un analista comercial B2B de una distribuidora de salsas para hostelería.
Calificas oportunidades según su probabilidad de cierre.
Responde SOLO con JSON: {"leadScore":"cold|warm|hot|qualified","conversionProb":0-1,"reasons":["..."],"nextBestAction":"..."}`,
    JSON.stringify(datos)
  );

  return {
    leadScore: unoDe(salida.leadScore, NIVELES_LEAD, 'cold'),
    conversionProb: acotar(salida.conversionProb, 0, 1, 0),
    reasons: Array.isArray(salida.reasons) ? salida.reasons : [],
    nextBestAction: typeof salida.nextBestAction === 'string' ? salida.nextBestAction : '',
  };
}

// =============================================================================
// Proyección de ingresos
// =============================================================================

export interface DatosProyeccion {
  last3MonthsRevenue: string;
  growthTrend: string;
  pipelineValue: number;
  avgCloseProb: number;
  seasonality: string;
}

export interface Proyeccion {
  forecastNextMonth: number;
  forecastNextQuarter: number;
  confidence: number;
  assumptions: string[];
  risks: string[];
}

export async function forecastRevenue(datos: DatosProyeccion): Promise<Proyeccion> {
  const salida = await pedirJson<Partial<Proyeccion>>(
    `Eres un analista financiero de una distribuidora de salsas para hostelería.
Proyectas ingresos a partir del histórico y del pipeline comercial.
Responde SOLO con JSON: {"forecastNextMonth":number,"forecastNextQuarter":number,"confidence":0-1,"assumptions":["..."],"risks":["..."]}
Los importes van en la misma moneda que los datos de entrada.`,
    JSON.stringify(datos)
  );

  return {
    forecastNextMonth: acotar(salida.forecastNextMonth, 0, Number.MAX_SAFE_INTEGER, 0),
    forecastNextQuarter: acotar(salida.forecastNextQuarter, 0, Number.MAX_SAFE_INTEGER, 0),
    confidence: acotar(salida.confidence, 0, 1, 0),
    assumptions: Array.isArray(salida.assumptions) ? salida.assumptions : [],
    risks: Array.isArray(salida.risks) ? salida.risks : [],
  };
}

// =============================================================================
// Recomendación de productos
// =============================================================================

export interface DatosRecomendacion {
  purchaseHistory: string;
  flavorPreferences: string;
  establishmentType: string;
  currentSeason: string;
}

export interface ProductoRecomendado {
  productLine: string;
  reason: string;
  confidence: number;
}

export interface Recomendaciones {
  recommendations: ProductoRecomendado[];
  crossSellOpportunity: string;
}

export async function recommendProducts(datos: DatosRecomendacion): Promise<Recomendaciones> {
  const salida = await pedirJson<Partial<Recomendaciones>>(
    `Eres un experto en producto de una marca de salsas y condimentos.
Recomiendas líneas de producto según el perfil sensorial y el tipo de establecimiento.
Las líneas disponibles son: flavor_switch, taste_shock, spicy_volcano, umami_boost, sweet_craft.
Responde SOLO con JSON: {"recommendations":[{"productLine":"...","reason":"...","confidence":0-1}],"crossSellOpportunity":"..."}`,
    JSON.stringify(datos)
  );

  const recomendaciones = Array.isArray(salida.recommendations) ? salida.recommendations : [];

  return {
    recommendations: recomendaciones.map((r) => ({
      productLine: typeof r?.productLine === 'string' ? r.productLine : 'desconocida',
      reason: typeof r?.reason === 'string' ? r.reason : '',
      confidence: acotar(r?.confidence, 0, 1, 0),
    })),
    crossSellOpportunity:
      typeof salida.crossSellOpportunity === 'string' ? salida.crossSellOpportunity : '',
  };
}
