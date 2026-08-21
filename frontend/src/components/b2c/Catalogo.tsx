'use client';

/**
 * ============================================================================
 * Los cinco conos — producto y oferta en un solo bloque
 * ============================================================================
 *
 * Aquí se decide la compra, así que producto, precio y botón van juntos. La
 * estructura clásica los separa —primero el producto, mucho más abajo el
 * precio— y eso obliga a subir y bajar para comparar. Cada viaje de esos pierde
 * gente.
 *
 * Decisiones:
 *
 *   · Cada tarjeta tiene su propio botón de pedir, con el sabor ya escrito en
 *     el mensaje de WhatsApp. Quien decide viendo el Volcano no debería tener
 *     que escribir cuál quiere.
 *
 *   · El filtro por familia existe porque la primera pregunta real de la gente
 *     es "¿son dulces o salados?". Contestarla aquí evita que se vaya a
 *     buscarlo a la sección de preguntas.
 *
 *   · Todos valen lo mismo, y se dice. Un precio único elimina el cálculo
 *     mental de "¿cuál me sale mejor?" y deja la decisión donde tiene que
 *     estar: en cuál te apetece.
 *
 *   · La foto crece un poco al pasar el ratón. Es el único movimiento de la
 *     sección y sirve para señalar que la tarjeta entera es tocable.
 */

import Image from 'next/image';
import { useState } from 'react';
import { CONOS, FAMILIAS, enlaceWhatsApp, precio } from './datos';

type Familia = (typeof FAMILIAS)[number]['id'];

export default function Catalogo() {
  const [familia, setFamilia] = useState<Familia>('todos');

  const visibles = familia === 'todos' ? CONOS : CONOS.filter((c) => c.familia === familia);

  return (
    <section id="sabores" className="bg-[#17140f] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        {/* --- Cabecera --- */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
            El catálogo completo
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
            Cinco conos. Ninguno se parece al otro.
          </h2>
          <p className="mt-5 text-lg text-[#c9bfb2]">
            Todos a <span className="font-semibold text-[#f5f1ea]">{precio(CONOS[0].precioCOP)}</span>.
            El mismo precio para los cinco, así solo tienes que decidir cuál te apetece.
          </p>
        </div>

        {/* --- Filtro --- */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {FAMILIAS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamilia(f.id)}
              aria-pressed={familia === f.id}
              // 44 px de alto: el filtro se usa con el pulgar y a 38 px se falla.
              className={`min-h-11 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                familia === f.id
                  ? 'bg-[#d97325] text-[#12100e]'
                  : 'border border-white/15 text-[#c9bfb2] hover:border-white/30 hover:text-[#f5f1ea]'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>

        {/* --- Tarjetas --- */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((c) => (
            <article
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1c1812] transition-colors hover:border-[#d97325]/40"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#12100e]">
                <Image
                  src={c.imagen}
                  alt={`Cono ${c.nombre}`}
                  fill
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                  placeholder="blur"
                  blurDataURL={c.marcador}
                />

                {/* El gancho va sobre la foto: se lee en el mismo golpe de
                    vista que la imagen, que es cuando decide el antojo. */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1c1812] via-[#1c1812]/85 to-transparent p-5 pt-16">
                  <p className="font-display text-lg font-semibold leading-snug text-[#f5f1ea]">
                    {c.gancho}
                  </p>
                </div>

                {c.intensidad === 3 && (
                  <span className="absolute right-4 top-4 rounded-full bg-[#12100e]/80 px-3 py-1 text-xs font-medium text-[#e8892f] backdrop-blur-sm">
                    Pica de verdad
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-xl font-bold text-[#f5f1ea]">{c.nombre}</h3>

                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#c9bfb2]">
                  {c.descripcion}
                </p>

                {/* Las notas son lo que se nota al morder, en orden. Dicen a
                    qué sabe mejor que cualquier adjetivo. */}
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {c.notas.map((n) => (
                    <li
                      key={n}
                      className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-[#a89b8c]"
                    >
                      {n}
                    </li>
                  ))}
                </ul>

                <p className="mt-4 text-xs text-[#8f8479]">
                  Va bien con{' '}
                  <span className="text-[#c9bfb2]">{c.maridaje.join(' o ')}</span>
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
                  <span className="font-display text-2xl font-bold text-[#f5f1ea]">
                    {precio(c.precioCOP)}
                  </span>

                  <a
                    href={enlaceWhatsApp(`Hola, quiero un cono ${c.nombre}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#d97325] px-5 py-2.5 text-sm font-semibold text-[#12100e] transition-all hover:scale-[1.03] hover:bg-[#e8892f] active:scale-100"
                  >
                    Lo quiero
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* --- Empujón para llevarse varios --- */}
        <div className="mt-14 rounded-2xl border border-[#d97325]/30 bg-gradient-to-br from-[#d97325]/10 to-transparent p-8 text-center sm:p-10">
          <h3 className="font-display text-2xl font-bold text-[#f5f1ea] sm:text-3xl">
            ¿No sabes cuál? Llévate los cinco.
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-[#c9bfb2]">
            Es lo que hace casi todo el mundo la primera vez: se piden los cinco,
            se reparten y cada quien descubre el suyo. Después ya vienen a por
            ese.
          </p>
          <a
            href={enlaceWhatsApp('Hola, quiero pedir los cinco conos para compartir.')}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center justify-center rounded-full bg-[#d97325] px-8 py-4 text-base font-semibold text-[#12100e] shadow-lg shadow-[#d97325]/20 transition-all hover:scale-[1.02] hover:bg-[#e8892f] active:scale-100"
          >
            Pedir los cinco · {precio(CONOS[0].precioCOP * 5)}
          </a>
        </div>
      </div>
    </section>
  );
}
