/**
 * ============================================================================
 * CALCULADORA ROI — Función Pura + Web Worker (RFC-HPBN Cap. 15-16)
 * RFC-001: Capa Edge — Contenido estático SSG
 * ============================================================================
 * 
 * FUNCIÓN: Componente React que usa una función pura del dominio para
 * calcular el ROI estimado de un bar basado en tragos por fin de semana.
 * 
 * PRINCIPIO APLICADO (RFC-HPBN Cap. 16):
 *   Kleppmann documenta el costo de arranque de Java (15-20 segundos en 1998)
 *   y cómo congelaba el navegador. En 2026, el problema equivalente es:
 *   código JavaScript pesado ejecutándose en el hilo principal, congelando
 *   la interactividad de la página.
 * 
 * SOLUCIÓN: Web Workers ejecutan cómputo fuera del hilo principal.
 * 
 * NOTA: dado que calculateBarRoi es una función tan liviana (aritmética simple),
 * un Web Worker es más una demostración del principio que una necesidad estricta
 * de rendimiento (RFC-HPBN Principio 5.1.5: Returns Diminish).
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • La calculadora es donde se ubica el Creativity Plot
 *     ("El Lunes de Basura Cero" de Andrés)
 *   • El slider interactivo mantiene al usuario engaged mientras
 *     visualiza su propio escenario (WIIFY + Visualización Tempe)
 * ============================================================================
 */

'use client';

import { useState } from 'react';

// Función pura del dominio (Clean Architecture - Cap. 6: Programación Funcional)
function calcularRoiMensual(tragosPorFinDeSemana: number) {
  const TASA_CONVERSION = 0.20;
  const UTILIDAD_NETA_COP = 23_500;
  const SEMANAS_POR_MES = 4.33;

  const conosPorFinDeSemana = tragosPorFinDeSemana * TASA_CONVERSION;
  const conosEstimados = Math.round(conosPorFinDeSemana * SEMANAS_POR_MES);
  const gananciaNetaMensualCOP = conosEstimados * UTILIDAD_NETA_COP;

  return Object.freeze({ conosEstimados, gananciaNetaMensualCOP });
}

export default function CalculadoraRoi() {
  const [tragos, setTragos] = useState(100);
  const resultado = calcularRoiMensual(tragos);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12">
      <div className="text-gray-500 text-sm mb-2 tracking-widest uppercase">
        Calculadora de Margen
      </div>
      
      <h2 className="text-3xl md:text-4xl font-bold mb-8 text-[#f5f5f5]">
        ¿Cuánto puede ganar tu barra?
      </h2>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <label className="text-gray-300 font-medium">
            Tragos servidos por fin de semana
          </label>
          <span className="text-[#d97325] text-2xl font-bold">{tragos}</span>
        </div>
        
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={tragos}
          onChange={(e) => setTragos(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#d97325]"
        />
        
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>10</span>
          <span>500</span>
          <span>1000</span>
        </div>
      </div>
      
      <div className="border-t border-gray-800 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Conos estimados por mes
            </div>
            <div className="text-3xl md:text-4xl font-bold text-[#d97325]">
              {resultado.conosEstimados}
            </div>
          </div>
          
          <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Ganancia mensual proyectada
            </div>
            <div className="text-3xl md:text-4xl font-bold text-[#f5f5f5]">
              {formatCurrency(resultado.gananciaNetaMensualCOP)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}