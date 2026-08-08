/**
 * ============================================================================
 * VISUALIZACIÓN TEMPE — Principio EMOTIONAL (Made to Stick, Capítulo 5)
 * ============================================================================
 * 
 * FUNCIÓN: Replicar el estudio de Tempe, Arizona, donde pedirle a la gente
 * que se IMAGINARA a sí misma disfrutando la TV por cable elevó la suscripción
 * real del 20% al 47% — más del doble, sin cambiar el producto ni el precio.
 * 
 * CONCEPTO VERIFICADO (Capítulo 5):
 * ───────────────────────────────────────────────────────────────────────────
 * Estudio de Tempe, Arizona (citado textualmente en el libro):
 *   • Grupo control (información sobre canales): 20% de suscripción
 *   • Grupo experimental (pedir que se imaginaran disfrutando): 47% de suscripción
 * 
 * El mecanismo: cuando el cerebro simula una experiencia futura vívidamente,
 * la percibe como más probable y más deseable. No es manipulación — es
 * activar un mecanismo cognitivo legítimo.
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 5.2):
 * ───────────────────────────────────────────────────────────────────────────
 * "Imagínese el próximo viernes: son las 11 de la noche, su barra está llena,
 *  y en vez de que las mesas se queden solo con el trago en la mano durante
 *  20 minutos sin pedir nada más, su mesero ya está entregando el segundo
 *  Spicy Volcano Cone de la noche a la mesa 7 — y usted lo está viendo en
 *  tiempo real desde su celular."
 * 
 * ANÁLISIS DEL COPY (por qué funciona según el libro):
 *   • "Imagínese" → activa la simulación mental (mecanismo de Tempe)
 *   • "el próximo viernes" → temporalidad específica (no "algún día")
 *   • "son las 11 de la noche" → hora concreta (el cerebro visualiza mejor)
 *   • "su barra está llena" → escenario deseado del Gerente de A&B
 *   • "en vez de que las mesas se queden solo con el trago" → dolor actual
 *   • "su mesero ya está entregando" → acción humana visible (Concrete)
 *   • "el segundo Spicy Volcano Cone" → producto específico con nombre
 *   • "a la mesa 7" → número concreto (no "una mesa")
 *   • "usted lo está viendo en tiempo real desde su celular" → WIIFY +
 *     objeto físico (celular) + control percibido
 * 
 * VERIFICACIÓN DE SEGUNDA PERSONA (WIIFY):
 *   • "su barra" ✓ (no "el bar")
 *   • "su mesero" ✓ (no "el mesero")
 *   • "usted lo está viendo" ✓ (no "el gerente ve")
 *   • "su celular" ✓ (no "un dispositivo")
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 5 "Emotional" — Chip & Dan Heath
 *   • Estudio de Tempe, Arizona (TV por cable: 20% → 47%)
 *   • Principio: la simulación mental eleva la probabilidad percibida
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • CONCRETE: "mesa 7", "11 de la noche", "celular" (objetos específicos)
 *   • CREDIBLE: escena verificable (cualquier Gerente puede imaginarla)
 *   • STORIES: estructura narrativa con inicio (barra llena), nudo (mesero
 *     entregando), desenlace (usted viendo desde celular)
 * ============================================================================
 */

'use client';

import { BloqueEmocional } from './BloqueEmocional';

export function VisualizacionTempe() {
  return (
    <BloqueEmocional
      tipo="visualizacion"
      titulo="Visualice su propio fin de semana"
      contenido={
        <p className="italic">
          <span className="text-[#d97325] font-semibold not-italic">Imagínese el próximo viernes:</span>{' '}
          son las 11 de la noche, su barra está llena, y en vez de que las mesas se queden solo con el trago
          en la mano durante 20 minutos sin pedir nada más,{' '}
          <span className="text-[#d97325] font-semibold">su mesero ya está entregando el segundo Spicy Volcano Cone
          de la noche a la mesa 7</span> — y usted lo está viendo en tiempo real desde su celular.
        </p>
      }
      notaTecnica={
        <>
          <p className="mb-3">
            En un estudio en Tempe, Arizona, pedirle a la gente que se <strong className="text-[#f5f5f5]">imaginara
            a sí misma</strong> disfrutando la TV por cable elevó la suscripción real del{' '}
            <strong className="text-[#f5f5f5]">20% al 47%</strong> — más del doble, sin cambiar el producto
            ni el precio.
          </p>
          <p className="mb-3">
            El mecanismo: cuando su cerebro simula una experiencia futura vívidamente, la percibe como más
            probable y más deseable. Por eso este bloque usa <strong className="text-[#f5f5f5]">“Imagínese”</strong>{' '}
            como primera palabra, y ancla la escena en un viernes específico a las 11pm.
          </p>
          <p>
            Note que todo está en <strong className="text-[#f5f5f5]">segunda persona</strong> (“su barra”, “su mesero”,
            “usted lo está viendo”). No hablamos de “el establecimiento” ni de “los clientes” — hablamos de{' '}
            <strong className="text-[#f5f5f5]">usted</strong>.
          </p>
        </>
      }
      citaLibro="Estudio de Tempe, Arizona: suscripción de TV por cable del 20% al 47% cuando se pidió a los participantes que se imaginaran disfrutando el servicio. — Cap. 5, Made to Stick"
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      }
    />
  );
}