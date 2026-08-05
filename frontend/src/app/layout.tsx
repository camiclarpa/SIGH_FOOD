/**
 * ============================================================================
 * LAYOUT RAÍZ — Fuentes del Sistema y Metadata (RFC-HPBN Cap. 6-7)
 * RFC-001: Capa Edge — Contenido estático SSG
 * ============================================================================
 * 
 * FUNCIÓN: Layout raíz del landing B2B con fuentes del sistema como fallback
 * (aprovechando localidad de referencia del SO móvil) y metadata SEO.
 * 
 * PRINCIPIO APLICADO (RFC-HPBN Cap. 7):
 *   Kleppmann documenta cómo el sistema operativo del cliente gestiona el
 *   caché de disco y la asignación de memoria al navegador. El principio
 *   de localidad de referencia (Principio 5.1.8) es central: el SO mantiene
 *   en caché lo que se usó recientemente.
 * 
 * APLICACIÓN: usar fuentes del sistema (-apple-system, Roboto) como fallback
 * mientras carga Inter Variable, aprovechando que iOS/Android ya tienen
 * esas fuentes cacheadas localmente por definición.
 * 
 * INTEGRACIÓN CON MADE TO STICK:
 *   • El layout es el "escenario" donde ocurre la Springboard Story
 *   • Debe cargar rápido para no romper el momentum emocional
 * ============================================================================
 */

import type { Metadata } from 'next';
import PerformanceHead from '@/head/PerformanceHead';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIGH_FOOD — Experiencia de autor sin cocina para tu bar',
  description: '20 segundos, sin cambiar nada. Kit Piloto B2B para gastrobares.',
  keywords: ['gastrobar', 'licores', 'conos', 'RTA', 'phygital', 'B2B'],
  authors: [{ name: 'SIGH_FOOD' }],
  openGraph: {
    title: 'SIGH_FOOD — Experiencia de autor sin cocina para tu bar',
    description: '20 segundos, sin cambiar nada. Kit Piloto B2B para gastrobares.',
    type: 'website',
    locale: 'es_CO',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Preconnect a dominios externos críticos */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Performance Head - preload/preconnect/dns-prefetch */}
        <PerformanceHead />
      </head>
      <body
        className="antialiased bg-[#1a1a1a] text-[#f5f5f5]"
        style={{
          // Fuentes del sistema como fallback (RFC-HPBN Cap. 7: localidad de referencia)
          fontFamily: "'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}