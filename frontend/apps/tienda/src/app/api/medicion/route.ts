// =============================================================================
// Embudo: registro de pasos
// =============================================================================
//
// Lo llama el navegador con sendBeacon, que sigue enviando aunque la persona
// cierre la pestaña — justo el caso que más interesa medir: el abandono.
//
// SIEMPRE devuelve 204, incluso ante datos malos. Un error aquí no le sirve de
// nada a quien está comprando, y un 4xx en la consola asusta sin motivo.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registrar, PASOS } from '@/lib/medicion';

export const dynamic = 'force-dynamic';

const esquema = z.object({
  evento: z.enum(PASOS as [string, ...string[]]),
  sesion: z.string().min(8).max(64),
  productoId: z.string().uuid().optional(),
  valorCOP: z.number().int().min(0).max(10_000_000).optional(),
});

export async function POST(request: NextRequest) {
  const vacio = new NextResponse(null, { status: 204 });

  try {
    const v = esquema.safeParse(await request.json());

    if (!v.success) {
      // Al usuario no se le dice nada —un 4xx en la consola asusta sin motivo—
      // pero SÍ queda en el log del servidor. Sin esto, un evento mal formado
      // desaparece sin rastro y depurar por qué no se registra nada es
      // imposible: el endpoint responde 204 tanto si guardó como si descartó.
      console.warn('Evento de embudo descartado:', v.error.issues[0]?.message);
      return vacio;
    }

    await registrar({
      evento: v.data.evento as never,
      sesionAnonima: v.data.sesion,
      productoId: v.data.productoId,
      valorCOP: v.data.valorCOP,
    });
  } catch {
    // Ver el comentario de arriba: la medición nunca molesta.
  }

  return vacio;
}
