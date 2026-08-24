/**
 * Seguimiento del pedido.
 *
 * Es la pantalla que convierte "pedido #1245" en una experiencia. La diferencia
 * entre las dos cosas es si la persona sabe qué está pasando ahora mismo o solo
 * tiene un número.
 *
 * Dinámica siempre: el estado cambia cada pocos minutos y una versión cacheada
 * enseñaría "en preparación" cuando ya está en la puerta.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pedidoPorCodigo } from '@/lib/consultas';
import { ultimoPago } from '@/lib/cobros';
import { pasaPorWompi } from '@/lib/wompi';
import Seguimiento from '@/componentes/Seguimiento';
import { AvisosPush } from '@/componentes/AvisosPush';
import { variableDeEntorno } from '@/lib/cloudflare';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu pedido · Bocazo',
  robots: { index: false, follow: false },
};

export default async function PaginaPedido({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const pedido = await pedidoPorCodigo(codigo);

  if (!pedido) notFound();

  // El ultimo intento de pago, para poder explicar por que fallo y ofrecer
  // reintentar sin rehacer el pedido.
  const pago = await ultimoPago(codigo);

  return (
    <>
      <Seguimiento
        pedido={pedido}
        urlGoogle={(await variableDeEntorno('GOOGLE_RESENAS_URL')) || undefined}
        pago={{
          mensajeFallo: pago?.mensaje ?? null,
          enLinea: pasaPorWompi(pedido.metodoPago),
        }}
      />

      {/*
        El disparador organico. Acaba de pedir y esta mirando el estado: es el
        unico momento en que "te avisamos cuando este listo" se entiende sin
        explicar nada. Preguntarlo al entrar a la tienda seria gastar el permiso
        —que solo se pide una vez en la vida— antes de que sepa para que sirve.
      */}
      <AvisosPush motivo="pedido" />
    </>
  );
}
