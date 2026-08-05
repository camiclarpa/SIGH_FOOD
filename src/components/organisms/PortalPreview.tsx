export default function PortalPreview() {
  const features = [
    { icon: "📦", title: "Reabastecimiento en 1 Clic", description: "Pide cajas de recarga de conos o elixires cuando se agote el stock en barra." },
    { icon: "💰", title: "Reporte y Pago de Consignación", description: "Reporta los conos vendidos el fin de semana y liquida vía Wompi, PSE o tarjeta." },
    { icon: "🎓", title: "Academy: Videos de 15 Segundos", description: "Capacita a tus bartenders con micro-videos de ensamble sin sonido, con subtítulos." },
    { icon: "📱", title: "Códigos QR para Mesas", description: "El comensal escanea, ve el video del ensamble y se antoja de pedir." }
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto text-center mb-16">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Portal del Aliado (Web App)</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">Una vez que te conviertas en cliente, accedes a nuestra plataforma PWA donde gestionas todo desde el celular de tu bartender.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {features.map((feature, index) => (
          <div key={index} className="bg-gray-50 p-8 rounded-xl border border-gray-200 hover:border-orange-500 transition-colors text-left">
            <div className="text-5xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
