import type { Metadata } from 'next';
import Checkout from '@/componentes/Checkout';

export const metadata: Metadata = {
  title: 'Confirmar pedido · Bocazo',
  // Un checkout no debe aparecer en Google: la URL sin carrito no lleva a nada
  // y gasta presupuesto de rastreo.
  robots: { index: false, follow: false },
};

export default function PaginaCheckout() {
  return <Checkout />;
}
