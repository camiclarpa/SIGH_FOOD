/**
 * ============================================================================
 * ESCANEO TIEMPO REAL — Principio CONCRETE (Made to Stick, Capítulo 3)
 * ============================================================================
 * 
 * FUNCIÓN: Traducir "Captura de First-Party Data" (abstracto) a una escena
 * específica con números, tiempo, acción humana y objeto físico.
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 3.2):
 * ───────────────────────────────────────────────────────────────────────────
 * "Cada vez que alguien escanea el cono, usted ve en su celular, en tiempo
 *  real, si esa mesa prefiere el picante del mezcal o el dulce del bourbon."
 * 
 * ANÁLISIS DE LA FÓRMULA DE CONCRECIÓN:
 *   • SITUACIÓN ESPECÍFICA: "cada vez que alguien escanea el cono"
 *   • NÚMERO CONCRETO: "en tiempo real" (inmediatez verificable)
 *   • ACCIÓN HUMANA: "usted ve en su celular" (acción del Gerente de A&B)
 *   • OBJETO FÍSICO: "celular mostrando preferencias" + "picante del mezcal / dulce del bourbon"
 * 
 * POR QUÉ ESTE COPY FUNCIONA (según el libro):
 *   • "picante del mezcal" y "dulce del bourbon" son SABORES CONCRETOS
 *     que el cerebro puede imaginar, no categorías abstractas como "perfil
 *     de preferencias del consumidor"
 *   • "usted ve en su celular" pone al Gerente de A&B en la escena (WIIFY)
 *   • "en tiempo real" genera urgencia y control percibido
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 3 "Concrete" — Made to Stick
 *   • Principio: los sustantivos concretos (mezcal, bourbon) se recuerdan
 *     mejor que las abstracciones (perfil de consumidor)
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • EMOTIONAL: Segunda persona "usted" (WIIFY)
 *   • CREDIBLE: Escena verificable (cualquier Gerente puede imaginarla)
 *   • SIMPLE: Una sola idea (escaneo → dato → decisión)
 * ============================================================================
 */

'use client';

import { EscenaConcreta } from './EscenaConcreta';

export function EscaneoTiempoReal() {
  return (
    <EscenaConcreta
      titulo="Captura de First-Party Data"
      escena={
        <>
          Cada vez que alguien escanea el cono,{' '}
          <span className="text-[#d97325] font-semibold">usted ve en su celular, en tiempo real</span>,
          si esa mesa prefiere el{' '}
          <span className="text-[#d97325] font-semibold">picante del mezcal</span> o el{' '}
          <span className="text-[#d97325] font-semibold">dulce del bourbon</span>.
        </>
      }
      cifra="100%"
      cifraDescripcion="de los datos de preferencia capturados en tiempo real, sin intermediarios"
      accionHumana="Usted revisando el dashboard en su celular mientras la mesa 7 disfruta el Spicy Volcano Cone"
      objetoFisico="Su celular mostrando: 'Mesa 7 — prefieren picante (mezcal) sobre dulce (bourbon) — 73% de probabilidad de repetir'"
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      }
    />
  );
}