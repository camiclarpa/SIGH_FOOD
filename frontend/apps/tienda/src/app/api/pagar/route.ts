// Inicia el cobro de un pedido y devuelve a donde mandar a la persona.
//
// Publico: lo llama quien acaba de pedir, sin sesion. El codigo del pedido es
// la llave, y es lo que esa persona ya tiene. El importe NO viene de aqui: se
// lee del pedido en el servidor.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { iniciarPago } from '@/lib/cobros';

export const dynamic = 'force-dynamic';

const esquema = z.object({ codigo: z.string().min(4).max(12) });

export async function POST(request: NextRequest) {
  const v = esquema.safeParse(await request.json().catch(() => null));
  if (!v.success) {
    return NextResponse.json({ ok: false, error: 'Pedido no valido' }, { status: 400 });
  }

  try {
    const base = new URL(request.url).origin;
    const r = await iniciarPago({
      codigoPedido: v.data.codigo,
      // A donde vuelve tras pagar. Wompi anade ?id= con la transaccion, pero la
      // confirmacion buena llega por el webhook: esta pantalla solo informa.
      urlRetorno: `${base}/pedido/${v.data.codigo.toUpperCase()}`,
    });

    return NextResponse.json(r, { status: r.ok ? 200 : 409 });
  } catch (e) {
    console.error('Error iniciando el pago', e);
    return NextResponse.json(
      { ok: false, error: 'No pudimos iniciar el pago. Intentalo otra vez.' },
      { status: 500 }
    );
  }
}
