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
import { BOX, CONOS, FAMILIAS, FICHA, enlaceWhatsApp, precio } from './datos';

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

        {/*
          Qué te llevas por ese dinero.

          Va ANTES de ver el precio en las tarjetas, no después. A 32.000 pesos
          por algo que nadie ha visto en persona, la duda no suele ser "es caro"
          sino "¿cuánto es?" y "¿de qué tamaño?". Contestarlo aquí evita que el
          precio aterrice sobre un vacío.
        */}
        <dl className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-6 rounded-2xl border border-white/10 bg-[#1c1812] p-6 text-center sm:grid-cols-4 sm:p-7">
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#8f8479]">Tamaño</dt>
            <dd className="font-display mt-1.5 text-xl font-bold text-[#f5f1ea]">{FICHA.altura}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#8f8479]">Peso</dt>
            <dd className="font-display mt-1.5 text-xl font-bold text-[#f5f1ea]">
              {FICHA.pesoGramos} g
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#8f8479]">Listo en</dt>
            <dd className="font-display mt-1.5 text-xl font-bold text-[#f5f1ea]">
              {FICHA.minutosPreparacion} min
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#8f8479]">Relleno</dt>
            <dd className="font-display mt-1.5 text-xl font-bold text-[#f5f1ea]">Al momento</dd>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-sm text-[#c9bfb2]">{FICHA.equivalencia}</p>
          </div>
        </dl>

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

                {/* "Va bien con" y no "lleva": el cono NO tiene alcohol, y sin
                    esa distinción el maridaje se lee como ingrediente. Es una
                    objeción silenciosa — quien no bebe, o va con niños, se va
                    sin preguntar. */}
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

        {/*
          El producto de entrada.

          Antes esto ofrecía los cinco al mismo precio que sueltos, así que no
          daba ninguna razón para elegirlo. Con descuento sí: baja la barrera de
          la primera compra y hace que la primera experiencia sea con los cinco
          sabores en vez de con uno — que es lo que engancha y lo que hace que
          vuelvan a por "el suyo".

          El precio tachado va al lado del bueno porque el ahorro solo existe si
          se ve la comparación.
        */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-[#d97325]/40 bg-gradient-to-br from-[#d97325]/12 to-transparent p-8 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div className="text-center lg:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
                Para la primera vez
              </p>

              <h3 className="font-display mt-3 text-2xl font-bold text-[#f5f1ea] sm:text-3xl">
                {BOX.nombre}: los cinco sabores
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-[#c9bfb2] lg:mx-0">
                Es lo que hace casi todo el mundo la primera vez: se piden los cinco,
                se reparten y cada quien descubre el suyo. Después ya vienen a por ese.
              </p>

              <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-[#c9bfb2] lg:justify-start">
                {CONOS.map((c) => (
                  <li key={c.id} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d97325]" />
                    {c.corto}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center lg:w-60">
              <p className="text-sm text-[#8f8479]">
                <s>{precio(BOX.precioSueltoCOP)}</s> sueltos
              </p>
              <p className="font-display text-4xl font-bold text-[#f5f1ea]">
                {precio(BOX.precioCOP)}
              </p>
              <p className="mt-1 text-sm font-medium text-[#d97325]">
                ahorras {precio(BOX.precioSueltoCOP - BOX.precioCOP)}
              </p>

              <a
                href={enlaceWhatsApp(`Hola, quiero el ${BOX.nombre} con los cinco sabores.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#d97325] px-8 py-4 text-base font-semibold text-[#12100e] shadow-lg shadow-[#d97325]/20 transition-all hover:scale-[1.02] hover:bg-[#e8892f] active:scale-100"
              >
                Quiero el box
              </a>
            </div>
          </div>
        </div>

        {/* El aviso del alcohol cierra la sección: es la última duda que queda
            después de haber leído cinco maridajes con licor. */}
        <p className="mt-8 text-center text-sm text-[#8f8479]">
          Los licores son <span className="text-[#c9bfb2]">maridajes sugeridos</span>.
          Ningún cono lleva alcohol.
        </p>
      </div>
    </section>
  );
}
