'use client';

import { useState } from 'react';

export default function PilotKitForm() {
  const [formData, setFormData] = useState({
    barName: '',
    city: '',
    whatsapp: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Aquí va la lógica de envío (integrar con tu API)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    setSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ barName: '', city: '', whatsapp: '' });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section id="formulario" className="py-20 px-6 bg-[#1f1f1f]">
      <div className="max-w-md mx-auto">
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-[#f5f5f5]">
            Solicita tu Kit Piloto
          </h2>
          
          {submitted ? (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-400 font-semibold">¡Solicitud enviada!</p>
              <p className="text-gray-400 text-sm mt-2">Te contactaremos pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="barName"
                  value={formData.barName}
                  onChange={handleChange}
                  placeholder="Nombre del bar"
                  required
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
                />
              </div>
              
              <div>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ciudad"
                  required
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
                />
              </div>
              
              <div>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="WhatsApp de contacto"
                  required
                  className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-[#f5f5f5] placeholder-gray-500 focus:outline-none focus:border-[#d97325] focus:ring-1 focus:ring-[#d97325] transition"
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#d97325] hover:bg-[#c4641f] disabled:bg-gray-700 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
              >
                {isSubmitting ? 'Enviando...' : 'ENVIAR SOLICITUD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}