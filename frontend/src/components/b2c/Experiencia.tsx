'use client';

/**
 * ============================================================================
 * La experiencia — demostración
 * ============================================================================
 *
 * Aquí no se dice que está bueno: se enseña. Cuatro pasos, del cono vacío al
 * primer mordisco, con la foto grande al lado.
 *
 * El hueco de vídeo está preparado y marcado. Cuando lo tengas, se cambia una
 * constante y el bloque pasa de foto a vídeo sin tocar nada más. Mientras
 * tanto la sección funciona con lo que sí existe — las fotos— en lugar de
 * enseñar un reproductor roto o un "próximamente", que es peor que no tener
 * la sección.
 */

import Image from 'next/image';
import { useState } from 'react';
import { CONOS } from './datos';

/**
 * Ruta del vídeo del ritual, cuando lo grabes.
 *
 * Ponlo en `public/videos/` y escribe aquí su ruta —por ejemplo
 * '/videos/ritual.mp4'—. La sección detecta que existe y muestra el
 * reproductor en lugar de la fotografía, sin más cambios.
 */
const VIDEO_RITUAL: string | null = null;

const PASOS = [
  {
    numero: '01',
    titulo: 'La base',
    texto:
      'Se hornea en molde hasta que suena hueca al golpearla. Ese sonido es la señal de que va a crujir.',
  },
  {
    numero: '02',
    titulo: 'El relleno',
    texto:
      'Entra tibio, denso, hasta el borde. Aquí es donde el cono deja de ser un envase y pasa a ser el plato.',
  },
  {
    numero: '03',
    titulo: 'El remate',
    texto:
      'Salsa, toppings y sal en escamas por encima. Lo que ves en la foto es exactamente lo que te dan.',
  },
  {
    numero: '04',
    titulo: 'El primer bocado',
    texto:
      'Cruje, cede y llega el relleno. En ese orden. Todo lo anterior existe para que ese segundo salga bien.',
  },
];

export default function Experiencia() {
  // Se enseña el Volcano: es el más gráfico de los cinco y el que mejor
  // comunica de un vistazo que aquí pasa algo distinto.
  const [cono] = useState(() => CONOS.find((c) => c.id === 'spicy-volcano') ?? CONOS[0]);

  return (
    <section id="experiencia" className="bg-[#17140f] px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.3em] text-[#d97325]">
            Cómo se hace
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#f5f1ea] sm:text-5xl">
            Veinte segundos delante de ti.
          </h2>
          <p className="mt-5 text-lg text-[#c9bfb2]">
            No sale de una vitrina. Se arma cuando lo pides, y puedes verlo entero.
          </p>
        </div>

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* --- Visual --- */}
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#12100e] lg:aspect-[3/4]">
            {VIDEO_RITUAL ? (
              <video
                src={VIDEO_RITUAL}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                // Sin controles y en silencio: es una demostración ambiental,
                // no un vídeo que alguien haya decidido ver.
                aria-label="Preparación de un cono Bocazo"
              />
            ) : (
              <Image
                src={cono.imagen}
                alt={`Cono ${cono.nombre} recién servido`}
                fill
                className="object-cover object-top"
                sizes="(min-width: 1024px) 50vw, 100vw"
                placeholder="blur"
                blurDataURL={cono.marcador}
              />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12100e]/60 to-transparent" />
          </div>

          {/* --- Pasos --- */}
          <ol className="space-y-9">
            {PASOS.map((p) => (
              <li key={p.numero} className="flex gap-5">
                <span className="font-display shrink-0 text-2xl font-bold text-[#d97325]/60">
                  {p.numero}
                </span>
                <div>
                  <h3 className="font-display text-xl font-bold text-[#f5f1ea]">
                    {p.titulo}
                  </h3>
                  <p className="mt-2 leading-relaxed text-[#c9bfb2]">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
