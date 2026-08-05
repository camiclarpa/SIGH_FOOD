/**
 * ============================================================================
 * HERO SECTION — Secuencia de Revelación UNEXPECTED
 * ============================================================================
 * 
 * SECUENCIA DE REVELACIÓN (Capítulo 2 - Unexpected):
 * ───────────────────────────────────────────────────────────────────────────
 * El orden de los elementos NO es arbitrario. Cada uno cumple una función
 * psicológica específica en la secuencia de apertura:
 * 
 *   Segundo 0-3:   CRONÓMETRO "0:19" (rompe esquema, genera curiosidad)
 *   Segundo 3-6:   H1 "20 segundos" (resuelve parcialmente el gap)
 *   Segundo 6-10:  GAP THEORY (abre nuevo gap más profundo)
 *   Segundo 10+:   CTA (cierra el gap con acción)
 * 
 * REFERENCIA:
 *   • Capítulo 2 "Unexpected" — Made to Stick
 *   • Secuencia de apertura del email de Howard Leventhal (tétanos)
 *   • Estructura de apertura de Southwest Airlines ("Somos LA aerolínea...")
 * 
 * NOTA DE INTEGRACIÓN:
 *   Este componente orquesta CronometroCongelado + HeroHeadline + 
 *   GapTheorySubheadline en el orden correcto. No duplica su lógica.
 * ============================================================================
 */

'use client';

import { CronometroCongelado } from './CronometroCongelado';
import { HeroHeadline } from './HeroHeadline';
import { GapTheorySubheadline } from './GapTheorySubheadline';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-[#1a1a1a] overflow-hidden">
      
      {/* 
        PASO 1: CRONÓMETRO (UNEXPECTED - Rompe esquema)
        Primer elemento visual. El visitante no sabe qué significa.
      */}
      <CronometroCongelado />

      {/* 
        PASO 2: H1 (SIMPLE - Núcleo único)
        Resuelve parcialmente el gap abierto por el cronómetro.
      */}
      <HeroHeadline />

      {/* 
        PASO 3: GAP THEORY (UNEXPECTED - Abre vacío de curiosidad)
        Abre un gap MÁS PROFUNDO que el anterior.
      */}
      <GapTheorySubheadline />

      {/* 
        PASO 4: CTA PRIMARIO (Cierra el gap con acción)
        "Quiero ver el ensamble en mi barra" — acción concreta.
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