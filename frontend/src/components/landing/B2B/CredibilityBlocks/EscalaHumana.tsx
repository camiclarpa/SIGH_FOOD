/**
 * ============================================================================
 * ESCALA HUMANA — Principio CREDIBLE (Made to Stick, Capítulo 4)
 * ============================================================================
 * 
 * FUNCIÓN: Traducir "73.4% de margen" (abstracto) a una escala humanamente
 * comprensible: "$7,300 de cada $10,000".
 * 
 * CONCEPTO VERIFICADO (Capítulo 4):
 * ───────────────────────────────────────────────────────────────────────────
 * El experimento de la piedra:
 *   • "Lanzar una piedra desde el Sol hasta la Tierra con precisión de 1 metro"
 *     → 58% de los encuestados lo calificaron como "muy impresionante"
 *   • "Lanzar una piedra desde Nueva York hasta Los Ángeles con precisión de
 *     1 metro" → 83% lo calificaron como "muy impresionante"
 * 
 * La precisión matemática es la misma. La diferencia está en la escala:
 * Nueva York → Los Ángeles es una distancia que el cerebro puede imaginar.
 * El Sol → la Tierra no.
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 4.2):
 * ───────────────────────────────────────────────────────────────────────────
 * "De cada $10,000 pesos que su comensal paga por el cono, más de $7,300
 *  se quedan en su caja — no en la nuestra."
 * 
 * VERIFICACIÓN ARITMÉTICA:
 *   • Margen neto por cono: $23,500 COP (utilidad neta)
 *   • Precio de carta: $32,000 COP
 *   • Margen %: 23,500 / 32,000 = 0.734375 = 73.4% ✓
 *   • Escala humana: 73.4% × $10,000 = $7,340 ≈ $7,300 ✓
 * 
 * (Fuente: unit economics verificados en Playbook de Discovery de SIGH_FOOD)
 * 
 * POR QUÉ FUNCIONA (según el libro):
 *   • "$10,000 pesos" es un billete que el Gerente de A&B tiene en su caja
 *     registradora — es tangible, imaginable
 *   • "$7,300 se quedan en su caja" es una acción concreta (el dinero no
 *     se va, se queda)
 *   • "— no en la nuestra" cierra con honestidad (credibilidad interna)
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • CONCRETE: "$10,000 pesos" es un objeto físico (billete)
 *   • EMOTIONAL: "su caja" (segunda persona, WIIFY)
 *   • SIMPLE: Una sola cifra, no tres porcentajes
 * ============================================================================
 */

'use client';

import { BloqueCredibilidad } from './BloqueCredibilidad';

export function EscalaHumana() {
  return (
    <BloqueCredibilidad
      tipo="escala-humana"
      titulo="Margen por unidad"
      estadisticaAbstracta="73.4% de margen neto por unidad"
      traduccionHumana={
        <>
          De cada <span className="text-[#d97325] font-bold">$10,000 pesos</span> que su comensal paga por el cono,
          más de <span className="text-[#d97325] font-bold">$7,300 se quedan en su caja</span> — no en la nuestra.
        </>
      }
      contextoVerificable={
        <>
          <p className="mb-3">
            El <strong className="text-[#f5f5f5]">73.4%</strong> es un número que el cerebro procesa
            analíticamente — lo entiende, pero no lo <em>siente</em>.
          </p>
          <p className="mb-3">
            En cambio, <strong className="text-[#f5f5f5]">$10,000 pesos</strong> es un billete que usted
            tiene ahora mismo en su caja registradora. Es tangible. Es imaginable.
          </p>
          <p>
            Y <strong className="text-[#f5f5f5]">$7,300</strong> es lo que se queda ahí — no lo que se va
            en costos, no lo que se va en proveedor. Lo que se queda.
          </p>
        </>
      }
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
    />
  );
}