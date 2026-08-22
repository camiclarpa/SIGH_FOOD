import type { Metadata } from 'next';
import VistaCarrito from '@/componentes/VistaCarrito';

export const metadata: Metadata = { title: 'Tu pedido · Bocazo' };

export default function PaginaCarrito() {
  return <VistaCarrito />;
}
