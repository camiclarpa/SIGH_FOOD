import Image from 'next/image';
import Link from 'next/link';
import type { ProductoTienda } from '@/lib/consultas';
import { precio } from '@/lib/formato';

/**
 * Tarjeta del catálogo.
 *
 * Toda la tarjeta es un enlace a la ficha, no solo el nombre: en móvil, apuntar
 * a un texto de dos palabras con el pulgar falla más de lo que parece.
 *
 * Lo agotado se ve, en gris y sin poder pedirse. Esconderlo haría que quien
 * viene buscando su sabor de siempre asuma que ya no existe y se vaya, en lugar
 * de pedir otro hoy y volver mañana.
 */
export default function TarjetaProducto({ producto: p }: { producto: ProductoTienda }) {
  const agotado = !p.disponible;

  const contenido = (
    <article
      className={`group flex h-full overflow-hidden rounded-2xl border border-white/10 bg-[#1c1812] transition-colors ${
        agotado ? 'opacity-55' : 'hover:border-[#d97325]/40'
      }`}
    >
      <div className="relative aspect-square w-28 shrink-0 bg-[#12100e] sm:w-32">
        {p.imagen && (
          <Image
            src={p.imagen}
            alt={p.nombre}
            fill
            className="object-cover object-top"
            sizes="128px"
          />
        )}
        {agotado && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#12100e]/70">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#f5f1ea]">
              Agotado
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display text-lg font-bold leading-tight text-[#f5f1ea]">
            {p.nombre}
          </h2>
          {p.intensidad === 3 && (
            <span className="shrink-0 text-sm" title="Pica de verdad" aria-label="Pica de verdad">
              🔥
            </span>
          )}
        </div>

        {p.gancho && (
          <p className="mt-1 line-clamp-2 text-sm text-[#c9bfb2]">{p.gancho}</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-display text-lg font-bold text-[#f5f1ea]">
            {precio(p.precioCOP)}
          </span>
          {!agotado && (
            <span className="rounded-full bg-[#d97325] px-4 py-2 text-sm font-semibold text-[#12100e]">
              Pedir
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (agotado) return contenido;

  return (
    <Link href={`/producto/${p.slug}`} className="block h-full">
      {contenido}
    </Link>
  );
}
