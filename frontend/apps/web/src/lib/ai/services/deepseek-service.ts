import { variableDeEntorno } from '@/lib/cloudflare';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

export async function chatWithDeepSeek(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // La clave se lee por petición, no al importar el módulo: en Workers
  // `process.env` está vacío en el ámbito global, así que la constante de
  // módulo quedaba `undefined` para siempre y este proveedor no arrancaba nunca.
  const apiKey = await variableDeEntorno('DEEPSEEK_API_KEY');
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY no configurada');

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error DeepSeek: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
