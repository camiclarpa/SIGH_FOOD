'use client';

/**
 * ============================================================================
 * Preguntas frecuentes
 * ============================================================================
 *
 * No es una sección de información: es la última herramienta de conversión de
 * la página. Cada pregunta sin responder es una razón para cerrar la pestaña y
 * "mirarlo luego", que en la práctica significa nunca.
 *
 * Se usa <details> nativo en lugar de un acordeón hecho a mano. Ya trae el
 * comportamiento de teclado y de lector de pantalla resuelto, funciona sin
 * JavaScript, y el navegador puede encontrar texto dentro de las respuestas
 * cerradas cuando alguien usa Ctrl+F.
 *
 * La primera va abierta: enseña de un vistazo que esto se abre y se lee.
 */

import { PREGUNTAS, enlaceWhatsApp } from './datos';

export default function Preguntas() {
  return (
    <section id="preguntas" className="bg-[#12100e] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
            Antes de que preguntes
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
            Lo que todo el mundo quiere saber
          </h2>
        </div>

        <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
          {PREGUNTAS.map((q, i) => (
            <details key={q.p} className="group" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium text-[#f5f1ea] transition-colors hover:text-[#d97325] [&::-webkit-details-marker]:hidden">
                {q.p}
                <span
                  aria-hidden
                  className="shrink-0 text-xl text-[#8f8479] transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-6 pr-8 leading-relaxed text-[#c9bfb2]">{q.r}</p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-center text-[#8f8479]">
          ¿Te queda alguna?{' '}
          <a
            href={enlaceWhatsApp('Hola, tengo una pregunta sobre los conos.')}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#d97325] underline underline-offset-4 hover:text-[#e8892f]"
          >
            Escríbenos y te contestamos
          </a>
          .
        </p>
      </div>
    </section>
  );
}
