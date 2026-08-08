'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * Hero Component Optimizado para LCP (Largest Contentful Paint)
 * 
 * Optimizaciones aplicadas:
 * - priority: true para preload
 * - fill con object-fit para evitar CLS
 * - placeholder="blur" para lazy loading suave
 * - sizes optimizados para diferentes viewports
 */
export default function HeroSection() {
  // El placeholder borroso se retira cuando la imagen termina de cargar.
  // (Antes un efecto de montaje lo desactivaba de inmediato, anulando el blur.)
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image Optimizada (LCP) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-image.webp"
          alt="Cata de licores premium en bar"
          fill
          priority // CRÍTICO: Esto hace preload de la imagen LCP
          sizes="100vw"
          className="object-cover"
          quality={85}
          onLoadingComplete={() => setIsLoaded(true)}
          placeholder={isLoaded ? undefined : "blur"}
          blurDataURL="data:image/webp;base64,UklGRkoAAABXRUJQVlQ4WAoAAAAQAAAADwAABwAAQUxQSAwAAAARBxAREYiI/gcA"
        />
        {/* Overlay para mejorar contraste del texto */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Contenido Hero */}
      <div className="relative z-10 container mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
          Aumenta tus Ventas de Licores
          <span className="block text-orange-400">Sin Riesgo de Inventario</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto">
          Sistema de cata piloto phygital que conecta tu bar con las mejores marcas de licores. 
          Solo pagas por lo que vendes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a 
            href="#agendar" 
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105"
          >
            Agenda tu Demo Gratis
          </a>
          <a 
            href="#como-funciona" 
            className="inline-block bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-8 rounded-lg transition-all"
          >
            Cómo Funciona
          </a>
        </div>

        {/* Stats - Evitar CLS con dimensiones fijas */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold text-orange-400">+30%</div>
            <div className="text-gray-300">Aumento en ventas</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold text-orange-400">$0</div>
            <div className="text-gray-300">Riesgo de inventario</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <div className="text-3xl font-bold text-orange-400">24h</div>
            <div className="text-gray-300">Entrega piloto</div>
          </div>
        </div>
      </div>
    </section>
  );
}