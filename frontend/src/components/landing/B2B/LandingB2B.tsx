'use client';

import MarginCalculator from './MarginCalculator';
import PilotKitForm from './PilotKitForm';

export default function LandingB2B() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#f5f5f5]">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 bg-[#1a1a1a]/95 backdrop-blur z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-2xl font-bold text-[#d97325]">BOCAZO</div>
              <div className="hidden md:flex space-x-6">
                <a href="#landing" className="text-[#d97325] font-medium">Landing B2B</a>
                <a href="#dashboard" className="text-gray-400 hover:text-white transition">Dashboard Aliado</a>
                <a href="#qr" className="text-gray-400 hover:text-white transition">El Llamado (QR)</a>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="landing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-[#d97325] text-sm font-semibold mb-4 tracking-wide">
            BOCAZO PARA GASTROBARES
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Experiencia de autor sin cocina para tu bar
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            Ensamble en barra &lt;30 segundos. Cero freidoras. Consignación a coste cero.{' '}
            <span className="text-[#d97325] font-semibold">73.4% de margen</span> para tu establecimiento desde la primera noche.
          </p>
          
          <button 
            onClick={() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-[#d97325] hover:bg-[#c4641f] text-white font-bold py-4 px-10 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Solicitar Kit Piloto de 14 Días
          </button>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 px-6 bg-[#1f1f1f]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-gray-400 text-sm mb-12 tracking-widest">
            EL MOMENTO BOCAZO EN MESA
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden border-2 border-dashed border-gray-600 hover:border-[#d97325] transition p-8">
              <div className="aspect-[3/4] flex flex-col items-center justify-center text-gray-500">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-center text-sm font-medium">
                  Foto: Soporte + Bocado + trago
                </p>
                <p className="text-xs mt-2 text-gray-600">or browse files</p>
              </div>
            </div>

            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden border-2 border-dashed border-gray-600 hover:border-[#d97325] transition p-8">
              <div className="aspect-[3/4] flex flex-col items-center justify-center text-gray-500">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-center text-sm font-medium">
                  Foto: Ensamble en barra
                </p>
                <p className="text-xs mt-2 text-gray-600">or browse files</p>
              </div>
            </div>

            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden border-2 border-dashed border-gray-600 hover:border-[#d97325] transition p-8">
              <div className="aspect-[3/4] flex flex-col items-center justify-center text-gray-500">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-center text-sm font-medium">
                  Foto: Detalle del isotipo grabado
                </p>
                <p className="text-xs mt-2 text-gray-600">or browse files</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Margin Calculator */}
      <MarginCalculator />

      {/* Pilot Kit Form */}
      <PilotKitForm />

      {/* Footer */}
      <footer className="bg-[#0f0f0f] py-12 px-6 mt-20">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p className="text-sm">© 2024 BOCAZO. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}