/**
 * ============================================================================
 * PRUEBA DE SINATRA — Principio CREDIBLE (Made to Stick, Capítulo 4)
 * ============================================================================
 * 
 * FUNCIÓN: Reservar espacio para un caso extremo verificado que establezca
 * credibilidad en todo el dominio — SIN inventar un caso ficticio.
 * 
 * CONCEPTO VERIFICADO (Capítulo 4):
 * ───────────────────────────────────────────────────────────────────────────
 * La Prueba de Sinatra (Frank Sinatra: "If I can make it there, I'll make it
 * anywhere"): un solo ejemplo extremo basta para establecer credibilidad en
 * un dominio completo.
 * 
 * Caso del libro: Safexpress (India) ganó la confianza de un estudio de cine
 * para distribuir el lanzamiento de Harry Potter citando que ya había
 * distribuido, sin filtraciones, la película anterior en toda la India.
 * Un solo caso extremo → credibilidad total.
 * 
 * NOTA DE HONESTIDAD (RFC Made to Stick v2.0, Sección 4.2):
 * ───────────────────────────────────────────────────────────────────────────
 * Este componente está INTENCIONALMENTE vacío de caso real. El RFC es
 * explícito: "espacio reservado, sin inventar un caso todavía".
 * 
 * Inventar un caso ficticio aquí violaría el principio de credibilidad
 * interna — si el Gerente de A&B reconoce el nombre del establecimiento
 * y no es real, pierde toda credibilidad el landing.
 * 
 * PROTOCOLO DE ACTIVACIÓN:
 *   Este componente solo debe activarse cuando exista UN caso real verificado
 *   que cumpla:
 *     1. Establecimiento de mayor prestigio en la zona piloto
 *     2. Con cifras verificadas (conos vendidos, utilidad neta)
 *     3. Con testimonio firmado del Gerente de A&B o Head Bartender
 * 
 * COPY RESERVADO (activar solo con caso real):
 *   "Ya servimos en [NOMBRE DEL ESTABLECIMIENTO] — si funciona ahí,
 *    funciona en cualquier barra."
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 4 "Credible" — Chip & Dan Heath
 *   • Ejemplo análogo: Safexpress + Harry Potter (India)
 *   • Principio: "If I can make it there, I'll make it anywhere"
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • STORIES: El caso real activará un Challenge Plot completo
 *   • CONCRETE: El nombre del establecimiento es un sustantivo concreto
 *   • CREDIBLE: Un caso extremo > 100 estadísticas genéricas
 * ============================================================================
 */

'use client';

export function PruebaSinatra() {
  // Estado: ESPERANDO CASO REAL VERIFICADO
  // No se renderiza contenido ficticio por principio de honestidad.
  
  return (
    <div className="bg-[#1f1f1f] border-2 border-dashed border-gray-700 rounded-lg p-8 md:p-12">
      
      {/* BADGE DE ESTADO */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-gray-500 text-sm tracking-widest uppercase font-medium">
          Credibilidad por caso extremo
        </div>
        <span className="text-xs px-2 py-1 rounded border bg-gray-800 text-gray-400 border-gray-700">
          Espacio reservado
        </span>
      </div>

      {/* CONTENIDO DEL PLACEHOLDER */}
      <div className="text-center py-8">
        <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        
        <h3 className="text-xl font-semibold text-gray-400 mb-2">
          Prueba de Sinatra — Pendiente de activar
        </h3>
        
        <p className="text-gray-500 max-w-2xl mx-auto mb-6">
          Este espacio se activará cuando exista un caso real verificado en un
          establecimiento de prestigio de la zona piloto.
        </p>

        {/* COPY RESERVADO (visible solo en modo desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4 max-w-2xl mx-auto text-left">
            <div className="text-xs text-yellow-500 uppercase tracking-wider mb-2 font-semibold">
              Copy reservado (activar con caso real):
            </div>
            <p className="text-yellow-200/80 italic">
              “Ya servimos en [NOMBRE DEL ESTABLECIMIENTO DE MAYOR PRESTIGIO] —
              si funciona ahí, funciona en cualquier barra.”
            </p>
          </div>
        )}
      </div>

      {/* CRITERIOS DE ACTIVACIÓN */}
      <div className="border-t border-gray-800 pt-6 mt-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Criterios para activar este bloque:
        </div>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-gray-600 mt-1">☐</span>
            <span>Establecimiento de mayor prestigio en la zona piloto</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-600 mt-1">☐</span>
            <span>Cifras verificadas (conos vendidos, utilidad neta)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gray-600 mt-1">☐</span>
            <span>Testimonio firmado del Gerente de A&B o Head Bartender</span>
          </li>
        </ul>
      </div>

    </div>
  );
}