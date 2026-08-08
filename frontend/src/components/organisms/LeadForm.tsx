'use client';

import { useState } from 'react';
import { useResilientForm, LeadData } from '@/hooks/useResilientForm';

export default function LeadForm() {
  const [formData, setFormData] = useState<LeadData>({
    establishmentName: '',
    decisionMaker: '',
    phone: '',
    topLiquors: '',
    estimatedWeeklyVolume: 100,
  });

  const { 
    isOnline, 
    isSubmitting, 
    submitError, 
    whatsappLink, 
    handleSubmit
  } = useResilientForm();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedWeeklyVolume' ? Number(value) : value
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await handleSubmit(formData);
    
    if (result?.success) {
      alert('¡Formulario enviado exitosamente! Nos pondremos en contacto pronto.');
      setFormData({
        establishmentName: '',
        decisionMaker: '',
        phone: '',
        topLiquors: '',
        estimatedWeeklyVolume: 100,
      });
    }
  };

  return (
    <section id="agendar" className="py-20 px-6 bg-gray-900 text-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Agenda tu Demo Phygital</h2>
          <p className="text-xl text-gray-300">
            Te contactaremos en menos de 24 horas para coordinar la entrega de tu lote piloto.
          </p>
          
          {/* Indicador de estado de red */}
          <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isOnline ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
            {isOnline ? 'Conexión activa' : 'Modo sin conexión (Datos guardados localmente)'}
          </div>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6 bg-gray-800 p-8 rounded-xl border border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Establecimiento</label>
            <input 
              type="text" 
              name="establishmentName"
              value={formData.establishmentName}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              placeholder="Gastrobar, Hotel, Rooftop" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tomador de Decisión</label>
            <input 
              type="text" 
              name="decisionMaker"
              value={formData.decisionMaker}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              placeholder="Dueño, Gerente A&B, Head Bartender" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono / WhatsApp Directo</label>
            <input 
              type="tel" 
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              placeholder="+57 300 123 4567" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Licores más vendidos en tu carta</label>
            <input 
              type="text" 
              name="topLiquors"
              value={formData.topLiquors}
              onChange={handleChange}
              required
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              placeholder="Ej: Gin, Mezcal, Ron, Whisky" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Volumen de tragos por fin de semana (aprox.)</label>
            <input 
              type="number" 
              name="estimatedWeeklyVolume"
              value={formData.estimatedWeeklyVolume}
              onChange={handleChange}
              required
              min="0"
              className="w-full rounded-lg bg-gray-700 border border-gray-600 text-white p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
              placeholder="100" 
            />
          </div>

          {/* Mensaje de error y fallback a WhatsApp */}
          {submitError && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <p className="text-red-200 text-sm mb-3">{submitError}</p>
              {whatsappLink && (
                <a 
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Enviar datos por WhatsApp ahora
                </a>
              )}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full font-bold py-4 px-4 rounded-lg transition-colors shadow-lg text-lg ${
              isSubmitting 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {isSubmitting ? 'Procesando...' : 'Agendar Cata Presencial y Fin de Semana Piloto'}
          </button>
          
          <p className="text-center text-sm text-gray-400">
            Sin compromiso. Sin riesgo de inventario. Solo resultados.
          </p>
        </form>
      </div>
    </section>
  );
}