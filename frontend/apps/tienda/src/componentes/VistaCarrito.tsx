'use client';

/**
 * ============================================================================
 * El carrito
 * ============================================================================
 *
 * Regla que manda sobre esta pantalla: NUNCA ocultar un coste hasta el final.
 * El envío se enseña aquí, no en el checkout. Una sorpresa en la última
 * pantalla es la forma más eficaz de perder una compra ya decidida — y peor,
 * de que esa persona no vuelva.
 *
 * Por eso el desglose está completo desde el primer momento, incluso antes de
 * saber si es a domicilio o para recoger: se asume domicilio, que es el caso
 * caro, y si luego elige recoger el total baja. Sorprender a la baja no rompe
 * nada; a la subida, sí.
 */

import Image from 'next/image';
import Link from 'next/link';
import { unitarioDe, useCarrito } from './Carrito';
import { precio } from '@/lib/formato';
import { ENVIO_COP } from '@/lib/envio';

export default function VistaCarrito() {
  const { lineas, subtotalCOP, cambiarCantidad, quitar, cargado } = useCarrito();

  // Mientras se lee localStorage no se pinta nada: enseñar "está vacío" durante
  // un instante y luego el contenido se lee como un error.
  if (!cargado) return null;

  if (lineas.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-5xl" aria-hidden>
          🛒
        </p>
        <h1 className="font-display mt-5 text-2xl font-bold text-[#f5f1ea]">
          Tu pedido está vacío
        </h1>
        <p className="mt-2 text-[#8f8479]">Elige un sabor y aparece aquí.</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d97325] px-8 font-semibold text-[#12100e]"
        >
          Ver los sabores
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-[#f5f1ea]">Tu pedido</h1>

      <ul className="mt-5 divide-y divide-white/10">
        {lineas.map((l) => (
          <li key={l.clave} className="flex gap-4 py-4">
            <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-[#12100e]">
              {l.imagen && (
                <Image
                  src={l.imagen}
                  alt={l.nombre}
                  fill
                  className="object-cover object-top"
                  sizes="80px"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display font-bold text-[#f5f1ea]">{l.nombre}</h2>
                <button
                  type="button"
                  onClick={() => quitar(l.clave)}
                  aria-label={`Quitar ${l.nombre}`}
                  className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8f8479] hover:text-[#f5f1ea]"
                >
                  ×
                </button>
              </div>

              {/* Las opciones elegidas se listan: quien pidió "intenso con queso
                  extra" tiene que poder comprobarlo sin volver a la ficha. */}
              {l.opciones.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {l.opciones.map((o) => (
                    <li key={o.id} className="text-xs text-[#8f8479]">
                      {o.etiqueta}
                      {o.sobreprecioCOP > 0 && ` · +${precio(o.sobreprecioCOP)}`}
                    </li>
                  ))}
                </ul>
              )}

              {l.notas && (
                <p className="mt-1 text-xs italic text-[#8f8479]">«{l.notas}»</p>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-full border border-white/15">
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(l.clave, l.cantidad - 1)}
                    aria-label={`Quitar uno de ${l.nombre}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-[#f5f1ea]"
                  >
                    −
                  </button>
                  <span className="cifras w-6 text-center text-sm font-bold text-[#f5f1ea]">
                    {l.cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(l.clave, l.cantidad + 1)}
                    disabled={l.cantidad >= 20}
                    aria-label={`Añadir uno de ${l.nombre}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-[#f5f1ea] disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <span className="font-display font-bold text-[#f5f1ea]">
                  {precio(unitarioDe(l) * l.cantidad)}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* --- Desglose completo, sin sorpresas --- */}
      <dl className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-[#1c1812] p-5">
        <div className="flex justify-between text-[#c9bfb2]">
          <dt>Productos</dt>
          <dd>{precio(subtotalCOP)}</dd>
        </div>
        <div className="flex justify-between text-[#c9bfb2]">
          <dt>Domicilio</dt>
          <dd>{precio(ENVIO_COP)}</dd>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold text-[#f5f1ea]">
          <dt>Total</dt>
          <dd className="font-display">{precio(subtotalCOP + ENVIO_COP)}</dd>
        </div>
        <p className="pt-1 text-xs text-[#8f8479]">
          Si prefieres recogerlo en el local, el domicilio no se cobra. Se elige en el
          siguiente paso.
        </p>
      </dl>

      <Link
        href="/"
        className="mt-5 block text-center text-sm text-[#8f8479] underline underline-offset-4"
      >
        Seguir añadiendo
      </Link>
    </div>
  );
}
