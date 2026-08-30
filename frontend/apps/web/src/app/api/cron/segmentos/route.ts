// =============================================================================
// Recalcular SOLO los segmentos, sin evaluar ni enviar secuencias
// =============================================================================
//
// /api/cron/secuencias ya recalcula los segmentos, pero de paso manda
// campañas reales. Hacía falta una forma de forzar el recálculo sola: al crear
// un segmento nuevo desde el CRM (ver lib/acciones/segmentos.ts, que ya llama
// a recalcularSegmentos() directamente) o para verificar un despliegue sin
// gastar conversaciones de WhatsApp de paso.
//
// Mismo secreto que el cron de secuencias: es la misma clase de operación
// —tocar datos de producción sin que haya una persona autenticada detrás—.

import { NextRequest, NextResponse } from 'next/server';
import { recalcularSegmentos } from '@/lib/segmentacion';
import { variableDeEntorno } from '@/lib/cloudflare';
import { log } from '@sighfood/domain/lib/observabilidad';

export const dynamic = 'force-dynamic';

const CABECERA = 'x-cron-secreto';

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

async function autorizado(request: NextRequest): Promise<boolean> {
  const esperado = (await variableDeEntorno('CRON_SECRETO'))?.trim();
  if (!esperado) return false;
  const recibido = request.headers.get(CABECERA)?.trim();
  return Boolean(recibido) && igual(recibido!, esperado);
}

export async function POST(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const segmentos = await recalcularSegmentos();
    log.info('Recálculo manual de segmentos', {
      ruta: '/api/cron/segmentos',
      detalle: [`${segmentos.length} segmentos`],
    });
    return NextResponse.json({ ok: true, segmentos });
  } catch (e) {
    log.error('Fallo al recalcular segmentos', e, { ruta: '/api/cron/segmentos' });
    return NextResponse.json({ ok: false, error: 'Fallo al recalcular' }, { status: 500 });
  }
}
