import { variableDeEntorno } from '@/lib/cloudflare';

// `gemini-1.5-pro` esta retirado: la API responde 404 "is not found for API
// version v1beta". Se usa el alias `-latest`, que Google mantiene apuntando al
// modelo pro vigente y evita repetir esta rotura en la proxima retirada.
const GEMINI_MODEL = 'gemini-pro-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function chatWithGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // Igual que en los demás proveedores: la clave se resuelve por petición
  // porque en Workers `process.env` no existe en el ámbito de módulo.
  const apiKey = await variableDeEntorno('GOOGLE_AI_API_KEY');
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no configurada');

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // La clave va en cabecera y no en la query string: una URL con la clave
      // acaba en logs de acceso y trazas de error.
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error Gemini: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
