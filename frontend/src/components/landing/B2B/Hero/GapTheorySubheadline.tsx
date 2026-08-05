/**
 * ============================================================================
 * GAP THEORY SUBHEADLINE — Principio UNEXPECTED (Made to Stick, Capítulo 2)
 * ============================================================================
 * 
 * FUNCIÓN: Abrir el Vacío de Curiosidad con una PREGUNTA, no con una afirmación.
 * 
 * CONCEPTO VERIFICADO (Capítulo 2):
 * ───────────────────────────────────────────────────────────────────────────
 * Teoría del Vacío de Curiosidad (George Loewenstein): la curiosidad surge
 * cuando percibimos un vacío específico en nuestro conocimiento. No basta con
 * dar información — primero hay que abrir la pregunta que esa información
 * va a responder.
 * 
 * Por qué una PREGUNTA y no una AFIRMACIÓN:
 *   ❌ AFIRMACIÓN: "Está dejando dinero sobre la mesa cada noche"
 *      → El cerebro procesa y sigue scrolleando.
 *   ✅ PREGUNTA: "¿Cuánto dinero está dejando sobre la mesa...?"
 *      → El cerebro NO puede ignorar una pregunta abierta. Necesita respuesta.
 *      → Obliga a seguir leyendo para cerrar el gap.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 2 "Unexpected" — Chip & Dan Heath
 *   • Ejemplo análogo: el email de Howard Leventhal sobre tétanos que aumentó
 *     la vacunación del 3% al 28% solo por añadir un mapa (cerrar el gap
 *     entre "sé que debo vacunarme" y "cómo lo hago")
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0):
 *   "¿Cuánto dinero está dejando sobre la mesa —literalmente— cada vez que
 *    un cliente termina su segundo trago y no pide nada más?"
 * 
 * ANÁLISIS DEL COPY:
 *   • "¿Cuánto dinero..." → Abre gap cuantitativo (el cerebro quiere número)
 *   • "...sobre la mesa —literalmente—" → Concreción sensorial (Concrete)
 *   • "...segundo trago..." → Escena específica, no abstracta (Concrete)
 *   • "...no pide nada más" → Dolor específico del Gerente de A&B (Emotional)
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • CONCRETE: "segundo trago", "sobre la mesa" (imágenes sensoriales)
 *   • EMOTIONAL: segunda persona "usted" (WIIFY)
 *   • SIMPLE: una sola pregunta, no tres
 * ============================================================================
 */

'use client';

export function GapTheorySubheadline() {
  return (
    <p className="mt-8 text-xl md:text-2xl lg:text-3xl text-gray-300 text-center max-w-4xl leading-relaxed px-4">
      ¿Cuánto dinero está dejando sobre la mesa{' '}
      <span className="text-[#d97325] font-semibold">—literalmente—</span>{' '}
      cada vez que un cliente termina su segundo trago y no pide nada más?
    </p>
  );
}