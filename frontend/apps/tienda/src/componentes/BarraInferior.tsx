'use client';

/**
 * Barra inferior con el total y el paso siguiente.
 *
 * Es el elemento que más diferencia una tienda de una landing: el camino a la
 * caja está SIEMPRE a la vista, no al final de un scroll. Quien añade algo ve
 * el total cambiar sin moverse, y eso hace dos cosas — confirma que se guardó,
 * y recuerda cuánto lleva.
 *
 * Se esconde en el checkout y en el seguimiento: allí ya hay un botón principal
 * propio y dos compiten entre sí.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCarrito } from './Carrito';
import { precio } from '@/lib/formato';

const OCULTA_EN = ['/checkout', '/pedido'];

export default function BarraInferior() {
  const { unidades, subtotalCOP, cargado } = useCarrito();
  const ruta = usePathname();

  if (!cargado || unidades === 0) return null;
  if (OCULTA_EN.some((r) => ruta.startsWith(r))) return null;

  const enCarrito = ruta === '/carrito';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#12100e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#8f8479]">
            {unidades} {unidades === 1 ? 'producto' : 'productos'}
          </p>
          <p className="font-display text-xl font-bold text-[#f5f1ea]">{precio(subtotalCOP)}</p>
        </div>

        <Link
          href={enCarrito ? '/checkout' : '/carrito'}
          className="flex min-h-12 items-center justify-center rounded-full bg-[#d97325] px-7 font-semibold text-[#12100e] transition-transform active:scale-[0.98]"
        >
          {enCarrito ? 'Continuar' : 'Ver pedido'}
        </Link>
      </div>
    </div>
  );
}
