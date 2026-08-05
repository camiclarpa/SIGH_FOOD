/**
 * ============================================================================
 * CRONÓMETRO CONGELADO — Principio UNEXPECTED (Made to Stick, Capítulo 2)
 * ============================================================================
 * 
 * FUNCIÓN: Romper la Máquina de Predicción del visitante.
 * 
 * CONCEPTO VERIFICADO (Capítulo 2):
 * ───────────────────────────────────────────────────────────────────────────
 * El cerebro opera con "esquemas" — máquinas de predicción. Una idea se vuelve
 * memorable cuando rompe deliberadamente ese esquema de forma relevante al
 * mensaje central.
 * 
 * El cronómetro "0:19" congelado es el PRIMER elemento visual del landing.
 * El visitante no sabe qué significa hasta que lee el H1 — esto genera
 * curiosidad y obliga a seguir leyendo (Gap Theory).
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 2 "Unexpected" — Chip & Dan Heath
 *   • Ejemplo análogo: "¿Sabía que las vacas suben escaleras pero no las bajan?"
 *     (rompe el esquema de lo que el lector espera de una vaca)
 *   • Teoría del Vacío de Curiosidad (George Loewenstein): la curiosidad surge
 *     cuando percibimos un vacío específico en nuestro conocimiento.
 * 
 * REGLA DE DISEÑO:
 *   ✓ SIN animación (congelado, no un cronómetro corriendo)
 *   ✓ SIN etiqueta explicativa inicial (el H1 explica después)
 *   ✓ PRIMER elemento visual (above the fold)
 *   ✓ Color de acento (#d97325) para destacar sobre fondo oscuro
 * 
 * INTEGRACIÓN CON SIMPLE (Tarea 1):
 *   El "19" refuerza el núcleo "20 segundos" — no compite con él, lo anticipa.
 * ============================================================================
 */

'use client';

export function CronometroCongelado() {
  return (
    <div className="flex flex-col items-center mb-8">
      {/* 
        CAJA DEL CRONÓMETRO
        Diseño: fondo oscuro + borde naranja + sombra para destacar
        Posición: centrado, primer elemento visual del Hero
      */}
      <div className="bg-[#0f0f0f] border-2 border-[#d97325] rounded-lg px-6 py-4 shadow-2xl shadow-[#d97325]/20">
        <div className="flex items-baseline gap-2">
          {/* 
            NÚMERO CONGELADO: 0:19
            Font-mono para aspecto digital de cronómetro
            SIN animación — está congelado intencionalmente
          */}
          <span className="text-6xl md:text-8xl font-mono font-bold text-[#d97325] tracking-wider tabular-nums">
            0:19
          </span>
          <span className="text-lg md:text-xl text-[#d97325] font-semibold">
            segundos
          </span>
        </div>
      </div>

      {/* 
        ETIQUETA SECUNDARIA
        Aparece DESPUÉS del cronómetro para no robar atención
        Texto en mayúsculas + tracking amplio para aspecto técnico
      */}
      <p className="text-xs md:text-sm text-gray-500 mt-3 tracking-[0.2em] uppercase font-medium">
        Tiempo de ensamble en barra
      </p>
    </div>
  );
}