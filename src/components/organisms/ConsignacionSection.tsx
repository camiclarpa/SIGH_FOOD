export default function ConsignacionSection() {
  return (
    <section className="py-20 px-6 bg-gradient-to-br from-orange-500 to-red-600 text-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-8">Oferta Sin Riesgo: Consignación de Fin de Semana</h2>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div><div className="text-5xl font-bold mb-2">30</div><div className="text-lg">Unidades Consignadas</div></div>
            <div><div className="text-5xl font-bold mb-2">$32K</div><div className="text-lg">Precio de Venta al Comensal</div></div>
            <div><div className="text-5xl font-bold mb-2">$23.5K</div><div className="text-lg">Utilidad Neta para Tu Bar</div></div>
          </div>
        </div>
        <p className="text-xl mb-8 max-w-3xl mx-auto">
          "Le dejo 30 unidades consignadas para este fin de semana. Usted las vende a $32,000 COP, el lunes se queda con $23,500 COP por cono y a mí me paga $8,500 COP."
        </p>
        <a href="#agendar" className="inline-block bg-white text-orange-600 font-bold py-4 px-8 rounded-lg text-lg hover:bg-gray-100 transition-colors shadow-lg">
          Solicitar Kit Piloto para Este Fin de Semana
        </a>
      </div>
    </section>
  );
}
