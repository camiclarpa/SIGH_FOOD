// =============================================================================
// SIGH_FOOD - IA de experiencia del comensal
// Endpoint: POST /api/ai/comensal
// =============================================================================
//
// Las tres capacidades del módulo 5, en un solo endpoint por acción:
//
//   maridaje    — qué beber con lo que está probando ahora mismo.
//   resena      — analizar un comentario y detectar fallos de producción.
//   promocion   — incentivo personalizado para recuperar a quien se está yendo.
//   alertas     — reseñas marcadas como posible fallo, sin revisar.

import { NextRequest, NextResponse } from 'next/server';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { conBaseDeDatos } from '@/lib/cloudflare';
import {
  alertasDeCalidad,
  analizarResena,
  promocionPersonalizada,
  recomendarMaridaje,
} from '@/lib/ai/comensal';

export const POST = conTrazas('/api/ai/comensal', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action, data } = body ?? {};

    if (action === 'maridaje') {
      if (!data?.consumerId || !data?.lineaActual) {
        return NextResponse.json(
          { success: false, error: 'Se requieren consumerId y lineaActual' },
          { status: 400 }
        );
      }
      const maridaje = await conBaseDeDatos((db) =>
        recomendarMaridaje(db, { consumerId: data.consumerId, lineaActual: data.lineaActual })
      );
      return NextResponse.json({ success: true, maridaje });
    }

    if (action === 'resena') {
      if (!data?.reviewId) {
        return NextResponse.json({ success: false, error: 'Se requiere reviewId' }, { status: 400 });
      }
      const analisis = await conBaseDeDatos((db) => analizarResena(db, data.reviewId));
      if (!analisis) {
        return NextResponse.json(
          { success: false, error: 'La reseña no existe o no tiene comentario que analizar' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, analisis });
    }

    if (action === 'promocion') {
      if (!data?.consumerId) {
        return NextResponse.json({ success: false, error: 'Se requiere consumerId' }, { status: 400 });
      }
      const promocion = await conBaseDeDatos((db) => promocionPersonalizada(db, data.consumerId));
      if (!promocion) {
        return NextResponse.json({ success: false, error: 'Comensal no encontrado' }, { status: 404 });
      }
      // La promoción se DEVUELVE, no se envía. Mandar un mensaje a una persona
      // real es una decisión que toma alguien, no un endpoint de análisis.
      return NextResponse.json({ success: true, promocion, enviado: false });
    }

    if (action === 'alertas') {
      const alertas = await conBaseDeDatos((db) => alertasDeCalidad(db, data?.limite ?? 20));
      return NextResponse.json({ success: true, alertas });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Action not recognized',
        disponibles: ['maridaje', 'resena', 'promocion', 'alertas'],
      },
      { status: 400 }
    );
  } catch (error) {
    log.error('Error en IA de comensal', error, { ruta: '/api/ai/comensal' });
    return NextResponse.json(
      {
        success: false,
        error: 'Error en IA de comensal',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
});
