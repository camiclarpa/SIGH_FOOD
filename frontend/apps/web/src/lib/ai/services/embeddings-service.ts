// =============================================================================
// Generación de embeddings
// =============================================================================
//
// La versión anterior devolvía `Math.random()` — 1536 números aleatorios. La
// búsqueda por similitud funcionaba mecánicamente, pero sus resultados no
// significaban nada, y nada en la respuesta lo delataba: el índice se llenaba
// de ruido con aspecto de datos.
//
// De ahí las dos reglas de este módulo:
//   · Si no hay proveedor disponible, se lanza. Un índice vacío se nota; uno
//     lleno de ruido no, y contamina toda decisión que se apoye en él.
//   · Cada vector se guarda junto al modelo que lo produjo, para poder
//     reindexar solo lo que haga falta cuando se cambie de proveedor.

import { variableDeEntorno } from '@/lib/cloudflare';

/** Dimensión de las columnas `vector(1536)` del esquema. */
export const DIMENSIONES = 1536;

/** Modelos admitidos por `embedding_model` en la base. */
export type ModeloEmbedding =
  | 'openai_text_3_small'
  | 'openai_text_3_large'
  | 'local_sentence_transformers'
  | 'deepseek_embedding';

export interface Embedding {
  vector: number[];
  modelo: ModeloEmbedding;
  proveedor: string;
}

// -----------------------------------------------------------------------------
// Proveedores
// -----------------------------------------------------------------------------

/**
 * OpenAI y compatibles (DeepSeek, vLLM, LocalAI, Ollama con /v1).
 *
 * `dimensions` recorta el vector en el servidor. Sin ese parámetro,
 * text-embedding-3-large devuelve 3072 componentes y el INSERT falla contra
 * una columna vector(1536) con un error de dimensión poco descriptivo.
 */
async function conOpenAI(textos: string[], apiKey: string, base: string, modelo: string): Promise<number[][]> {
  const respuesta = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: modelo, input: textos, dimensions: DIMENSIONES }),
  });

  if (!respuesta.ok) {
    throw new Error(`Embeddings OpenAI (${modelo}): ${respuesta.status} ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  // Se ordena por índice: la API no garantiza el orden de `data`, y un vector
  // asignado al texto equivocado es un fallo silencioso.
  return (datos.data as Array<{ index: number; embedding: number[] }>)
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Google Gemini. `outputDimensionality` recorta a 1536 en el servidor. */
async function conGoogle(textos: string[], apiKey: string): Promise<number[][]> {
  const respuesta = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        requests: textos.map((texto) => ({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: texto }] },
          outputDimensionality: DIMENSIONES,
        })),
      }),
    }
  );

  if (!respuesta.ok) {
    throw new Error(`Embeddings Google: ${respuesta.status} ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  return (datos.embeddings as Array<{ values: number[] }>).map((e) => e.values);
}

// -----------------------------------------------------------------------------
// Selección de proveedor
// -----------------------------------------------------------------------------

interface Candidato {
  proveedor: string;
  modelo: ModeloEmbedding;
  ejecutar: (textos: string[]) => Promise<number[][]>;
}

async function candidatos(): Promise<Candidato[]> {
  const [openai, deepseek, google] = await Promise.all([
    variableDeEntorno('OPENAI_API_KEY'),
    variableDeEntorno('DEEPSEEK_API_KEY'),
    variableDeEntorno('GOOGLE_AI_API_KEY'),
  ]);

  const lista: Candidato[] = [];

  if (openai) {
    lista.push({
      proveedor: 'openai',
      modelo: 'openai_text_3_small',
      ejecutar: (t) => conOpenAI(t, openai, 'https://api.openai.com/v1', 'text-embedding-3-small'),
    });
  }
  if (google) {
    lista.push({
      proveedor: 'google',
      // El enum de la base no tiene una entrada para Gemini; se registra como
      // local_sentence_transformers en vez de mentir diciendo que es de OpenAI.
      modelo: 'local_sentence_transformers',
      ejecutar: (t) => conGoogle(t, google),
    });
  }
  if (deepseek) {
    lista.push({
      proveedor: 'deepseek',
      modelo: 'deepseek_embedding',
      ejecutar: (t) => conOpenAI(t, deepseek, 'https://api.deepseek.com/v1', 'deepseek-embedding'),
    });
  }

  return lista;
}

/**
 * Genera embeddings para varios textos de una vez.
 *
 * Por lotes y no de uno en uno: indexar 1000 cuentas con una llamada HTTP por
 * cuenta son 1000 viajes de red y, en la mayoría de proveedores, 1000 veces el
 * coste fijo por petición.
 */
export async function generarEmbeddings(textos: string[]): Promise<Embedding[]> {
  if (textos.length === 0) return [];

  const disponibles = await candidatos();

  if (disponibles.length === 0) {
    throw new Error(
      'No hay proveedor de embeddings configurado. Define OPENAI_API_KEY, ' +
      'GOOGLE_AI_API_KEY o DEEPSEEK_API_KEY. No se generan vectores aleatorios: ' +
      'un índice lleno de ruido devuelve resultados sin sentido sin avisar de nada.'
    );
  }

  const fallos: string[] = [];

  for (const c of disponibles) {
    try {
      const vectores = await c.ejecutar(textos);

      // Se comprueba la dimensión antes de devolver: si el proveedor ignora el
      // recorte, el fallo debe salir aquí y no en el INSERT, donde el mensaje
      // de Postgres no dice qué proveedor lo produjo.
      for (const v of vectores) {
        if (v.length !== DIMENSIONES) {
          throw new Error(`${c.proveedor} devolvió ${v.length} dimensiones, se esperaban ${DIMENSIONES}`);
        }
      }

      return vectores.map((vector) => ({ vector, modelo: c.modelo, proveedor: c.proveedor }));
    } catch (e) {
      fallos.push(`${c.proveedor}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`Ningún proveedor de embeddings respondió. ${fallos.join(' | ')}`);
}

export async function generarEmbedding(texto: string): Promise<Embedding> {
  const [uno] = await generarEmbeddings([texto]);
  return uno;
}

/** Literal que pgvector espera: '[a,b,c]', no un array de postgres.js. */
export function comoLiteralVector(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
