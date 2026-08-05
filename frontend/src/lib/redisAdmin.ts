/**
 * Helper para ejecutar comandos de Redis vía REST API (Upstash)
 * desde los Server Components de Next.js.
 */
export async function redisCommand(command: string[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Modo Mock si no hay credenciales configuradas
  if (!url || !token || url.includes('your-region')) {
    console.warn('[Redis Admin] Usando modo MOCK (sin credenciales reales)');
    return { result: 0 };
  }

  try {
    const response = await fetch(`${url}/${command.join('/')}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Evitar caché para datos en tiempo real
      cache: 'no-store', 
    });

    if (!response.ok) {
      console.error(`[Redis Admin] Error: ${response.statusText}`);
      return { result: 0 };
    }

    return await response.json();
  } catch (error) {
    console.error('[Redis Admin] Fetch error:', error);
    return { result: 0 };
  }
}

export async function getQueueLength(): Promise<number> {
  const result = await redisCommand(['XLEN', 'stream:sighfood-leads-queue']);
  return result.result || 0;
}

export async function getDLQLength(): Promise<number> {
  const result = await redisCommand(['XLEN', 'stream:sighfood-leads-dlq']);
  return result.result || 0;
}

export async function getProcessedToday(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const result = await redisCommand(['GET', `metrics:processed:${today}`]);
  return result.result ? parseInt(result.result, 10) : 0;
}