import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Checkout from '@/componentes/Checkout';
import Medir from '@/componentes/Medir';
import { COOKIE_MESA, deserializar } from '@/lib/mesa';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirmar pedido · Bocazo',
  // Un checkout no debe aparecer en Google: la URL sin carrito no lleva a nada
  // y gasta presupuesto de rastreo.
  robots: { index: false, follow: false },
};

export default async function PaginaCheckout() {
  const mesa = deserializar((await cookies()).get(COOKIE_MESA)?.value);

  return (
    <>
      <Medir evento="inicio_checkout" qrToken={mesa?.qrToken} />
      <Checkout mesa={mesa} />
    </>
  );
}
