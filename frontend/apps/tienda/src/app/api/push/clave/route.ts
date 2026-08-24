// =============================================================================
// La clave pública de Web Push
// =============================================================================
//
// Es pública de verdad: su único propósito es viajar al navegador de cada
// visitante. No hay nada que proteger aquí — con ella no se puede mandar una
// notificación, solo recibirla.
//
// POR QUÉ UN ENDPOINT Y NO UNA VARIABLE INCRUSTADA
// ------------------------------------------------
// Antes se pasaba como `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Next incrusta esas
// variables AL COMPILAR, leyendo .env.local o .env.production; este proyecto
// guarda su configuración en .env.development.local —para que los secretos no
// acaben dentro del paquete— y Next no lee ese archivo en una compilación de
// producción.
//
// Resultado: la clave quedaba en `undefined`, el componente de avisos salía sin
// pintar nada, nadie se suscribía nunca, y no había ni un error en ningún
// registro. El síntoma era "las notificaciones no se activan" y no apuntaba a
// ninguna parte.
//
// Servida desde aquí se puede COMPROBAR desde fuera con una petición, que es
// justo lo que faltaba. Y se lee en ejecución, así que no depende de cómo se
// compiló.

import { NextResponse } from 'next/server';
import { variableDeEntorno } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clave = (await variableDeEntorno('VAPID_PUBLIC_KEY'))?.trim();

  if (!clave) {
    // 503 y no 404: la ruta existe, lo que falta es la configuración. Un 404
    // haría buscar el error en el sitio equivocado.
    return NextResponse.json(
      {
        ok: false,
        error:
          'Falta VAPID_PUBLIC_KEY en el Worker de la tienda. Se genera con ' +
          '`node scripts/configurar-push.mjs` desde apps/web.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { ok: true, clave },
    {
      // Cacheable: la clave no cambia nunca —rotarla invalidaría todas las
      // suscripciones existentes— así que no tiene sentido volver a pedirla en
      // cada visita.
      headers: { 'cache-control': 'public, max-age=3600' },
    }
  );
}
