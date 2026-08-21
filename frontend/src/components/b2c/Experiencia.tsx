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
import { CONOS, FICHA } from './datos';

/**
 * Ruta del vídeo del ritual, cuando lo grabes.
 *
 * Ponlo en `public/videos/` y escribe aquí su ruta —por ejemplo
 * '/videos/ritual.mp4'—. La sección detecta que existe y muestra el
 * reproductor en lugar de la fotografía, sin más cambios.
 */
const VIDEO_RITUAL: string | null = null;

/**
 * Foto del cono EN LA MANO, cuando la tengas.
 *
 * Es la que más falta hace de todas. Las fotos de estudio son excelentes, pero
 * enseñan el cono sobre un soporte, en un bodegón: comunican "producto de
 * catálogo", no "esto lo puedes tener tú dentro de diez minutos".
 *
 * La propuesta de la marca es "se come de pie, con una mano". Sin una foto que
 * lo demuestre, esa frase es una afirmación; con ella, es evidente — y de paso
 * resuelve la duda del tamaño mejor que cualquier cifra en centímetros.
 *
 * Qué pedirle al fotógrafo: mano sosteniendo el cono, primer plano, con la
 * mordida dada y el relleno a la vista. Mejor en el local y con gente detrás
 * desenfocada que en estudio: el contexto es parte del mensaje.
 *
 * Ponla en `public/conos/` y escribe aquí su ruta. Hasta entonces, el bloque
 * muestra su hueco marcado en lugar de fingir que existe.
 */
const FOTO_EN_MANO: string | null = null;

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
          <ol className="space-y-9" data-pasos>
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

        {/* --- Así llega a tu mano --- */}
        <div className="mt-16 grid items-center gap-10 rounded-2xl border border-white/10 bg-[#1c1812] p-7 sm:p-10 lg:grid-cols-[auto_1fr] lg:gap-14">
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-[#12100e] lg:w-80">
            {FOTO_EN_MANO ? (
              <Image
                src={FOTO_EN_MANO}
                alt="Un cono Bocazo sostenido con la mano, con la primera mordida dada"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 320px, 100vw"
              />
            ) : (
              /* Hueco marcado, no una foto de relleno. Una imagen de archivo
                 que no sea el producto real hace justo lo contrario de lo que
                 esta sección busca: rompe la credibilidad de todo lo demás. */
              <div className="flex h-full flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 p-6 text-center">
                <span className="text-4xl" aria-hidden>
                  📷
                </span>
                <p className="text-sm font-medium text-[#c9bfb2]">
                  Aquí va la foto del cono en la mano
                </p>
                <p className="text-xs leading-relaxed text-[#8f8479]">
                  Primer plano, con la mordida dada y el relleno a la vista.
                  Mejor en el local que en estudio.
                </p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-display text-2xl font-bold text-[#f5f1ea] sm:text-3xl">
              Así llega a tu mano
            </h3>

            <p className="mt-4 max-w-xl leading-relaxed text-[#c9bfb2]">
              Sin plato, sin cubiertos y sin sentarte. Mide {FICHA.altura} y pesa unos{' '}
              {FICHA.pesoGramos} gramos: se sostiene con una mano y te deja la otra
              libre para tu copa. {FICHA.equivalencia}
            </p>

            <p className="mt-4 max-w-xl leading-relaxed text-[#8f8479]">
              Por eso funciona de camino a otro sitio, en mitad de un plan o cuando
              sales del bar y te entra el antojo. No interrumpe la noche: se suma a ella.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
