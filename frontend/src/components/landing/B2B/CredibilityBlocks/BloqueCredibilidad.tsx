/**
 * ============================================================================
 * BLOQUE CREDIBILIDAD — Principio CREDIBLE (Made to Stick, Capítulo 4)
 * ============================================================================
 * 
 * FUNCIÓN: Componente base reutilizable para presentar estadísticas con
 * credibilidad interna — sin depender de autoridad externa.
 * 
 * CONCEPTO VERIFICADO (Capítulo 4):
 * ───────────────────────────────────────────────────────────────────────────
 * El libro distingue entre credibilidad EXTERNA (autoridad, celebridades,
 * logos de clientes) y credibilidad INTERNA — mecanismos que permiten que la
 * propia idea se autoverifique.
 * 
 * Tres técnicas verificadas:
 *   1. Principio de Escala Humana
 *   2. La Prueba de Sinatra
 *   3. Detalles verificables sobre estadísticas genéricas
 * 
 * REFERENCIAS DEL LIBRO:
 *   • Capítulo 4 "Credible" — Chip & Dan Heath
 *   • Experimento de la piedra: lanzar del Sol a la Tierra (58% "muy
 *     impresionante") vs. de Nueva York a Los Ángeles (83%) — misma
 *     precisión matemática, diferente escala humanamente comprensible
 *   • Caso Safexpress (India): distribuyó Harry Potter sin filtraciones →
 *     ganó la confianza de un estudio de cine completo (Prueba de Sinatra)
 *   • Tiburones vs. venados: 300 veces más mortal colisión de auto, pero
 *     nadie le teme a los venados (detalle verificable)
 * 
 * PROPS REQUERIDAS:
 *   • tipo: 'escala-humana' | 'prueba-sinatra' | 'detalle-verificable'
 *   • titulo: Label de la sección
 *   • estadisticaAbstracta: La cifra original (ej: "73.4% de margen")
 *   • traduccionHumana: La cifra traducida (ej: "$7,300 de cada $10,000")
 *   • contextoVerificable: Escena o comparación que permite autoverificación
 *   • notaHonestidad: (opcional) Nota sobre el estado de verificación
 * 
 * REGLA DE GOBIERNO:
 *   Ninguna estadística debe aparecer en el landing sin pasar por al menos
 *   una de las 3 técnicas de credibilidad interna. Si no puede traducirse,
 *   se elimina.
 * ============================================================================
 */

'use client';

import { type ReactNode } from 'react';

type TipoCredibilidad = 'escala-humana' | 'prueba-sinatra' | 'detalle-verificable';

interface BloqueCredibilidadProps {
  tipo: TipoCredibilidad;
  titulo: string;
  estadisticaAbstracta: string;
  traduccionHumana: string;
  contextoVerificable: ReactNode;
  notaHonestidad?: string;
  icono?: ReactNode;
}

const badgeColors: Record<TipoCredibilidad, string> = {
  'escala-humana': 'bg-blue-900/30 text-blue-300 border-blue-800',
  'prueba-sinatra': 'bg-purple-900/30 text-purple-300 border-purple-800',
  'detalle-verificable': 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
};

const badgeLabels: Record<TipoCredibilidad, string> = {
  'escala-humana': 'Escala Humana',
  'prueba-sinatra': 'Prueba de Sinatra',
  'detalle-verificable': 'Detalle Verificable',
};

export function BloqueCredibilidad({
  tipo,
  titulo,
  estadisticaAbstracta,
  traduccionHumana,
  contextoVerificable,
  notaHonestidad,
  icono,
}: BloqueCredibilidadProps) {
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

      {/* ESTADÍSTICA ABSTRACTA (tachada, para mostrar la transformación) */}
      <div className="mb-4">
        <div className="text-xs text-gray-600 uppercase tracking-wider mb-1">
          En lugar de decir:
        </div>
        <div className="text-gray-500 line-through text-lg">
          {estadisticaAbstracta}
        </div>
      </div>

      {/* TRADUCCIÓN HUMANA (destacada) */}
      <div className="mb-8">
        <div className="text-xs text-[#d97325] uppercase tracking-wider mb-2 font-semibold">
          Decimos:
        </div>
        <div className="text-2xl md:text-3xl font-bold text-[#f5f5f5] leading-tight">
          {traduccionHumana}
        </div>
      </div>

      {/* CONTEXTO VERIFICABLE */}
      <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800 mb-6">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
          Por qué es creíble:
        </div>
        <div className="text-gray-300 leading-relaxed">
          {contextoVerificable}
        </div>
      </div>

      {/* NOTA DE HONESTIDAD (opcional, para Prueba de Sinatra) */}
      {notaHonestidad && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-yellow-200/80 text-sm">
              {notaHonestidad}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}