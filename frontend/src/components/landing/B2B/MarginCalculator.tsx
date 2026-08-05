'use client';

import { useState } from 'react';

export default function MarginCalculator() {
  const [activeTables, setActiveTables] = useState(20);
  
  // Fórmula de cálculo (ajustar según modelo de negocio real)
  const monthlyProfit = Math.round(activeTables * 318150); // Ejemplo: $318,150 COP por mesa
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('COP', 'COP/mes');
  };

  return (
    <section className="py-20 px-6 bg-[#1a1a1a]">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-8 md:p-12">
          <div className="text-gray-400 text-sm mb-2 tracking-widest">
            CALCULADORA DE MARGEN
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            ¿Cuánto puede ganar tu barra?
          </h2>
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <label className="text-gray-300 font-medium">Mesas activas por noche</label>
              <span className="text-[#d97325] text-2xl font-bold">{activeTables}</span>
            </div>
            
            <input
              type="range"
              min="1"
              max="50"
              value={activeTables}
              onChange={(e) => setActiveTables(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#d97325]"
            />
            
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="text-gray-400 text-sm mb-2">GANANCIA MENSUAL PROYECTADA</div>
            <div className="text-4xl md:text-5xl font-bold text-[#f5f5f5]">
              {formatCurrency(monthlyProfit)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}