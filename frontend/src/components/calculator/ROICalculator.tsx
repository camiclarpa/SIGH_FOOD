/**
 * components/calculator/ROICalculator.tsx
 *
 * Componente de UI que usa ROICalculatorInput/Output y calcularRoi.
 * Implementa el slider interactivo con actualización en tiempo real.
 */
'use client';

import { useState, useMemo } from 'react';
import { calcularRoi } from '../../domain/roi/calcularRoi';
import { ROICalculatorInput } from '../../domain/roi/ROICalculatorInput';
import { ROICalculatorOutput } from '../../domain/roi/ROICalculatorOutput';

interface ROICalculatorProps {
  initialValue?: number;
  onRoiChange?: (output: ROICalculatorOutput) => void;
}

export default function ROICalculator({
  initialValue = 100,
  onRoiChange,
}: ROICalculatorProps) {
  const [tragosPerFinDeSemana, setTragosPerFinDeSemana] = useState<number>(initialValue);

  const resultado: ROICalculatorOutput = useMemo(() => {
    const input: ROICalculatorInput = { tragosPerFinDeSemana };
    return calcularRoi(input);
  }, [tragosPerFinDeSemana]);

  useMemo(() => {
    onRoiChange?.(resultado);
  }, [resultado, onRoiChange]);

  const formatCurrency = (amount: number): string => {
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
          <label htmlFor="tragos-slider" className="text-gray-300 font-medium">
            Tragos servidos por fin de semana
          </label>
          <span className="text-[#d97325] text-2xl font-bold tabular-nums">
            {tragosPerFinDeSemana}
          </span>
        </div>

        <input
          id="tragos-slider"
          type="range"
          min="10"
          max="1000"
          step="10"
          value={tragosPerFinDeSemana}
          onChange={(e) => setTragosPerFinDeSemana(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#d97325]"
          aria-label="Cantidad de tragos por fin de semana"
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
            <div className="text-3xl md:text-4xl font-bold text-[#d97325] tabular-nums">
              {resultado.conosEstimadosPorMes}
            </div>
          </div>

          <div className="bg-[#0f0f0f] rounded-lg p-6 border border-gray-800">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Ganancia mensual proyectada
            </div>
            <div className="text-3xl md:text-4xl font-bold text-[#f5f5f5] tabular-nums">
              {formatCurrency(resultado.gananciaNetaMensualCOP)}
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Cálculo basado en 20% de conversión y $23,500 COP de utilidad neta por cono.
          Resultados estimados, no garantizados.
        </p>
      </div>
    </div>
  );
}