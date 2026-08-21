'use client';

/**
 * ============================================================================
 * Botón flotante de WhatsApp
 * ============================================================================
 *
 * La conversión no ocurre en un punto de la página: ocurre en el momento en que
 * a la persona le entra el antojo, y ese momento puede caer en cualquier
 * sección. Un botón fijo elimina la distancia entre "lo quiero" y "lo pido".
 *
 * Dos detalles que lo hacen menos molesto:
 *
 *   · No aparece hasta pasado el hero. Ahí arriba ya hay dos botones grandes, y
 *     un tercero flotando encima solo tapa la foto.
 *
 *   · Se esconde cuando el cierre entra en pantalla. Esa sección ya es un botón
 *     enorme, y dejar el flotante encima lo tapa justo cuando más se necesita
 *     que se vea.
 *
 * En móvil se separa del borde inferior para no chocar con la barra del
 * navegador, que en iOS aparece y desaparece al hacer scroll.
 */

import { useEffect, useState } from 'react';
import { enlaceWhatsApp } from './datos';

export default function BotonFlotante() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alScroll = () => {
      const pasoElHero = window.scrollY > window.innerHeight * 0.8;

      // La altura del cierre se mide en vivo en lugar de suponerla: cambiar el
      // contenido de esa sección no debería descuadrar este cálculo.
      const cierre = document.querySelector('section:last-of-type');
      const cierreALaVista = cierre
        ? cierre.getBoundingClientRect().top < window.innerHeight * 0.85
        : false;

      setVisible(pasoElHero && !cierreALaVista);
    };

    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  return (
    <a
      href={enlaceWhatsApp('Hola, quiero pedir un cono.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] py-3.5 pl-4 pr-5 font-semibold text-[#0d0b09] shadow-xl shadow-black/40 transition-all duration-300 sm:bottom-8 sm:right-8 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.43 12.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z" />
      </svg>
      <span className="hidden sm:inline">Pedir ahora</span>
    </a>
  );
}
