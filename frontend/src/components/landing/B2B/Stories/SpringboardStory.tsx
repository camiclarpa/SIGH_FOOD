/**
 * ============================================================================
 * SPRINGBOARD STORY — Principio STORIES (Made to Stick, Capítulo 6)
 * ============================================================================
 * 
 * FUNCIÓN: Presentar la historia trampolín que permite a la audiencia ver cómo
 * un problema existente podría cambiar — la historia no es sobre la
 * organización que la cuenta, es sobre el problema del oyente resuelto.
 * 
 * CONCEPTO VERIFICADO (Capítulo 6):
 * ───────────────────────────────────────────────────────────────────────────
 * Stephen Denning, del Banco Mundial, usó una historia real sobre un trabajador
 * de salud en Zambia que encontró información sobre tratamiento de malaria en
 * el sitio web de los CDC — no en ningún sistema interno del Banco Mundial —
 * para convencer a ejecutivos senior de adoptar la gestión del conocimiento
 * como prioridad institucional.
 * 
 * Denning define una springboard story como aquella que permite a la audiencia
 * ver cómo un problema existente podría cambiar — la historia no es sobre la
 * organización que la cuenta, es sobre el problema del oyente resuelto.
 * 
 * COPY EXACTO (verificado contra RFC Made to Stick v2.0, Sección 6.4):
 * ──────────────────────────────────────────────────────────────────────────
 * "El Fin de Semana Piloto que Cambió Todo"
 * 
 * El viernes a las 6 PM llegó el kit de SIGH_FOOD a tu bar. El bartender jefe,
 * escéptico, lo abrió: 5 conos, 5 elixires, instrucciones de menos de 20
 * segundos. "Esto no va a funcionar", pensó.
 * 
 * El sábado a las 10 PM, el local estaba lleno. El bartender jefe vio cómo un
 * cliente pedía un Mezcal Mule y, sin que se lo pidieran, le sugirió el Spicy
 * Volcano Cone. El cliente lo probó. Pidió otro. Luego toda la mesa pidió
 * conos.
 * 
 * El domingo al cerrar, el bartender jefe revisó los números: 120 conos
 * vendidos — $3,840,000 COP en ventas totales (120 × $32,000 COP de precio de
 * carta), y $2,820,000 COP de utilidad neta (120 × $23,500 COP, después de
 * cubrir el costo de adquisición de $8,500 COP por cono). Cero merma, cero
 * dependencia de cocina, cero estrés.
 * 
 * El lunes, el bartender jefe llamó a SIGH_FOOD: "No me quiten los conos.
 * Queremos el contrato anual."
 * 
 * ¿Quieres tu propio Fin de Semana Piloto? Agenda la Demo Phygital hoy.
 * 
 * VERIFICACIÓN ARITMÉTICA (corregida en v2.0 del RFC):
 *   • Ventas totales: 120 × $32,000 = $3,840,000 COP ✓
 *   • Utilidad neta: 120 × $23,500 = $2,820,000 COP ✓
 *   • Costo adquisición: 120 × $8,500 = $1,020,000 COP
 *   • Verificación: $3,840,000 - $1,020,000 = $2,820,000 ✓
 * 
 * (Nota: el borrador original presentaba $2,820,000 simultáneamente como
 * "ventas" y "ganancia neta" — matemáticamente inconsistente. Corregido en
 * v2.0 del RFC antes de esta implementación.)
 * 
 * POR QUÉ FUNCIONA COMO SPRINGBOARD STORY:
 *   • No es una historia sobre SIGH_FOOD, es sobre cómo se resolvió el
 *     problema del dueño del bar
 *   • Permite personalización mental — cada Gerente de A&B se imagina a sí
 *     mismo en el lugar del bartender jefe
 *   • Termina con acción: la llamada para firmar el contrato, inspirando al
 *     lector a repetir esa misma acción
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 6 "Stories" — Chip & Dan Heath
 *   • Ejemplo análogo: Stephen Denning y el trabajador de salud en Zambia
 *   • Principio: la historia permite ver cómo el problema del oyente podría
 *     cambiar
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • CONCRETE: "viernes 6 PM", "sábado 10 PM", "Mezcal Mule", "Spicy Volcano Cone"
 *   • CREDIBLE: Cifras verificadas aritméticamente (corregidas en v2.0)
 *   • EMOTIONAL: Segunda persona "tu bar" (WIIFY directo)
 *   • SIMPLE: Una sola narrativa, no cinco beneficios
 * ============================================================================
 */

'use client';

export function SpringboardStory() {
  return (
    <section className="bg-gradient-to-br from-[#1f1f1f] to-[#0f0f0f] border-2 border-[#d97325]/30 rounded-lg p-8 md:p-12">
      
      {/* HEADER */}
      <div className="mb-8">
        <div className="text-xs text-[#d97325] uppercase tracking-widest font-semibold mb-2">
          Springboard Story — La Historia Trampolín
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#f5f5f5]">
          El Fin de Semana Piloto que Cambió Todo
        </h2>
      </div>

      {/* NARRATIVA EN SEGUNDA PERSONA */}
      <div className="space-y-6 text-xl md:text-2xl text-gray-200 leading-relaxed">
        
        <p>
          El viernes a las 6 PM llegó el kit de SIGH_FOOD a <span className="text-[#d97325] font-semibold">tu bar</span>. El bartender jefe, escéptico, lo abrió: 5 conos, 5 elixires, instrucciones de menos de 20 segundos. <em className="text-gray-400">"Esto no va a funcionar"</em>, pensó.
        </p>

        <p>
          El sábado a las 10 PM, el local estaba lleno. El bartender jefe vio cómo un cliente pedía un Mezcal Mule y, sin que se lo pidieran, le sugirió el <span className="text-[#d97325] font-semibold">Spicy Volcano Cone</span>. El cliente lo probó. Pidió otro. Luego toda la mesa pidió conos.
        </p>

        <p>
          El domingo al cerrar, el bartender jefe revisó los números:
        </p>

      </div>

      {/* CIFRAS DESTACADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Ventas totales:
          </div>
          <div className="text-3xl md:text-4xl font-bold text-[#d97325]">
            $3,840,000 COP
          </div>
          <div className="text-sm text-gray-400 mt-2 font-mono">
            120 conos × $32,000
          </div>
        </div>

        <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Utilidad neta:
          </div>
          <div className="text-3xl md:text-4xl font-bold text-[#d97325]">
            $2,820,000 COP
          </div>
          <div className="text-sm text-gray-400 mt-2 font-mono">
            120 × $23,500 (después de $8,500 costo/cono)
          </div>
        </div>
      </div>

      {/* CIERRE NARRATIVO */}
      <div className="space-y-6 text-xl md:text-2xl text-gray-200 leading-relaxed">
        
        <p>
          Cero merma, cero dependencia de cocina, cero estrés.
        </p>

        <p>
          El lunes, el bartender jefe llamó a SIGH_FOOD: <em className="text-[#f5f5f5] font-semibold">"No me quiten los conos. Queremos el contrato anual."</em>
        </p>

      </div>

      {/* CTA FINAL */}
      <div className="mt-10 pt-8 border-t border-gray-800 text-center">
        <p className="text-2xl md:text-3xl font-bold text-[#f5f5f5] mb-6">
          ¿Quieres tu propio Fin de Semana Piloto?
        </p>
        <a
          href="#formulario"
          className="inline-block bg-[#d97325] hover:bg-[#c4641f] text-white font-bold py-4 px-10 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          Agenda la Demo Phygital hoy
        </a>
      </div>

      {/* NOTA DE HONESTIDAD (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
          <div className="text-xs text-yellow-500 uppercase tracking-wider mb-2 font-semibold">
            Nota de honestidad (RFC v2.0, Sección 6.4):
          </div>
          <p className="text-yellow-200/80 text-sm">
            Esta es una springboard story arquetípica. Las cifras están verificadas aritméticamente
            (120 × $32,000 = $3,840,000 ventas; 120 × $23,500 = $2,820,000 utilidad neta), pero la
            narrativa es ficticia hasta que exista un caso real que la reemplace. El borrador original
            presentaba $2,820,000 simultáneamente como "ventas" y "ganancia neta" — corregido en v2.0
            del RFC antes de esta implementación.
          </p>
        </div>
      )}

    </section>
  );
}