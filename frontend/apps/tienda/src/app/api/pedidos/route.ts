// =============================================================================
// API de pedidos
// =============================================================================
//
// Endpoint público: lo llama el checkout sin sesión, porque exigir registro
// antes de comprar pierde la mitad de las compras.
//
// Ser público obliga a dos cosas, y las dos están hechas:
//
//   · La entrada se valida con Zod antes de tocar la base.
//   · Los precios NO se leen de aquí. El cuerpo dice qué producto y qué
//     opciones; los importes los vuelve a leer crearPedido() de la base. Sin
//     eso, bastaría con editar la petición para pedir cinco conos a mil pesos.
//
// El límite de peticiones lo aplica el binding de Cloudflare declarado en
// wrangler.jsonc, en el borde y compartido entre isolates.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { crearPedido } from '@/lib/pedidos';
import { enviarComprobante } from '@/lib/avisos';
import { registrar } from '@/lib/medicion';
import { contextoCloudflare } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

// Cada mensaje va escrito en español y en primera persona del negocio, porque
// se enseña TAL CUAL en el checkout. Los de Zod por defecto salen en inglés y
// en jerga —"Too small: expected string to have >=2 characters"—, que es lo
// último que quiere leer alguien a punto de pagar.
const esquema = z.object({
  nombre: z.string({ error: 'Falta tu nombre' }).min(2, 'El nombre es muy corto').max(150),
  telefono: z
    .string({ error: 'Falta tu teléfono' })
    .min(7, 'El teléfono es muy corto')
    .max(30, 'El teléfono es muy largo'),
  tipoEntrega: z.enum(['domicilio', 'recoger', 'mesa'], {
    error: 'Elige cómo lo quieres recibir',
  }),
  /** Token del QR de la mesa. Se revalida en el servidor, nunca se cree. */
  qrToken: z.string().max(255).optional(),
  /** Perfil de paladar del cuestionario, si lo respondió. */
  paladar: z.record(z.string().max(40), z.string().max(40)).optional(),
  direccion: z.string().max(255, 'La dirección es muy larga').optional(),
  indicaciones: z.string().max(255).optional(),
  metodoPago: z.enum(['efectivo', 'nequi', 'daviplata', 'tarjeta', 'pse', 'transferencia'], {
    error: 'Elige cómo vas a pagar',
  }),
  propinaCOP: z.number().int().min(0).max(200_000).optional(),
  notas: z.string().max(1000).optional(),
  lineas: z
    .array(
      z.object({
        slug: z.string().min(1).max(120),
        cantidad: z
          .number()
          .int('La cantidad debe ser un número entero')
          .min(1, 'La cantidad mínima es 1')
          .max(20, 'Máximo 20 unidades del mismo producto'),
        opcionIds: z.array(z.string().uuid()).max(20).default([]),
        notas: z.string().max(255).optional(),
      })
    )
    .min(1, 'Tu carrito está vacío')
    .max(30, 'Demasiados productos en un solo pedido'),
});

export async function POST(request: NextRequest) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Petición ilegible' }, { status: 400 });
  }

  const v = esquema.safeParse(cuerpo);
  if (!v.success) {
    return NextResponse.json(
      { ok: false, error: v.error.issues[0]?.message ?? 'Datos incompletos' },
      { status: 400 }
    );
  }

  try {
    const r = await crearPedido(v.data);

    // Los errores de crearPedido están escritos para leerse en el checkout
    // ("Spicy Volcano se acaba de agotar"), así que se devuelven tal cual.
    if (!r.ok) return NextResponse.json(r, { status: 409 });

    // El comprobante y la medicion van DESPUES de responder, en waitUntil: el
    // pedido ya esta guardado y hacer esperar a la persona por un mensaje de
    // WhatsApp seria cobrarle latencia por una cortesia.
    const base = new URL(request.url).origin;
    const despues = Promise.allSettled([
      enviarComprobante({
        telefono: v.data.telefono,
        codigo: r.codigo,
        lineas: r.lineas,
        totalCOP: r.totalCOP,
        tipoEntrega: v.data.tipoEntrega,
        url: `${base}/pedido/${r.codigo}`,
      }),
      registrar({
        evento: 'pago',
        sesionAnonima: request.headers.get('x-sesion-anonima') ?? 'sin-sesion',
        valorCOP: r.totalCOP,
      }),
    ]);

    const { ctx } = await contextoCloudflare();
    if (ctx?.waitUntil) ctx.waitUntil(despues);

    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    // Aquí sí se oculta el detalle: un error de base de datos no le dice nada
    // útil a quien está comprando y sí a quien esté sondeando.
    console.error('Error creando pedido', e);
    return NextResponse.json(
      { ok: false, error: 'No pudimos registrar tu pedido. Inténtalo otra vez.' },
      { status: 500 }
    );
  }
}
