export default function LeadForm() {
  return (
    <section id="agendar" className="py-20 px-6 bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Agenda tu Demo Phygital</h2>
          <p className="text-xl text-gray-300">Te contactaremos en menos de 24 horas para coordinar la entrega de tu lote piloto en consignación.</p>
        </div>
        <form className="space-y-6 bg-gray-800 p-8 rounded-xl border border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Establecimiento</label>
            <input type="text" className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="Gastrobar, Hotel, Rooftop" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tomador de Decisión</label>
            <input type="text" className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="Dueño, Gerente A&B, Head Bartender" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono / WhatsApp Directo</label>
            <input type="tel" className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="+57 300 123 4567" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Licores más vendidos en tu carta</label>
            <input type="text" className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="Ej: Gin, Mezcal, Ron, Whisky" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Volumen de tragos por fin de semana (aprox.)</label>
            <input type="number" className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" placeholder="100" />
          </div>
          <button type="button" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-4 rounded-lg transition-colors shadow-lg text-lg">
            Agendar Cata Presencial y Fin de Semana Piloto en Consignación
          </button>
          <p className="text-center text-sm text-gray-400">Sin compromiso. Sin riesgo de inventario. Solo resultados.</p>
        </form>
      </div>
    </section>
  );
}
