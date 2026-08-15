import { variableDeEntorno } from '@/lib/cloudflare';

const OLLAMA_MODEL = 'llama3.1:8b';

export async function chatWithOllama(
  systemPrompt: string,
  userPrompt: string,
  model: string = OLLAMA_MODEL
): Promise<string> {
  // Se resuelve por petición: en Workers `process.env` está vacío al importar,
  // así que la constante de módulo siempre caía al localhost por defecto.
  const baseUrl = (await variableDeEntorno('OLLAMA_BASE_URL')) || 'http://localhost:11434';

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      format: 'json',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Error Ollama: ${err}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}
