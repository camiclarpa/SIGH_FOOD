/**
 * ============================================================================
 * HERO SECTION — Simple + Unexpected + Stories (Made to Stick)
 * RFC-001: Capa Edge — Contenido estático SSG
 * ============================================================================
 * 
 * FUNCIÓN: Hero Section que aplica los principios SUCCESs de Made to Stick:
 *   • SIMPLE: H1 con núcleo único "20 segundos, sin cambiar nada"
 *   • UNEXPECTED: Cronómetro 0:19 + Gap Theory
 *   • STORIES: Springboard Story integrada
 * 
 * SECUENCIA DE REVELACIÓN (RFC Made to Stick Cap. 2):
 *   Segundo 0-3:   CRONÓMETRO "0:19" (rompe esquema)
 *   Segundo 3-6:   H1 "20 segundos" (resuelve parcialmente el gap)
 *   Segundo 6-10:  GAP THEORY (abre gap más profundo)
 *   Segundo 10+:   CTA (cierra el gap con acción)
 * ============================================================================
 */

'use client';

import { useState } from 'react';

export default function HeroSection() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      
      if (response.status === 202 || response.status === 200) {
        setSubmitted(true);
        window.location.href = '/gracias';
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-[#1a1a1a] overflow-hidden">
      
      {/* CRONÓMETRO CONGELADO (UNEXPECTED - Cap. 2) */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-[#0f0f0f] border-2 border-[#d97325] rounded-lg px-6 py-4 shadow-2xl shadow-[#d97325]/20">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl md:text-8xl font-mono font-bold text-[#d97325] tracking-wider tabular-nums">
              0:19
            </span>
            <span className="text-lg md:text-xl text-[#d97325] font-semibold">
              segundos
            </span>
          </div>
        </div>
        <p className="text-xs md:text-sm text-gray-500 mt-3 tracking-[0.2em] uppercase font-medium">
          Tiempo de ensamble en barra
        </p>
      </div>

      {/* H1 — NÚCLEO ÚNICO (SIMPLE - Cap. 1) */}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#f5f5f5] text-center max-w-5xl leading-tight mt-8">
        El único plato que se sirve en su barra en menos de{' '}
        <span className="text-[#d97325]">20 segundos</span>
        <br className="hidden md:block" />
        — y que su bar ya sabe hacer,{' '}
        <span className="italic">sin saberlo.</span>
      </h1>

      {/* GAP THEORY SUBHEADLINE (UNEXPECTED - Cap. 2) */}
      <p className="mt-8 text-xl md:text-2xl lg:text-3xl text-gray-300 text-center max-w-4xl leading-relaxed px-4">
        ¿Cuánto dinero está dejando sobre la mesa{' '}
        <span className="text-[#d97325] font-semibold">—literalmente—</span>{' '}
        cada vez que un cliente termina su segundo trago y no pide nada más?
      </p>

      {/* CTA PRIMARIO */}
      <a
        href="#formulario"
        className="mt-10 bg-[#d97325] hover:bg-[#c4641f] text-white font-bold py-4 px-10 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
      >
        Quiero ver el ensamble en mi barra
      </a>

      {/* FORMULARIO INTEGRADO (Springboard Story) */}
      <div id="formulario" className="mt-20 w-full max-w-md">
        <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-[#f5f5f5]">
            Solicita tu Kit Piloto
          </h2>
          
          {submitted ? (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 text-center">
              <p className="text-green-400 font-semibold">¡Solicitud enviada!</p>
              <p className="text-gray-400 text-sm mt-2">Te contactaremos pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="establecimiento"
                placeholder="Nombre del bar"
                required
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
              />
              <input
                type="tel"
                name="whatsapp"
                placeholder="WhatsApp de contacto"
                required
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
              />
              <input
                type="text"
                name="ciudad"
                placeholder="Ciudad"
                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
              />
              <button
                type="submit"
                className="w-full bg-[#d97325] hover:bg-[#c4641f] text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
              >
                ENVIAR SOLICITUD
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}