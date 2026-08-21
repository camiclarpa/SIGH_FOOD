// =============================================================================
// SIGH_FOOD - Desafíos en mesa (cara pública)
// Endpoint: GET/POST /api/challenges
// =============================================================================
//
// Lo llama el comensal desde la pantalla de escaneo, sin sesión: acaba de dar su
// WhatsApp en la mesa, no tiene cuenta en el CRM. Es público, así que:
//
//   · La entrada se valida con Zod, como el resto de rutas públicas.
//   · El límite de peticiones lo aplica el middleware por estar en RUTAS_PUBLICAS.
//   · La respuesta correcta no sale nunca en el GET. La corrección la hace el
//     servidor en responderDesafio().
//
// Lo que este endpoint NO hace es comprobar que quien pide es de verdad ese
// comensal: no hay sesión que lo respalde. El daño posible está acotado a
// propósito — se puede consultar un desafío ajeno (que no es secreto) o gastar
// el intento de un consumer_id que se conozca. Los puntos van siempre a ese
// comensal, nunca a quien llama, así que no hay nada que robar. Si algún día se
// necesita más, la vía es firmar el consumer_id al escanear, no añadir
// comprobaciones aquí.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { log } from '@sighfood/domain/lib/observabilidad';
import { desafioParaComensal, responderDesafio } from '@/lib/desafios';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// GET: ¿hay algún desafío para este comensal?
// -----------------------------------------------------------------------------

const consulta = z.object({
  consumer_id: z.string().uuid('consumer_id no es un identificador válido'),
  product_line: z.string().max(50).optional(),
  zone: z.string().max(100).optional(),
});

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const v = consulta.safeParse({
    consumer_id: p.get('consumer_id') ?? undefined,
    product_line: p.get('product_line') ?? undefined,
    zone: p.get('zone') ?? undefined,
  });

  if (!v.success) {
    return NextResponse.json(
      { success: false, error: v.error.issues[0]?.message ?? 'Petición inválida' },
      { status: 400 }
    );
  }

  try {
    const desafio = await desafioParaComensal({
      consumerId: v.data.consumer_id,
      lineaProducto: v.data.product_line ?? null,
      zona: v.data.zone ?? null,
    });

    // Sin desafío no es un error: es el caso normal la mayoría de las veces.
    return NextResponse.json({ success: true, data: { desafio } });
  } catch (e) {
    log.error('Error buscando desafío para el comensal', e, { ruta: '/api/challenges' });
    // El comensal acaba de registrar su momento con éxito. Que falle esto no
    // debe teñir de rojo una pantalla que celebra puntos: se responde "no hay".
    return NextResponse.json({ success: true, data: { desafio: null } });
  }
}

// -----------------------------------------------------------------------------
// POST: responder
// -----------------------------------------------------------------------------

const envio = z.object({
  challenge_id: z.string().uuid(),
  consumer_id: z.string().uuid(),
  account_id: z.string().uuid().optional(),
  // El tope de 10 es el mismo que impone el editor al crear el desafío.
  elegidas: z.array(z.number().int().min(0).max(20)).min(1).max(10),
  segundos: z.number().int().min(0).max(3600).optional(),
});

export async function POST(request: NextRequest) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Cuerpo ilegible' }, { status: 400 });
  }

  const v = envio.safeParse(cuerpo);
  if (!v.success) {
    return NextResponse.json(
      { success: false, error: v.error.issues[0]?.message ?? 'Petición inválida' },
      { status: 400 }
    );
  }

  try {
    const r = await responderDesafio({
      challengeId: v.data.challenge_id,
      consumerId: v.data.consumer_id,
      accountId: v.data.account_id ?? null,
      elegidas: v.data.elegidas,
      segundosRespuesta: v.data.segundos ?? null,
    });

    return NextResponse.json({ success: true, data: r });
  } catch (e) {
    log.error('Error registrando respuesta a un desafío', e, { ruta: '/api/challenges' });
    // El mensaje de responderDesafio() está escrito para leerse en la mesa
    // ("ese desafío ya terminó"), así que se devuelve tal cual.
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'No se pudo registrar tu respuesta' },
      { status: 400 }
    );
  }
}
