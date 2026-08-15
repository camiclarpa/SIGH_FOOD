import { NextRequest, NextResponse } from 'next/server';
import { recommendProducts } from '@/lib/ai/services/groq-service';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { log, conTrazas } from '@sighfood/domain/lib/observabilidad';
import { b2cConsumers } from '@sighfood/domain/db/schema';
import { eq } from 'drizzle-orm';

export const POST = conTrazas('/api/recommendations', async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { consumerId } = body;

    if (!consumerId) {
      return NextResponse.json(
        { success: false, error: 'consumerId es requerido' },
        { status: 400 }
      );
    }

    return await conBaseDeDatos(async (db) => {
      const consumer = await db.select()
        .from(b2cConsumers)
        .where(eq(b2cConsumers.id, consumerId))
        .limit(1);

      if (!consumer[0]) {
        return NextResponse.json(
          { success: false, error: 'Consumidor no encontrado' },
          { status: 404 }
        );
      }

      const consumerData = consumer[0];

      const recommendations = await recommendProducts({
        purchaseHistory: 'historial reciente',
        flavorPreferences: JSON.stringify(consumerData.flavorPreference || {}),
        establishmentType: 'restaurante',
        currentSeason: 'actual',
      });

      return NextResponse.json({ success: true, data: recommendations });
    });

  } catch (error) {
    log.error('Error en recomendaciones', error, { ruta: '/api/recommendations' });
    return NextResponse.json(
      { success: false, error: 'Error en recomendaciones' },
      { status: 500 }
    );
  }
});
