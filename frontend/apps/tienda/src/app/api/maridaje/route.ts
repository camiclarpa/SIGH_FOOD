// =============================================================================
// Maridaje: qué beber con lo que estás comiendo
// =============================================================================
//
// Se pide desde el navegador y no se calcula al pintar la página a propósito:
// la llamada al proveedor de IA tarda uno o dos segundos, y bloquear el
// renderizado de la ficha del producto por un adorno haría más lento justo el
// camino de compra que se intenta acelerar.
//
// SOLO PARA QUIEN ESTÁ EN LA MESA. Ver el comentario en lib/maridaje.ts: a
// domicilio la sugerencia no se puede cumplir.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { productos } from '@sighfood/domain/db/schema';
import { conBaseDeDatos } from '@/lib/cloudflare';
import { COOKIE_MESA, deserializar } from '@/lib/mesa';
import { maridajePara } from '@/lib/maridaje';

export const dynamic = 'force-dynamic';

const esquema = z.object({
  slug: z.string().min(1).max(120),
  paladar: z.record(z.string().max(40), z.string().max(40)).optional(),
});

export async function POST(request: NextRequest) {
  // 204 y no 4xx cuando no aplica: para el navegador esto es opcional, y un
  // error rojo en la consola por una tarjeta que no se pinta asusta sin motivo.
  const nada = new NextResponse(null, { status: 204 });

  const mesa = deserializar(request.cookies.get(COOKIE_MESA)?.value);
  if (!mesa) return nada;

  const v = esquema.safeParse(await request.json().catch(() => null));
  if (!v.success) return nada;

  // El nombre y la descripción se leen de la BASE, no de lo que manda el
  // cliente: si se aceptara el texto enviado, cualquiera podría inyectar sus
  // propias instrucciones en el prompt.
  const producto = await conBaseDeDatos(async (db) => {
    const [p] = await db
      .select({ nombre: productos.nombre, descripcion: productos.descripcion })
      .from(productos)
      .where(and(eq(productos.slug, v.data.slug), eq(productos.activo, true)))
      .limit(1);
    return p;
  });

  if (!producto) return nada;

  const sugerencia = await maridajePara({
    producto: producto.nombre,
    descripcion: producto.descripcion,
    paladar: v.data.paladar,
  });

  if (!sugerencia) return nada;

  return NextResponse.json(sugerencia);
}
