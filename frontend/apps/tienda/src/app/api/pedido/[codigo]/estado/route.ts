// =============================================================================
// El estado de un pedido, en pequeño
// =============================================================================
//
// Existe para que la pantalla de seguimiento pueda preguntar "¿ha cambiado
// algo?" muchas veces sin coste.
//
// POR QUÉ NO SE USA router.refresh() A SECAS
// ------------------------------------------
// La página de seguimiento ya lo hacía, cada 30 segundos. Dos problemas:
//
//   · 30 segundos es una eternidad viendo una pantalla que dice "se actualiza
//     sola". La cocina marca "listo" y el cliente sigue leyendo "preparando"
//     medio minuto. Parece roto, y recargar a mano da la razón a esa impresión.
//
//   · Bajarlo a 5 segundos con router.refresh() significaría volver a pedir la
//     página entera —con sus productos, su pago y su HTML— doce veces por
//     minuto y por cliente, para descubrir casi siempre que nada cambió.
//
// Esto devuelve dos campos. La pantalla lo consulta a menudo y solo pide la
// página completa cuando el estado ha cambiado de verdad.
//
// NO EXIGE SESIÓN, IGUAL QUE LA PÁGINA
// ------------------------------------
// Quien conozca el código del pedido puede ver en qué paso va, exactamente como
// ya ocurre con /pedido/<codigo> — el enlace se manda por WhatsApp y tiene que
// funcionar sin iniciar sesión. Por eso aquí solo salen el estado y el del
// cobro: ni teléfono, ni dirección, ni nombre. Un código adivinado no revela
// nada de nadie.

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { pedidos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const { codigo } = await params;

  // El código son letras y números con un guion. Validarlo antes de consultar
  // evita convertir esto en un sondeo barato de la base.
  if (!/^[A-Za-z0-9-]{4,20}$/.test(codigo)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const [pedido] = await conBaseDeDatos((db) =>
    db
      .select({ estado: pedidos.estado, estadoPago: pedidos.estadoPago })
      .from(pedidos)
      .where(eq(pedidos.codigo, codigo.toUpperCase()))
      .limit(1)
  );

  if (!pedido) return NextResponse.json({ ok: false }, { status: 404 });

  return NextResponse.json(
    { ok: true, estado: pedido.estado, estadoPago: pedido.estadoPago },
    // Sin caché: es el dato que cambia, y servirlo de una copia es justo el
    // fallo que esto viene a resolver.
    { headers: { 'cache-control': 'no-store' } }
  );
}
