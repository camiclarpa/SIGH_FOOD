/**
 * ============================================================================
 * TIENDA B2C — Bocazo
 * ============================================================================
 *
 * Una web app, no una landing. La diferencia manda sobre todo el diseño:
 *
 *   · La landing convence una vez y está pensada para leerse de arriba abajo.
 *   · Esto se usa muchas veces y está pensado para llegar rápido a lo mismo:
 *     el sabor de siempre, en el carrito, pagado.
 *
 * Por eso el catálogo es la portada —no un hero— y la barra inferior con el
 * carrito está fija: en una tienda, el camino a la caja no puede depender de
 * cuánto has bajado.
 */

import type { Metadata, Viewport } from 'next';
import { ProveedorCarrito } from '@/componentes/Carrito';
import BarraInferior from '@/componentes/BarraInferior';
import Cabecera from '@/componentes/Cabecera';
import './globals.css';

const SITIO = process.env.NEXT_PUBLIC_SITIO_URL ?? 'https://bocazo-tienda.camiloriverac0.workers.dev';

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: 'Pedir · Bocazo',
  description: 'Pide tus conos Bocazo. Cinco sabores, preparados al momento.',
  // Instalable en el móvil sin pasar por una tienda de aplicaciones. Para un
  // negocio local, pedirle a alguien que instale una app desde la App Store es
  // una barrera que casi nadie cruza; un icono en la pantalla de inicio, no.
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Bocazo', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#12100e',
  // La tienda no se deja escalar a lo ancho porque tiene barra inferior fija:
  // con zoom horizontal el botón del carrito se sale de la pantalla.
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function LayoutTienda({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ProveedorCarrito>
          <Cabecera />
          {/* El padding inferior deja sitio a la barra fija: sin él, la última
              línea del carrito queda tapada justo cuando hay que revisarla. */}
          <main className="min-h-[100svh] pb-28 pt-16">{children}</main>
          <BarraInferior />
        </ProveedorCarrito>
      </body>
    </html>
  );
}
