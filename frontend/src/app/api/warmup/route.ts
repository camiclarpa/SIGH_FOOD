import { NextResponse } from 'next/server';
import { redisCommand } from '@/lib/redisAdmin';

/**
 * Endpoint de Warmup para mantener la Edge Function "caliente".
 * 
 * Los servidores serverless/edge tienen "Cold Starts" (latencia inicial alta)
 * cuando no han recibido tráfico en un tiempo. Este endpoint realiza una 
 * operación ligera (PING a Redis) para mantener la conexión activa y el 
 * contenedor de la función vivo.
 * 
 * Debe ser llamado por un servicio externo (UptimeRobot, Vercel Cron) cada 3-5 minutos.
 */

// Forzar ejecución dinámica para evitar que Next.js cachee la respuesta
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  
  try {
    // 1. Ping a Redis para mantener el pool de conexiones caliente
    const pingResult = await redisCommand(['PING']);
    const redisLatency = Date.now() - startTime;
    
    // 2. Verificar que la respuesta sea PONG
    if (pingResult.result === 'PONG' || pingResult.result === 'pong') {
      return NextResponse.json({
        status: 'warm',
        service: 'redis',
        latency: `${redisLatency}ms`,
        timestamp: new Date().toISOString(),
        uptime: process.uptime ? process.uptime() : 0,
      }, { 
        status: 200,
        headers: { 'Cache-Control': 'no-store' } // Evitar caché en CDN
      });
    }
    
    return NextResponse.json({
      status: 'degraded',
      message: 'Redis respondió inesperadamente',
      latency: `${redisLatency}ms`,
    }, { status: 503 });
    
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('[Warmup] Error:', error);
    
    return NextResponse.json({
      status: 'cold',
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}