/**
 * ============================================================================
 * TESTIMONIO INDIVIDUAL — Principio EMOTIONAL (Made to Stick, Capítulo 5)
 * ============================================================================
 * 
 * FUNCIÓN: Presentar un testimonio centrado en UNA SOLA PERSONA con nombre
 * propio, aplicando la Regla de la Madre Teresa del libro.
 * 
 * CONCEPTO VERIFICADO (Capítulo 5):
 * ───────────────────────────────────────────────────────────────────────────
 * Estudio de Carnegie Mellon sobre donaciones:
 *   • Carta con estadísticas de crisis alimentaria en África: $1.14 USD promedio
 *   • Carta sobre una sola niña identificada (Rokia, 7 años, Malí): $2.38 USD
 *     (más del doble)
 *   • Combinar ambas cartas: solo $1.43 USD (menos que la historia sola)
 * 
 * Segundo experimento (confirmatorio):
 *   • Primar con cálculo matemático → donación reducida a $1.26
 *   • Primar con pregunta emocional → donación mantenida en $2.34
 * 
 * Conclusión del libro: el cálculo analítico APAGA la respuesta emocional.
 * Por eso el testimonio del landing debe centrarse en un solo Bartender con
 * nombre propio, NUNCA en una estadística agregada tipo "87% de nuestros
 * clientes reportan mejores resultados".
 * 
 * NOTA DE HONESTIDAD (RFC Made to Stick v2.0, Sección 5.2):
 * ──────────────────────────────────────────────────────────────────────────
 * Este componente está diseñado para recibir un testimonio REAL. Hasta que
 * exista un caso real verificado, muestra un placeholder con la estructura
 * narrativa correcta — NO inventa un testimonio ficticio.
 * 
 * PROTOCOLO DE ACTIVACIÓN:
 *   Este componente solo debe activarse con un testimonio real que cumpla:
 *     1. Una sola persona con nombre propio (no "nuestros clientes")
 *     2. Rol específico (Head Bartender, Gerente A&B, etc.)
 *     3. Una escena concreta (no generalidades)
 *     4. Al menos una cifra verificada
 *     5. Una acción inspiradora al final
 * 
 * COPY RESERVADO (activar solo con testimonio real):
 *   [Nombre], [Rol] de [Establecimiento]:
 *   "[Escena concreta con cifra verificada]. [Acción inspiradora]."
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 5 "Emotional" — Chip & Dan Heath
 *   • Caso de Rokia (7 años, Malí) — Regla de la Madre Teresa
 *   • Principio: una historia individual > estadísticas agregadas
 * 
 * INTEGRACIÓN CON OTROS PRINCIPIOS:
 *   • STORIES: El testimonio es una micro-historia (mini Challenge Plot)
 *   • CONCRETE: Nombre propio + rol específico + escena concreta
 *   • CREDIBLE: Testimonio real > estadística genérica
 * ============================================================================
 */

'use client';

import { BloqueEmocional } from './BloqueEmocional';

interface TestimonioReal {
  nombre: string;
  rol: string;
  establecimiento: string;
  escena: string;
  cifra: string;
  accionInspiradora: string;
}

interface TestimonioIndividualProps {
  /** Testimonio real verificado. Si no se pasa, muestra placeholder. */
  testimonio?: TestimonioReal;
}

export function TestimonioIndividual({ testimonio }: TestimonioIndividualProps = {}) {
  // Si no hay testimonio real, mostrar placeholder honesto
  if (!testimonio) {
    return (
      <div className="bg-[#1f1f1f] border-2 border-dashed border-gray-700 rounded-lg p-8 md:p-12">
        
        {/* BADGE DE ESTADO */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-gray-500 text-sm tracking-widest uppercase font-medium">
            Testimonio individual
          </div>
          <span className="text-xs px-2 py-1 rounded border bg-gray-800 text-gray-400 border-gray-700">
            Regla Madre Teresa — Esperando caso real
          </span>
        </div>

        {/* CONTENIDO DEL PLACEHOLDER */}
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          
          <h3 className="text-xl font-semibold text-gray-400 mb-2">
            Testimonio individual — Pendiente de activar
          </h3>
          
          <p className="text-gray-500 max-w-2xl mx-auto mb-6">
            Este espacio se activará con el testimonio de un solo bartender o
            gerente con nombre propio, siguiendo la Regla de la Madre Teresa.
          </p>

          {/* COPY RESERVADO (visible solo en modo desarrollo) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4 max-w-2xl mx-auto text-left">
              <div className="text-xs text-amber-500 uppercase tracking-wider mb-2 font-semibold">
                Estructura requerida (activar con testimonio real):
              </div>
              <div className="space-y-2 text-amber-200/80 text-sm">
                <p><strong>Nombre:</strong> [Nombre propio, no "un cliente"]</p>
                <p><strong>Rol:</strong> [Head Bartender / Gerente A&B / Dueño]</p>
                <p><strong>Escena:</strong> [Momento específico, no generalidad]</p>
                <p><strong>Cifra:</strong> [Número verificado, no "mejoró mucho"]</p>
                <p><strong>Acción:</strong> [Qué hizo después, no "recomendado"]</p>
              </div>
            </div>
          )}
        </div>

        {/* CRITERIOS DE ACTIVACIÓN */}
        <div className="border-t border-gray-800 pt-6 mt-6">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Criterios para activar este bloque (Regla de la Madre Teresa):
          </div>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-gray-600 mt-1"></span>
              <span>Una sola persona con nombre propio (no "nuestros clientes")</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 mt-1">☐</span>
              <span>Rol específico (Head Bartender, Gerente A&B, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 mt-1">☐</span>
              <span>Una escena concreta (no generalidades tipo "excelente servicio")</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 mt-1">☐</span>
              <span>Al menos una cifra verificada (conos vendidos, propinas, tiempo)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-600 mt-1">☐</span>
              <span>Una acción inspiradora al final (no solo "recomendado")</span>
            </li>
          </ul>
        </div>

        {/* EXPLICACIÓN DE POR QUÉ NO USAMOS ESTADÍSTICAS */}
        <div className="border-t border-gray-800 pt-6 mt-6">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Por qué no usamos "87% de nuestros clientes reportan mejores resultados":
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            El estudio de Carnegie Mellon mostró que las estadísticas agregadas{' '}
            <strong className="text-[#f5f5f5]">apagan la respuesta emocional</strong>. Una carta sobre
            una sola niña (Rokia, 7 años) generó el doble de donaciones que una carta con estadísticas
            de crisis alimentaria.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed mt-2">
            Cifras del estudio: <strong className="text-[#d97325]">$1.14 USD</strong> (estadísticas) vs{' '}
            <strong className="text-[#d97325]">$2.38 USD</strong> (historia individual de Rokia).
            Combinar ambas generó solo <strong className="text-[#d97325]">$1.43 USD</strong> — menos que
            la historia sola, porque el cálculo analítico apaga la respuesta emocional.
          </p>
        </div>

      </div>
    );
  }

  // Si hay testimonio real, renderizarlo con la estructura emocional correcta
  return (
    <BloqueEmocional
      tipo="testimonio"
      titulo={`Testimonio de ${testimonio.nombre}`}
      contenido={
        <div className="space-y-6">
          {/* CITA DEL TESTIMONIO */}
          <blockquote className="border-l-4 border-[#d97325] pl-6 py-2">
            <p className="text-2xl md:text-3xl text-[#f5f5f5] leading-relaxed italic">
              "{testimonio.escena}"
            </p>
          </blockquote>

          {/* CIFRA DESTACADA */}
          <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
            <div className="text-xs text-[#d97325] uppercase tracking-wider mb-2 font-semibold">
              Resultado verificado:
            </div>
            <div className="text-3xl md:text-4xl font-bold text-[#d97325]">
              {testimonio.cifra}
            </div>
          </div>

          {/* ACCIÓN INSPIRADORA */}
          <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Lo que hizo después:
            </div>
            <div className="text-gray-200 text-lg">
              {testimonio.accionInspiradora}
            </div>
          </div>

          {/* FIRMA */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-800">
            <div className="w-12 h-12 rounded-full bg-[#d97325]/20 flex items-center justify-center text-[#d97325] font-bold text-xl">
              {testimonio.nombre.charAt(0)}
            </div>
            <div>
              <div className="text-[#f5f5f5] font-semibold">
                {testimonio.nombre}
              </div>
              <div className="text-gray-500 text-sm">
                {testimonio.rol} · {testimonio.establecimiento}
              </div>
            </div>
          </div>
        </div>
      }
      notaTecnica={
        <>
          <p className="mb-3">
            Este testimonio sigue la <strong className="text-[#f5f5f5]">Regla de la Madre Teresa</strong>: una
            sola persona con nombre propio genera más acción que estadísticas agregadas.
          </p>
          <p>
            El estudio de Carnegie Mellon mostró que una carta sobre una sola niña (Rokia, 7 años) generó{' '}
            <strong className="text-[#f5f5f5]">$2.38 USD</strong> en donaciones, mientras que una carta con
            estadísticas de crisis alimentaria generó solo <strong className="text-[#f5f5f5]">$1.14 USD</strong>.
            Combinar ambas generó menos que la historia sola ($1.43), porque el cálculo analítico apaga la
            respuesta emocional.
          </p>
        </>
      }
      citaLibro="Regla de la Madre Teresa: una historia individual (Rokia, 7 años, Malí) generó el doble de donaciones que estadísticas agregadas. — Cap. 5, Made to Stick"
      icono={
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      }
    />
  );
}