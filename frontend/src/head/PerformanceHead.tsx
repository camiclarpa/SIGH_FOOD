/**
 * ============================================================================
 * PERFORMANCE HEAD — Critical Rendering Path (RFC-HPBN, Capítulo 6)
 * RFC-001: Capa Edge — Optimización de carga inicial
 * ============================================================================
 * 
 * FUNCIÓN: Optimizar el Critical Rendering Path del Hero Section mediante
 * preload, preconnect y dns-prefetch — aplicando el principio de Killelea
 * de que "el navegador bloquea el render esperando recursos no descubiertos
 * a tiempo".
 * 
 * PRINCIPIOS APLICADOS (RFC-HPBN):
 *   • Capítulo 6: Client Software (Browser) — descubrimiento temprano
 *   • Capítulo 10: Network Protocols — reducción de conexiones nuevas
 *   • Principio 5.2.4: Parallel Processing — precarga en paralelo
 * 
 * OBJETIVOS DE RENDIMIENTO (RFC-001, Sección 5):
 *   • LCP < 1.2s
 *   • TTFB < 100ms
 *   • Cache Hit Ratio > 95%
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • El video Hero (o imagen estática en conexiones lentas) es el
 *     cronómetro "0:19 segundos" (UNEXPECTED) — debe cargar lo antes
 *     posible para romper el esquema del visitante
 * ============================================================================
 */

import { connectionDetector } from '@/client/connection/ConnectionDetector';

export default function PerformanceHead() {
  // Detectar estrategia de video (video vs imagen estática)
  // Nota: esto se ejecuta en el cliente, no en el servidor
  const videoStrategy = typeof window !== 'undefined' 
    ? connectionDetector.getAdaptiveStrategy() 
    : 'video'; // Default en SSR

  return (
    <>
      {/* 
        PRELOAD DEL VIDEO HERO O IMAGEN ESTÁTICA
        Según la estrategia adaptativa (RFC-HPBN Cap. 8), precargamos el recurso
        apropiado para la conexión del usuario.
      */}
      {videoStrategy === 'video' ? (
        <link
          rel="preload"
          as="video"
          href="/videos/hero-cono.av1.mp4"
          type="video/mp4"
        />
      ) : (
        <link
          rel="preload"
          as="image"
          href="/assets/images/hero/hero-cono-1200.webp"
          type="image/webp"
        />
      )}
      
      {/*
        SIN PRELOAD DE FUENTE

        Aquí había un preload de /assets/fonts/inter-var.woff2, pero ese archivo
        nunca llegó a existir: en public/assets/fonts solo hay un marcador de
        posición. El resultado era un 404 en cada visita, y un preload fallido
        es peor que no tenerlo — gasta una petición del presupuesto de conexiones
        justo durante la carga inicial, que es cuando más escasean.

        La pila de fuentes del sistema, declarada más abajo, cubre el caso sin
        descargar nada: iOS y Android ya tienen esas fuentes en memoria. Si algún
        día se añade Inter de verdad, se sube el .woff2 a esa ruta y se restaura
        este preload.
      */}

      {/* 
        PRECONNECT A DOMINIOS EXTERNOS CRÍTICOS
        Establece conexión temprana (DNS + TLS handshake) para reducir
        la latencia cuando el navegador necesite estos recursos.
      */}
      <link
        rel="preconnect"
        href="https://customer-video.cloudflarestream.com"
        crossOrigin="anonymous"
      />
      
      <link
        rel="preconnect"
        href="https://api.hubspot.com"
        crossOrigin="anonymous"
      />
      
      {/* 
        DNS PREFETCH A DOMINIOS SECUNDARIOS
        Resuelve DNS en paralelo con el parseo del HTML, sin establecer
        conexión completa (menos costoso que preconnect).
      */}
      <link rel="dns-prefetch" href="https://api.hubspot.com" />
      <link rel="dns-prefetch" href="https://customer-video.cloudflarestream.com" />
      
      {/* 
        META TAGS DE RENDIMIENTO
        Theme color para navegadores móviles, descripción para SEO.
      */}
      <meta name="theme-color" content="#1a1a1a" />
      <meta 
        name="description" 
        content="SIGH_FOOD - Experiencia de autor sin cocina para tu bar. 20 segundos, sin cambiar nada." 
      />
      
      {/* 
        FUENTE FALLBACK DEL SISTEMA (RFC-HPBN Cap. 7)
        Mientras carga Inter Variable, usar fuentes del sistema que ya
        están cacheadas localmente por el sistema operativo (localidad
        de referencia del OS móvil).
      */}
      <style>{`
        @font-face {
          font-family: 'Inter Variable Fallback';
          src: local('-apple-system'), local('BlinkMacSystemFont'), local('Segoe UI'), local('Roboto');
          font-display: swap;
        }
        
        body {
          font-family: 'Inter Variable', 'Inter Variable Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </>
  );
}