/**
 * ============================================================================
 * BLOQUE EMOCIONAL — Principio EMOTIONAL (Made to Stick, Capítulo 5)
 * ============================================================================
 * 
 * FUNCIÓN: Componente base reutilizable para presentar contenido que hace
 * que el visitante SIENTA algo, no solo que entienda algo.
 * 
 * CONCEPTO VERIFICADO (Capítulo 5):
 * ───────────────────────────────────────────────────────────────────────────
 * El hallazgo central es el estudio de Carnegie Mellon sobre donaciones:
 *   • Carta con estadísticas de crisis alimentaria en África: $1.14 USD promedio
 *   • Carta sobre una sola niña identificada (Rokia, 7 años, Malí): $2.38 USD
 *     (más del doble)
 *   • Combinar ambas cartas: solo $1.43 USD (menos que la historia sola)
 * 
 * Por qué: el cálculo analítico APAGA la respuesta emocional. Confirmado por
 * un segundo experimento: primar a la gente con un cálculo matemático redujo
 * la donación a $1.26, mientras que primarlos con una pregunta emocional la
 * mantuvo en $2.34.
 * 
 * El libro llama a esto la Regla de la Madre Teresa: una historia individual
 * genera más acción que estadísticas agregadas.
 * 
 * Dos técnicas verificadas:
 *   1. WIIFY ("What's In It For You"): hablar en segunda persona, no en
 *      abstracciones. Cambiar "el establecimiento incrementa su ticket" por
 *      "usted incrementa su ticket".
 *   2. Bloque de Visualización (estudio de Tempe, Arizona): pedirle a la
 *      gente que se imaginara a sí misma disfrutando la TV por cable elevó
 *      la suscripción real del 20% al 47%.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 5 "Emotional" — Chip & Dan Heath
 *   • Estudio de Carnegie Mellon (Rokia, 7 años, Malí)
 *   • Estudio de Tempe, Arizona (TV por cable: 20% → 47%)
 *   • Regla de la Madre Teresa
 * 
 * PROPS REQUERIDAS:
 *   • tipo: 'visualizacion' | 'testimonio' | 'wiify'
 *   • titulo: Label de la sección
 *   • contenido: El bloque emocional principal (ReactNode)
 *   • notaTecnica: (opcional) Nota sobre qué principio emocional se aplica
 *   • icono?: (opcional) Icono visual
 * 
 * REGLA DE GOBIERNO:
 *   Ningún bloque del landing debe hablar en tercera persona sobre
 *   "el establecimiento" o "los clientes". Todo debe estar en segunda persona
 *   ("usted", "su barra") o en primera persona del testimonio ("yo", "mi bar").
 * ============================================================================
 */

'use client';

import { type ReactNode } from 'react';

type TipoEmocional = 'visualizacion' | 'testimonio' | 'wiify';

interface BloqueEmocionalProps {
  tipo: TipoEmocional;
  titulo: string;
  contenido: ReactNode;
  notaTecnica?: string;
  icono?: ReactNode;
  citaLibro?: string;
}

const badgeColors: Record<TipoEmocional, string> = {
  'visualizacion': 'bg-rose-900/30 text-rose-300 border-rose-800',
  'testimonio': 'bg-amber-900/30 text-amber-300 border-amber-800',
  'wiify': 'bg-violet-900/30 text-violet-300 border-violet-800',
};

const badgeLabels: Record<TipoEmocional, string> = {
  'visualizacion': 'Visualización (Tempe)',
  'testimonio': 'Regla Madre Teresa',
  'wiify': 'WIIFY (2da persona)',
};

export function BloqueEmocional({
  tipo,
  titulo,
  contenido,
  notaTecnica,
  icono,
  citaLibro,
}: BloqueEmocionalProps) {
  return (
    <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12 hover:border-[#d97325]/50 transition-all">
      
      {/* LABEL DE SECCIÓN + BADGE DE TÉCNICA */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-gray-500 text-sm tracking-widest uppercase font-medium">
          {titulo}
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${badgeColors[tipo]}`}>
          {badgeLabels[tipo]}
        </span>
      </div>

      {/* ICONO (opcional) */}
      {icono && (
        <div className="mb-6 text-[#d97325]">
          {icono}
        </div>
      )}

      {/* CONTENIDO EMOCIONAL */}
      <div className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8">
        {contenido}
      </div>

      {/* NOTA TÉCNICA (opcional, explica por qué funciona emocionalmente) */}
      {notaTecnica && (
        <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800 mb-6">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Por qué funciona emocionalmente:
          </div>
          <div className="text-gray-400 text-sm leading-relaxed">
            {notaTecnica}
          </div>
        </div>
      )}

      {/* CITA DEL LIBRO (opcional, solo en modo desarrollo) */}
      {citaLibro && process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
          <div className="text-xs text-blue-400 uppercase tracking-wider mb-2 font-semibold">
            Referencia Made to Stick (Cap. 5):
          </div>
          <div className="text-blue-200/80 text-sm italic">
            {citaLibro}
          </div>
        </div>
      )}

    </div>
  );
}