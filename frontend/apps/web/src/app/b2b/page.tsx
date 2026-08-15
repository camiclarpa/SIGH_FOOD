'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function B2BLandingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    commercialName: '',
    zone: '',
    address: '',
    decisionMakerName: '',
    decisionMakerRole: '',
    phone: '',
    email: '',
    whatsapp: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/leads/b2b', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitStatus('success');
        setTimeout(() => router.push('/gracias'), 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* HEADER CON LOGO */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">SIGH_FOOD</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              TecnologÍa Cloudflare
            </span>
          </div>
        </div>
      </header>

      {/* HERO SECTION - CERTEZA 1: PRODUCTO */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            {/* Headline Poderoso */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Aumenta las Ventas de tu Bar o Restaurante en un{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">
                30%
              </span>{' '}
              en 30 DÍas
            </h1>
            
            {/* Propuesta de Valor Única */}
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              El único sistema de <strong>consignaciÓn inteligente</strong> que usa cÓdigos QR 
              para rastrear cada momento sensorial de tus clientes y optimizar tu inventario automáticamente.
            </p>

            {/* Beneficios Cuantificables */}
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>+30% en ventas</strong> de licores premium</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>0 riesgo</strong> - Solo pagas lo que vendes</span>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>3 minutos</strong> para empezar, sin papeleo</span>
              </div>
            </div>

            {/* CTA Principal */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#formulario"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
              >
                Agendar Prueba Gratis
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:border-orange-500 transition-colors"
              >
                Ver CÓmo Funciona
              </a>
            </div>

            {/* Urgencia */}
            <div className="mt-6 flex items-center gap-2 text-sm text-red-600 font-semibold">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>⚡ Solo 5 cupos disponibles esta semana en tu zona</span>
            </div>
          </div>

          {/* DemostraciÓn Visual */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tiempo de setup</div>
                    <div className="text-2xl font-bold text-gray-900">3 minutos</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Aumento promedio en ventas</div>
                    <div className="text-2xl font-bold text-green-600">+30%</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Riesgo financiero</div>
                    <div className="text-2xl font-bold text-blue-600">CERO</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: EMPATÍA - CERTEZA 2: VENDEDOR */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Cansado de Perder Dinero con Inventario que No Se Vende?
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed mb-8">
              Sabemos lo difÍcil que es manejar un bar o restaurante. Los licores caros ocupan espacio, 
              el capital se queda parado en estantes, y nunca sabes qué productos realmente quieren tus clientes.
            </p>
            <p className="text-xl text-gray-300 leading-relaxed">
              <strong className="text-orange-400">Por eso creamos SIGH_FOOD:</strong> para que solo pagues 
              por lo que vendes, con datos reales de tus clientes, sin arriesgar tu capital.
            </p>
          </div>
        </div>
      </section>

      {/* SECCIÓN: CÓMO FUNCIONA - DEMOSTRACIÓN */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            CÓmo Funciona en 3 Pasos Simples
          </h2>
          <p className="text-xl text-gray-600">
            Sin complicaciones. Sin contratos largos. Sin riesgo.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">
              1
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Agenda tu Prueba</h3>
            <p className="text-gray-600">
              Completa el formulario en 3 minutos. Te contactamos en menos de 24 horas para coordinar la entrega.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">
              2
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Recibe el Inventario</h3>
            <p className="text-gray-600">
              Te entregamos los licores en consignaciÓn. Colocamos los cÓdigos QR en cada mesa. Sin costo inicial.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6">
              3
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Vende y Paga</h3>
            <p className="text-gray-600">
              Tus clientes escanean el QR, disfrutan la experiencia. Solo pagas lo que vendes. Datos en tiempo real.
            </p>
          </div>
        </div>

        {/* CTA Secundario */}
        <div className="text-center mt-12">
          <a
            href="#formulario"
            className="inline-flex items-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            Empezar Ahora - Es Gratis
          </a>
        </div>
      </section>

      {/* SECCIÓN: TESTIMONIOS - PRUEBA SOCIAL */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Lo Que Dicen Nuestros Clientes
            </h2>
            <p className="text-xl text-gray-600">
              Restaurantes y bares que ya aumentaron sus ventas con SIGH_FOOD
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                &quot;En 2 semanas aumentamos las ventas de whisky un 45%. El sistema de QR es genial,
                los clientes lo usan sin que les expliquemos.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                  CM
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Carlos Mendoza</div>
                  <div className="text-sm text-gray-500">Dueño, Bar La Esquina</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                &quot;Lo mejor es que no arriesgo capital. Solo pago lo que vendo. 
                Además, los datos de qué licores piden mis clientes son oro puro.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                  LR
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Laura RamÍrez</div>
                  <div className="text-sm text-gray-500">Gerente, Restaurante El Sabor</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                &quot;Setup en 3 minutos, literal. El equipo de SIGH_FOOD es muy profesional. 
                En un mes ya vimos el ROI.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                  JP
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Jorge Pérez</div>
                  <div className="text-sm text-gray-500">Dueño, CervecerÍa Artesanal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: GARANTÍA - REDUCCIÓN DE RIESGO */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 md:p-12 border-2 border-green-200">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              GarantÍa de SatisfacciÓn 100%
            </h2>
            <p className="text-xl text-gray-700 mb-6">
              Si en los primeros 30 dÍas no ves un aumento en tus ventas, 
              <strong className="text-green-600"> te devolvemos todo el inventario sin preguntas</strong>.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Sin contratos largos
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Cancela cuando quieras
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Soporte 24/7
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: FORMULARIO - CTA PRINCIPAL */}
      <section id="formulario" className="bg-gray-900 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Agenda tu Prueba Gratis Ahora
            </h2>
            <p className="text-xl text-gray-300">
              Completa el formulario en 3 minutos. Te contactamos en menos de 24 horas.
            </p>
          </div>

          {submitStatus === 'success' ? (
            <div className="bg-green-500 rounded-2xl p-8 text-center">
              <svg className="w-16 h-16 text-white mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-2xl font-bold text-white mb-2">¡Registro Exitoso!</h3>
              <p className="text-white">Te contactaremos en menos de 24 horas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Restaurante/Bar *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Ej: Bar La Esquina"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre Comercial
                  </label>
                  <input
                    type="text"
                    name="commercialName"
                    value={formData.commercialName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Ej: La Esquina Bar & Grill"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Zona/Barrio *
                  </label>
                  <input
                    type="text"
                    name="zone"
                    required
                    value={formData.zone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Ej: Chapinero, Laureles"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    DirecciÓn Completa *
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Calle 70 #10-20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Decisor *
                  </label>
                  <input
                    type="text"
                    name="decisionMakerName"
                    required
                    value={formData.decisionMakerName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tu Cargo
                  </label>
                  <select
                    name="decisionMakerRole"
                    value={formData.decisionMakerRole}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                  >
                    <option value="">Selecciona...</option>
                    <option value="Dueño">Dueño</option>
                    <option value="Gerente A&B">Gerente A&B</option>
                    <option value="Head Bartender">Head Bartender</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    WhatsApp (opcional)
                  </label>
                  <input
                    type="tel"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none transition-colors"
                    placeholder="+57 300 123 4567"
                  />
                </div>
              </div>

              {submitStatus === 'error' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  Hubo un error al enviar. Por favor, intenta de nuevo.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-8 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enviando...' : 'Agendar Prueba Gratis Ahora'}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                🔒 Tus datos están seguros. No compartimos tu informaciÓn.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* SECCIÓN: FAQ - MANEJO DE OBJECIONES */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
          Preguntas Frecuentes
        </h2>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ¿Cuánto cuesta el servicio?
            </h3>
            <p className="text-gray-700">
              <strong>Sin costo inicial.</strong> Solo pagas los licores que vendes. 
              El sistema de QR y el software son incluidos sin cargo adicional.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ¿Hay contrato de permanencia?
            </h3>
            <p className="text-gray-700">
              <strong>No.</strong> Puedes cancelar cuando quieras. Si no estás satisfecho en los primeros 30 dÍas, 
              te devolvemos todo el inventario sin preguntas.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ¿Qué pasa si los licores no se venden?
            </h3>
            <p className="text-gray-700">
              <strong>No pierdes nada.</strong> Recogemos el inventario no vendido. 
              Solo pagas por lo que tus clientes realmente consumen.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ¿Cuánto tiempo toma el setup?
            </h3>
            <p className="text-gray-700">
              <strong>3 minutos.</strong> Te entregamos los licores y colocamos los cÓdigos QR en cada mesa. 
              Tu equipo no necesita capacitaciÓn especial.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ¿Qué tipos de licores manejan?
            </h3>
            <p className="text-gray-700">
              Trabajamos con licores premium: whisky, ron, vodka, ginebra y licores especiales. 
              Adaptamos el portafolio a tu tipo de negocio.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER CON CONTACTO */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">S</span>
                </div>
                <span className="text-2xl font-bold">SIGH_FOOD</span>
              </div>
              <p className="text-gray-400">
                Transformando la industria de bares y restaurantes con tecnologÍa de punta.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Contacto</h3>
              <div className="space-y-2 text-gray-400">
                <p>📧 contacto@sighfood.com</p>
                <p>📱 +57 300 123 4567</p>
                <p>📍 Bogotá, Colombia</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">TecnologÍa</h3>
              <div className="flex items-center gap-4 text-gray-400">
                <span>Cloudflare</span>
                <span>•</span>
                <span>Neon</span>
                <span>•</span>
                <span>Next.js</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2026 SIGH_FOOD. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}