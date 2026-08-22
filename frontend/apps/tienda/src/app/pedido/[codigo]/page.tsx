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
import Seguimiento from '@/componentes/Seguimiento';

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

  return <Seguimiento pedido={pedido} />;
}
