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

/**
 * Dominio público del sitio.
 *
 * Sin esto, Next resuelve las imágenes de Open Graph contra localhost:3000 y la
 * vista previa sale rota justo donde más se comparte esta página: al pegar el
 * enlace en un chat de WhatsApp. Un enlace sin foto en WhatsApp se ignora.
 *
 * El valor por defecto es la URL actual del Worker. Cuando haya dominio propio
 * —bocazo.co o el que sea—, se define NEXT_PUBLIC_SITIO_URL en el entorno de
 * compilacion y esta constante lo recoge sin tocar codigo.
 *
 * Va aqui y no en un .env porque .env* esta en .gitignore: dejarlo solo alli
 * significaria que cualquier compilacion limpia vuelve a generar vistas previas
 * rotas, y nadie se daria cuenta hasta pegar el enlace en un chat.
 */
const SITIO =
  process.env.NEXT_PUBLIC_SITIO_URL ?? 'https://sigh-bocazo.camiloriverac0.workers.dev';

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: 'Bocazo — El antojo que no se te va hasta que lo pruebas',
  description:
    'Conos crujientes rellenos al momento, con combinaciones que no encuentras ' +
    'en otro sitio. Cinco sabores. Pide por WhatsApp.',
  keywords: ['conos', 'snack gourmet', 'Bogotá', 'antojo', 'domicilio', 'Bocazo'],
  authors: [{ name: 'Bocazo' }],
  openGraph: {
    title: 'Bocazo — Conos rellenos al momento',
    description:
      'Cinco sabores que no se parecen a nada. Se comen de pie, en cinco minutos.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'Bocazo',
  },
  twitter: {
    card: 'summary_large_image',
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