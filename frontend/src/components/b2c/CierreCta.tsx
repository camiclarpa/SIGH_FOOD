/**
 * ============================================================================
 * Cierre
 * ============================================================================
 *
 * Nunca se termina con "gracias por visitarnos". Quien ha llegado hasta aquí ha
 * leído la página entera: está lo más cerca de pedir que va a estar nunca, y lo
 * único que falta es decirle qué hacer.
 *
 * Va sobre una foto a pantalla completa porque el último recuerdo antes de
 * decidir debería ser el producto, no un bloque de texto.
 */

import Image from 'next/image';
import { CONOS, enlaceWhatsApp } from './datos';

export default function CierreCta() {
  // El Caramel cierra: es el más goloso de los cinco y el que mejor funciona
  // como última imagen antes de decidir.
  const cono = CONOS.find((c) => c.id === 'sweet-salty-caramel') ?? CONOS[0];

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={cono.imagen}
          alt=""
          fill
          // Decorativa: el texto de encima ya dice todo lo que hay que decir, y
          // un alt aquí solo repetiría lo mismo a quien use lector de pantalla.
          aria-hidden
          className="object-cover object-center"
          sizes="100vw"
          placeholder="blur"
          blurDataURL={cono.marcador}
        />
        <div className="absolute inset-0 bg-[#12100e]/80" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 py-28 text-center sm:px-8 sm:py-36">
        <h2 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-[#f5f1ea] sm:text-6xl">
          ¿Cuál va a ser
          <br />
          <span className="text-[#d97325]">tu primer Bocazo?</span>
        </h2>

        {/* Los cinco nombres, otra vez y al final. Quien ha llegado hasta aqui
            ya decidio que quiere uno; lo unico que puede frenarlo es no acordarse
            de como se llamaba el que le gusto. */}
        <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-[#c9bfb2]">
          {CONOS.map((c) => c.corto).join(', ')}.
        </p>

        <p className="mx-auto mt-3 max-w-lg leading-relaxed text-[#8f8479]">
          Escríbenos por WhatsApp y en un par de mensajes lo tienes. Sin
          formularios, sin registros, sin esperar.
        </p>

        <a
          href={enlaceWhatsApp('Hola, quiero pedir un cono.')}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center justify-center gap-3 rounded-full bg-[#d97325] px-10 py-5 text-lg font-semibold text-[#12100e] shadow-xl shadow-[#d97325]/25 transition-all hover:scale-[1.02] hover:bg-[#e8892f] active:scale-100"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.43 12.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z" />
          </svg>
          Quiero mi Bocazo
        </a>

        <p className="mt-6 text-sm text-[#8f8479]">
          Te contestamos por WhatsApp en minutos, no en días.
        </p>
      </div>
    </section>
  );
}
