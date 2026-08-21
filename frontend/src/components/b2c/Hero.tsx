'use client';

/**
 * ============================================================================
 * Hero
 * ============================================================================
 *
 * La sección que decide si la persona se queda. Tiene entre tres y cinco
 * segundos para responder: qué es, para quién, por qué este y qué hago ahora.
 *
 * Decisiones que la gobiernan:
 *
 *   · La foto manda. En comida, la imagen no decora: es el argumento. Ocupa la
 *     mitad de la pantalla en escritorio y el fondo entero en móvil, y el texto
 *     vive encima de un degradado para que se lea sin taparla.
 *
 *   · Los conos rotan solos cada seis segundos. Es la forma más barata de decir
 *     "hay cinco y todos se ven así de bien" sin que nadie tenga que bajar. La
 *     rotación se detiene en cuanto la persona toca un punto: a partir de ahí
 *     manda ella, no la animación.
 *
 *   · La rotación respeta prefers-reduced-motion. Para quien marca esa
 *     preferencia, un carrusel que se mueve solo no es un detalle: puede ser
 *     mareo real.
 *
 *   · Solo la primera foto lleva priority. Las otras cuatro se precargan con
 *     calma, porque la que decide el LCP es la primera.
 */

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { CONOS, enlaceWhatsApp, precio } from './datos';

const CADA_MS = 6000;

export default function Hero() {
  const [activo, setActivo] = useState(0);
  const [manual, setManual] = useState(false);

  const elegir = useCallback((i: number) => {
    setActivo(i);
    setManual(true);
  }, []);

  useEffect(() => {
    if (manual) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reduce?.matches) return;

    const t = setInterval(() => setActivo((i) => (i + 1) % CONOS.length), CADA_MS);
    return () => clearInterval(t);
  }, [manual]);

  const cono = CONOS[activo];

  return (
    <section
      id="inicio"
      className="relative flex min-h-[100svh] items-end overflow-hidden bg-[#12100e] lg:items-center"
    >
      {/* --- Fotografía --- */}
      <div className="absolute inset-0 lg:left-[42%]">
        {CONOS.map((c, i) => (
          <Image
            key={c.id}
            src={c.imagen}
            alt={`Cono ${c.nombre} de Bocazo`}
            fill
            // La foto se recorta hacia arriba: el cono está en la parte
            // superior del encuadre y es lo que no se puede perder.
            className={`object-cover object-top transition-opacity duration-1000 ${
              i === activo ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(min-width: 1024px) 58vw, 100vw"
            priority={i === 0}
            placeholder="blur"
            blurDataURL={c.marcador}
          />
        ))}

        {/* Degradados: el texto tiene que leerse sin apagar la foto. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12100e] via-[#12100e]/70 to-transparent lg:bg-gradient-to-r lg:from-[#12100e] lg:via-[#12100e]/60 lg:to-transparent" />
      </div>

      {/* --- Texto --- */}
      {/* El pt deja sitio al encabezado fijo. En portátiles de 768 px de alto
          —los más vendidos— se recorta para que el botón principal y el
          selector de sabores quepan en el primer pantallazo. */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-28 sm:px-8 lg:pb-14 lg:pt-24">
        <div className="max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d97325]/40 bg-[#d97325]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#e8a05f]">
            Cinco sabores · {MARCA_CIUDAD}
          </p>

          <h1 className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-[#f5f1ea] sm:text-6xl lg:text-[4.2rem]">
            El antojo que
            <br />
            <span className="text-[#d97325]">no se te va</span>
            <br />
            hasta que lo pruebas.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-[#c9bfb2]">
            Conos crujientes rellenos al momento, con combinaciones que no vas a
            encontrar en otro sitio. Se comen de pie, en cinco minutos, y se
            recuerdan mucho más.
          </p>

          {/* --- Llamadas a la acción --- */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={enlaceWhatsApp(`Hola, quiero pedir un ${cono.nombre}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[#d97325] px-8 py-4 text-base font-semibold text-[#12100e] shadow-lg shadow-[#d97325]/25 transition-all hover:scale-[1.02] hover:bg-[#e8892f] active:scale-100"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z" />
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.23 8.23 0 0 1 0 16.47Z" />
              </svg>
              Pedir por WhatsApp
            </a>

            <a
              href="#sabores"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-4 text-base font-medium text-[#f5f1ea] transition-colors hover:border-white/40 hover:bg-white/5"
            >
              Ver los cinco
            </a>
          </div>

          <p className="mt-5 text-sm text-[#8f8479]">
            {precio(cono.precioCOP)} · preparado en el momento · listo en minutos
          </p>
        </div>

        {/* --- Selector de cono --- */}
        <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-3 lg:mt-8">
          {CONOS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => elegir(i)}
              aria-label={`Ver ${c.nombre}`}
              aria-current={i === activo}
              // min-h-11 son 44 px: el mínimo con el que un pulgar acierta a la
              // primera. Estos botones estaban en 32 px y en móvil fallaban.
              className={`group flex min-h-11 items-center gap-2 rounded-full py-2 pl-3 pr-4 text-sm transition-all ${
                i === activo
                  ? 'bg-white/10 text-[#f5f1ea]'
                  : 'text-[#8f8479] hover:bg-white/5 hover:text-[#c9bfb2]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === activo ? 'bg-[#d97325]' : 'bg-current opacity-50'
                }`}
              />
              {c.corto}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

const MARCA_CIUDAD = 'Bogotá';
