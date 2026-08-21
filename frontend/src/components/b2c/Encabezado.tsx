'use client';

/**
 * ============================================================================
 * Encabezado
 * ============================================================================
 *
 * Arranca transparente sobre la foto del hero y se vuelve sólido al bajar. La
 * razón no es estética: en el primer pantallazo la foto es el argumento de
 * venta, y una barra opaca encima le roba justo los píxeles que más venden.
 *
 * Tres enlaces, no ocho. Un menú largo invita a explorar; esta página solo
 * quiere que la persona baje y pida.
 */

import { useEffect, useState } from 'react';
import { MARCA, enlaceWhatsApp } from './datos';

const ENLACES = [
  { href: '#sabores', texto: 'Sabores' },
  { href: '#experiencia', texto: 'La experiencia' },
  { href: '#preguntas', texto: 'Preguntas' },
];

export default function Encabezado() {
  const [bajado, setBajado] = useState(false);

  useEffect(() => {
    // El umbral es bajo a propósito: en cuanto la foto empieza a salir de
    // cuadro, la barra ya tiene que ser legible.
    const alScroll = () => setBajado(window.scrollY > 80);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        bajado
          ? 'border-b border-white/10 bg-[#12100e]/90 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#inicio" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-[#f5f1ea]">
            {MARCA.nombre}
          </span>
          <span className="hidden text-xs uppercase tracking-[0.25em] text-[#d97325] sm:inline">
            conos
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {ENLACES.map((e) => (
            <a
              key={e.href}
              href={e.href}
              className="text-sm text-[#c9bfb2] transition-colors hover:text-[#f5f1ea]"
            >
              {e.texto}
            </a>
          ))}
        </nav>

        <a
          href={enlaceWhatsApp('Hola, quiero pedir un cono.')}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[#d97325] px-5 py-2.5 text-sm font-semibold text-[#12100e] transition-transform hover:scale-[1.03] hover:bg-[#e8892f] active:scale-100"
        >
          Pedir ahora
        </a>
      </div>
    </header>
  );
}
