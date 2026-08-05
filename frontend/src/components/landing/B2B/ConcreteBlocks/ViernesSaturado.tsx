/**
 * ============================================================================
 * VIERNES SATURADO — Principio CONCRETE (Made to Stick, Capítulo 3)
 * ============================================================================
 * 
 * FUNCIÓN: Traducir "Incremento de ticket promedio" (abstracto) a una escena
 * específica con números, tiempo, acción humana y objeto físico.
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 3.2):
 * ───────────────────────────────────────────────────────────────────────────
 * "Si su barra sirve 100 mesas en una noche de viernes, y solo 1 de cada 4
 *  pide el cono, son 25 unidades — $587,500 pesos de utilidad esa sola noche,
 *  sin que su cocina haga nada distinto."
 * 
 * ANÁLISIS DE LA FÓRMULA DE CONCRECIÓN:
 *   • SITUACIÓN ESPECÍFICA: "noche de viernes, 100 mesas"
 *   • NÚMERO CONCRETO: "1 de cada 4, 25 unidades, $587,500"
 *   • ACCIÓN HUMANA: "su cocina no hace nada distinto" (contraste con estado actual)
 *   • OBJETO FÍSICO: "el cono" (producto tangible)
 * 
 * VERIFICACIÓN ARITMÉTICA:
 *   25 unidades × $23,500 COP (utilidad neta por cono) = $587,500 COP ✓
 *   (Fuente: unit economics verificados en Playbook de Discovery de SIGH_FOOD)
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 3 "Concrete" — Made to Stick
 *   • Principio: "El lenguaje abstracto es el enemigo de la comprensión"
 *   • Ejemplo análogo: "Mount Hamilton Wilderness" vs "acres protegidos"
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • SIMPLE: Refuerza "sin cambiar nada" (la cocina no hace nada distinto)
 *   • CREDIBLE: Cifra verificada aritméticamente, no inventada
 *   • EMOTIONAL: Segunda persona "su barra", "su cocina" (WIIFY)
 * ============================================================================
 */

'use client';

import { EscenaConcreta } from './EscenaConcreta';

export function ViernesSaturado() {
  return (
    <EscenaConcreta
      titulo="Incremento de ticket promedio"
      escena={
        <>
          Si su barra sirve <span className="text-[#d97325] font-semibold">100 mesas</span> en una{' '}
          <span className="text-[#d97325] font-semibold">noche de viernes</span>, y solo{' '}
          <span className="text-[#d97325] font-semibold">1 de cada 4</span> pide el cono, son{' '}
          <span className="text-[#d97325] font-semibold">25 unidades</span> — sin que su cocina haga nada distinto.
        </>
      }
      cifra="$587,500 COP"
      cifraDescripcion="pesos de utilidad esa sola noche"
      accionHumana="Su bartender ensamblando el cono en 19 segundos junto al trago, sin interrumpir el flujo de la barra"
      objetoFisico="El cono RTA sobre la barra, al lado del Gin-Tonic, listo para servir"
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}