'use client';

import { useState } from 'react';
import { calculateROI, formatCOP } from '@/domain/roiCalculator';

export default function ROICalculator() {
  const [tragosPorFinDeSemana, setTragosPorFinDeSemana] = useState(50);
  const resultado = calculateROI({ tragosPorFinDeSemana });

  return (
    <section className="py-16 px-4 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Calcula tu ganancia potencial</h2>
        
        <div className="mb-8">
          <label className="block mb-4 text-lg text-center">
            Conos vendidos por fin de semana: 
            <span className="ml-2 text-orange-400 font-bold">{tragosPorFinDeSemana}</span>
          </label>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={tragosPorFinDeSemana}
            onChange={(e) => setTragosPorFinDeSemana(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Ganancia Semanal</p>
            <p className="text-2xl font-bold text-green-400">{formatCOP(resultado.gananciaSemanal)}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl text-center border-2 border-orange-500 shadow-lg">
            <p className="text-gray-400 text-sm">Ganancia Mensual</p>
            <p className="text-3xl font-bold text-orange-400">{formatCOP(resultado.gananciaMensual)}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl text-center">
            <p className="text-gray-400 text-sm">Ganancia Anual</p>
            <p className="text-2xl font-bold text-green-400">{formatCOP(resultado.gananciaAnual)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
