export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center mb-8">
          <div className="bg-orange-500 text-white text-6xl font-bold py-4 px-8 rounded-lg shadow-2xl">
            0:19
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-center mb-6 leading-tight">
          El único plato que se sirve en su barra en menos de 20 segundos
          <span className="block text-orange-400 mt-2">y que su bar ya sabe hacer, sin saberlo.</span>
        </h1>

        <p className="text-xl text-center text-gray-300 mb-10 max-w-3xl mx-auto">
          ¿Cuánto dinero está dejando sobre la mesa cada vez que un cliente termina su segundo trago y no pide nada más?
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <a href="#agendar" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all shadow-lg hover:shadow-xl">
            Agendar Cata Presencial y Fin de Semana Piloto
          </a>
          <a href="#calculadora" className="bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all">
            Calcular mi Ganancia Potencial
          </a>
        </div>
      </div>
    </section>
  );
}
