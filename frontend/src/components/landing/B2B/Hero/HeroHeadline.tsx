/**
 * ============================================================================
 * HERO HEADLINE — Principio SIMPLE (Made to Stick, Capítulo 1)
 * ============================================================================
 * 
 * NÚCLEO ÚNICO: "20 segundos, sin cambiar nada de lo que ya hacen"
 * 
 * REGLA DE GOBIERNO (Sección 1.2 del RFC Made to Stick):
 * ───────────────────────────────────────────────────────────────────────────
 * Cualquier elemento nuevo que se proponga añadir al landing debe pasar la
 * pregunta: ¿esto refuerza "20 segundos, sin cambiar nada de lo que ya hacen"?
 * 
 *   ✅ SÍ → Mantener en sección principal (Hero)
 *   ❌ NO → Mover a sección secundaria o eliminar
 * 
 * Elementos que NO pasan el test (ejemplos):
 *   • Detalles técnicos de la cadena de frío
 *   • Especificaciones de empaque
 *   • Historias largas de fundación de la empresa
 * 
 * Elementos que SÍ pasan el test:
 *   • Tiempo de ensamble (19-20 segundos)
 *   • No requiere chef adicional
 *   • No requiere equipamiento de cocina
 *   • Margen por unidad ($23,500 COP)
 * 
 * REFERENCIA: Capítulo 1 "Simple" — Made to Stick (Chip & Dan Heath)
 * Ejemplo análogo: Southwest Airlines — "Somos LA aerolínea de bajo costo"
 * ============================================================================
 */

'use client';

import { CronometroCongelado } from './CronometroCongelado';
import { GapTheorySubheadline } from './GapTheorySubheadline';

export default function HeroHeadline() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-[#1a1a1a] overflow-hidden">
      
      {/* 
        ELEMENTO ROMPE-ESQUEMA (UNEXPECTED)
        Primer elemento visual: cronómetro congelado en 0:19
        El visitante no sabe qué significa hasta que lee el H1.
      */}
      <CronometroCongelado />

      {/* 
        H1 — NÚCLEO ÚNICO (SIMPLE)
        Una sola idea: "20 segundos, sin cambiar nada"
        Sin elementos secundarios compitiendo por atención.
      */}
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-[#f5f5f5] text-center max-w-5xl leading-tight mt-8">
        El único plato que se sirve en su barra en menos de{' '}
        <span className="text-[#d97325]">20 segundos</span>
        <br className="hidden md:block" />
        — y que su bar ya sabe hacer,{' '}
        <span className="italic">sin saberlo.</span>
      </h1>

      {/* 
        SUB-HEADLINE — GAP THEORY (UNEXPECTED)
        Abre el vacío de curiosidad con una pregunta, no con una afirmación.
        No da la respuesta inmediatamente.
      */}
      <GapTheorySubheadline />

      {/* 
        CTA PRIMARIO
        Acción concreta que cierra el gap abierto por la pregunta.
      */}
      <a
        href="#formulario"
        className="mt-10 bg-[#d97325] hover:bg-[#c4641f] text-white font-bold py-4 px-10 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
      >
        Quiero ver el ensamble en mi barra
      </a>

    </section>
  );
}