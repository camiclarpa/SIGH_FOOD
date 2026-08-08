import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

/**
 * LAYOUT RAÍZ
 * Parte V: Componente Main (Capítulo 26)
 *
 * El App Router exige un layout raíz que declare <html> y <body>; sin él
 * `next build` falla antes de compilar cualquier página.
 */
export const metadata: Metadata = {
  title: 'SIGH_FOOD',
  description: 'Portafolio de conos RTA para gastrobares',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
