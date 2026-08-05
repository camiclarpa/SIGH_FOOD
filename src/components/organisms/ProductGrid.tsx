const products = [
  { name: "The Spicy Volcano Cone", pairing: "Mezcal, Tequila, Coctelería Ahumada/Agave", color: "from-red-500 to-orange-500" },
  { name: "Sweet & Salty Caramel Cone", pairing: "Bourbon, Whisky, Coctelería Dulce", color: "from-amber-500 to-yellow-500" },
  { name: "Herbal Citrus Botanical Cone", pairing: "Gin-Tonic, Coctelería Cítrica", color: "from-green-500 to-teal-500" },
  { name: "Smoked Cheese & Truffle Cone", pairing: "Vinos Tintos, Espumosos, Martinis", color: "from-purple-500 to-pink-500" },
  { name: "Tropical Anise & Fusion Cone", pairing: "Ron Añejo, Coctelería Tiki", color: "from-blue-500 to-cyan-500" },
];

export default function ProductGrid() {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Nuestro Portafolio de 5 Conos RTA</h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">Maridaje perfecto para cada tipo de coctelería de autor. Ensamblado en menos de 20 segundos.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {products.map((product, index) => (
          <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow">
            <div className={`h-32 bg-gradient-to-r ${product.color} flex items-center justify-center`}>
              <span className="text-white text-6xl">🍦</span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h3>
              <p className="text-gray-600 mb-4"><span className="font-semibold">Maridaje:</span> {product.pairing}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full">⏱️ < 20 segundos</span>
                <span className="text-sm text-gray-500">Utilidad: $23,500 COP</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
