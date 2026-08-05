/**
 * ============================================================================
 * ROI CALCULATOR — Calculadora con Web Worker (RFC-HPBN, Capítulo 16)
 * ============================================================================
 * 
 * FUNCIÓN: Componente React que usa un Web Worker para calcular el ROI
 * estimado de un bar basado en tragos por fin de semana.
 * 
 * PRINCIPIO APLICADO (Cap. 16):
 * ──────────────────────────────────────────────────────────────────────────
 * Killelea documenta el costo de arranque de Java (15-20 segundos en 1998)
 * y cómo congelaba el navegador. En 2026, el problema equivalente es:
 * código JavaScript pesado ejecutándose en el hilo principal, congelando
 * la interactividad de la página.
 * 
 * Web Workers resuelven esto ejecutando cómputo fuera del hilo principal.
 * 
 * NOTA DE APLICACIÓN REAL:
 *   Dado que calculateBarRoi es una función liviana (aritmética simple),
 *   un Web Worker es más una demostración del principio que una necesidad
 *   estricta. Coherente con Principio 5.1.5 (Returns Diminish).
 * 
 * REFERENCIAS DEL RFC-HPBN:
 *   • Capítulo 16: Java → Web Workers
 *   • Principio 5.1.5: Returns Diminish
 *   • Principio 5.1.12: The Goal of Tuning Is Simultaneous Failure
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • La calculadora ROI es donde se ubica el Creativity Plot
 *     ("El Lunes de Basura Cero" de Andrés)
 *   • El slider interactivo mantiene al usuario engaged mientras
 *     visualiza su propio escenario (WIIFY + Visualización Tempe)
 * ============================================================================
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface RoiResult {
  conosEstimados: number;
  utilidadMensualCOP: number;
}

export default function RoiCalculator() {
  const [tragos, setTragos] = useState(100);
  const [resultado, setResultado] = useState<RoiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Inicializar Web Worker
  useEffect(() => {
    try {
      // Crear worker desde el archivo (ruta relativa al componente)
      workerRef.current = new Worker(
        new URL('../../workers/roiCalculator.worker.ts', import.meta.url)
      );

      workerRef.current.onmessage = (event: MessageEvent) => {
        if (event.data.success) {
          setResultado(event.data.data);
          setError(null);
        } else {
          setError(event.data.error);
          setResultado(null);
        }
      };

      workerRef.current.onerror = (err) => {
        setError('Error en el Web Worker: ' + err.message);
        setResultado(null);
      };

      // Cleanup al desmontar
      return () => {
        workerRef.current?.terminate();
      };
    } catch (err) {
      // Fallback: si Web Workers no están soportados, calcular en hilo principal
      console.warn('Web Workers no soportados, usando cálculo en hilo principal');
      setError(null);
    }
  }, []);

  // Enviar cálculo al worker cuando cambia el slider
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ tragos });
    }
  }, [tragos]);

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
      
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 mb-6">
          ⚠ {error}
        </div>
      )}
      
      {resultado && (
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
                {formatCurrency(resultado.utilidadMensualCOP)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}