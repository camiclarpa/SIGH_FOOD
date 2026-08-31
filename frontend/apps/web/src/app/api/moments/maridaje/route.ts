// =============================================================================
// Sugerencia de maridaje para el momento que se acaba de registrar
// =============================================================================
//
// Va en un endpoint APARTE de POST /api/moments/scan, no dentro de él: llamar
// a un modelo de IA tarda segundos, y el escaneo tiene que responder rápido
// (puntos, insignias) para que la celebración no se sienta lenta. Esto se pide
// DESPUÉS, mientras la persona ya está viendo sus puntos — el mismo patrón que
// la pregunta de maridaje manual (PreguntaMaridaje, en FormularioEscaneo).
//
// recomendarMaridaje() ya existía —lib/ai/comensal.ts— con lógica real y
// probada, pero ningún endpoint del producto la llamaba todavía. Este es ese
// endpoint.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { recomendarMaridaje } from '@/lib/ai/comensal';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';

const esquema = z.object({
  consumer_id: z.string().uuid(),
  linea: z.enum(['flavor_switch', 'taste_shock', 'spicy_volcano', 'umami_boost', 'sweet_craft']),
});

export const POST = conTrazas('/api/moments/maridaje', async (request: NextRequest) => {
  const v = esquema.safeParse(await request.json().catch(() => null));
  if (!v.success) {
    return NextResponse.json({ ok: false, error: 'Datos no válidos' }, { status: 400 });
  }

  try {
    const maridaje = await conBaseDeDatos((db) =>
      recomendarMaridaje(db, { consumerId: v.data.consumer_id, lineaActual: v.data.linea })
    );
    return NextResponse.json({ ok: true, maridaje });
  } catch (e) {
    // Sin proveedor de IA configurado, o el modelo tarda demasiado: es una
    // sugerencia, no el registro del momento. Fallar en silencio y dejar que
    // la pantalla del comensal siga con la pregunta manual de siempre.
    log.warn('No se pudo generar la sugerencia de maridaje', {
      ruta: '/api/moments/maridaje',
      detalle: String(e).slice(0, 200),
    });
    return NextResponse.json({ ok: false, error: 'No disponible' }, { status: 200 });
  }
});
