'use client';

/**
 * Cabecera de la tienda.
 *
 * Fija y mínima: logo, y el contador del carrito. En una web app la cabecera no
 * vende — orienta. Todo lo que no sea "dónde estoy" y "cómo llego a mi pedido"
 * ocupa sitio que en móvil no sobra.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCarrito } from './Carrito';

export default function Cabecera() {
  const { unidades } = useCarrito();
  const ruta = usePathname();

  const enPortada = ruta === '/';

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#12100e]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        {enPortada ? (
          <Link href="/" className="font-display text-xl font-bold text-[#f5f1ea]">
            Bocazo
          </Link>
        ) : (
          /* Fuera de la portada, el logo cede su sitio a "volver". En móvil el
             gesto de atrás existe, pero un botón visible evita que la gente
             salga de la web app sin querer. */
          <button
            type="button"
            onClick={() => history.back()}
            className="-ml-2 flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-[#c9bfb2] hover:text-[#f5f1ea]"
          >
            <span aria-hidden>←</span> Volver
          </button>
        )}

        <div className="flex items-center gap-1">
          <Link
            href="/cuenta"
            aria-label="Mi cuenta"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#f5f1ea]"
          >
            <span aria-hidden className="text-xl">👤</span>
          </Link>

        <Link
          href="/carrito"
          aria-label={`Carrito, ${unidades} ${unidades === 1 ? 'producto' : 'productos'}`}
          className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-[#f5f1ea]"
        >
          <span aria-hidden className="text-xl">🛒</span>
          {unidades > 0 && (
            <span className="absolute right-0 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d97325] px-1 text-xs font-bold text-[#12100e]">
              {unidades}
            </span>
          )}
        </Link>
        </div>
      </div>
    </header>
  );
}
