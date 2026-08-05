/**
 * ============================================================================
 * STORY CARD — Principio STORIES (Made to Stick, Capítulo 6)
 * ============================================================================
 * 
 * FUNCIÓN: Componente base reutilizable para presentar historias que funcionan
 * como simuladores de vuelo (dan conocimiento de cómo actuar) y fuente de
 * inspiración (dan la motivación para actuar).
 * 
 * CONCEPTO VERIFICADO (Capítulo 6):
 * ──────────────────────────────────────────────────────────────────────────
 * El libro cierra el marco SUCCESs con el principio más poderoso para generar
 * acción: las historias funcionan como simuladores de vuelo y como fuente de
 * inspiración — mientras que la credibilidad hace que la gente crea, y la
 * emoción hace que le importe, las historias son las que hacen que la gente
 * ACTÚE.
 * 
 * Tres plots arquetípicos verificados:
 *   1. Challenge Plot: superar un obstáculo formidable (Jared Fogle, Subway)
 *   2. Connection Plot: conectar a través de un puente de desconfianza
 *   3. Creativity Plot: resolver un problema de forma innovadora
 * 
 * Por qué las historias derrotan la Maldición del Conocimiento:
 *   Son naturalmente concretas, emocionalmente resonantes, y creíbles porque
 *   involucran personas reales en situaciones específicas — el antídoto
 *   estructural contra los otros 5 principios fallando por separado.
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 6 "Stories" — Chip & Dan Heath
 *   • Caso de la enfermera neonatal (simulador + inspiración)
 *   • Shop talk de Xerox con código EO53 (dicorotron quemado)
 *   • Jared Fogle de Subway (Challenge Plot arquetípico)
 *   • Stephen Denning y el trabajador de salud en Zambia (Springboard Story)
 *   • Bob Ocwieja spotting la historia de Jared (no la creó, la encontró)
 * 
 * PROPS REQUERIDAS:
 *   • plotType: 'challenge' | 'connection' | 'creativity'
 *   • titulo: Nombre de la historia
 *   • protagonista: Nombre + rol de la persona
 *   • escenario: Contexto inicial (dolor/obstáculo)
 *   • desarrollo: Cómo se resolvió (con cifras verificadas)
 *   • desenlace: Resultado concreto + acción inspiradora
 *   • cifrasVerificadas: Array de cifras con verificación aritmética
 *   • notaHonestidad: (opcional) Indicar si es arquetipo o caso real
 * 
 * REGLA DE GOBIERNO (Sección 6.6 del RFC):
 *   Cada historia debe pasar el test del núcleo Simple ("20 segundos, sin
 *   cambiar nada"). Si una historia no refuerza este núcleo, se mueve a una
 *   sección secundaria del landing o se elimina.
 * ============================================================================
 */

'use client';

import { type ReactNode } from 'react';

type PlotType = 'challenge' | 'connection' | 'creativity';

interface CifraVerificada {
  valor: string;
  descripcion: string;
  verificacion?: string; // Fórmula aritmética
}

interface StoryCardProps {
  plotType: PlotType;
  titulo: string;
  protagonista: string;
  escenario: ReactNode;
  desarrollo: ReactNode;
  desenlace: ReactNode;
  cifrasVerificadas: CifraVerificada[];
  notaHonestidad?: string;
  icono?: ReactNode;
}

const plotLabels: Record<PlotType, string> = {
  'challenge': 'Challenge Plot',
  'connection': 'Connection Plot',
  'creativity': 'Creativity Plot',
};

const plotColors: Record<PlotType, string> = {
  'challenge': 'bg-red-900/30 text-red-300 border-red-800',
  'connection': 'bg-blue-900/30 text-blue-300 border-blue-800',
  'creativity': 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
};

export function StoryCard({
  plotType,
  titulo,
  protagonista,
  escenario,
  desarrollo,
  desenlace,
  cifrasVerificadas,
  notaHonestidad,
  icono,
}: StoryCardProps) {
  return (
    <article className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12 hover:border-[#d97325]/50 transition-all">
      
      {/* HEADER: Título + Badge de Plot Type */}
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-2xl md:text-3xl font-bold text-[#f5f5f5]">
          {titulo}
        </h3>
        <span className={`text-xs px-2 py-1 rounded border ${plotColors[plotType]}`}>
          {plotLabels[plotType]}
        </span>
      </div>

      {/* ICONO (opcional) */}
      {icono && (
        <div className="mb-6 text-[#d97325]">
          {icono}
        </div>
      )}

      {/* PROTAGONISTA */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Protagonista:
        </div>
        <div className="text-lg text-[#d97325] font-semibold">
          {protagonista}
        </div>
      </div>

      {/* ESTRUCTURA NARRATIVA EN 3 ACTOS */}
      
      {/* ACTO 1: Escenario (dolor/obstáculo) */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          El desafío:
        </div>
        <div className="text-gray-300 leading-relaxed">
          {escenario}
        </div>
      </div>

      {/* ACTO 2: Desarrollo (cómo se resolvió) */}
      <div className="mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Lo que pasó:
        </div>
        <div className="text-gray-300 leading-relaxed">
          {desarrollo}
        </div>
      </div>

      {/* ACTO 3: Desenlace (resultado + acción inspiradora) */}
      <div className="mb-8">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          El resultado:
        </div>
        <div className="text-gray-200 leading-relaxed font-medium">
          {desenlace}
        </div>
      </div>

      {/* CIFRAS VERIFICADAS */}
      {cifrasVerificadas.length > 0 && (
        <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800 mb-6">
          <div className="text-xs text-[#d97325] uppercase tracking-wider mb-4 font-semibold">
            Cifras verificadas:
          </div>
          <div className="space-y-3">
            {cifrasVerificadas.map((cifra, idx) => (
              <div key={idx} className="flex flex-col md:flex-row md:items-baseline gap-2">
                <span className="text-2xl font-bold text-[#d97325]">
                  {cifra.valor}
                </span>
                <span className="text-gray-400 text-sm">
                  {cifra.descripcion}
                </span>
                {cifra.verificacion && (
                  <span className="text-xs text-gray-600 font-mono">
                    ({cifra.verificacion})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTA DE HONESTIDAD */}
      {notaHonestidad && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-yellow-200/80 text-sm">
              {notaHonestidad}
            </div>
          </div>
        </div>
      )}

    </article>
  );
}