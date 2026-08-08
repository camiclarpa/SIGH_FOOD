/**
 * app/gracias/page.tsx
 *
 * Página de confirmación post-formulario — SSG sin leer CRM.
 * Mitiga la anomalía de replication lag (RFC-DDIA Sección 5.2).
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Solicitud Recibida | SIGH_FOOD',
  description: 'Tu solicitud para la Demo Phygital fue recibida. Te contactaremos pronto.',
  robots: {
    index: false,
    follow: false,
  },
};

export const revalidate = 86400;

export default function GraciasPage() {
  return (
    <main className="min-h-screen bg-[#1a1a1a] text-[#f5f5f5] flex items-center justify-center px-6 py-20">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-900/30 border-2 border-green-700">
            <svg
              className="w-12 h-12 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[#f5f5f5]">
          Solicitud recibida
        </h1>

        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
          Tu solicitud para la Demo Phygital de SIGH_FOOD ha sido encolada
          exitosamente. Un miembro de nuestro equipo comercial se pondrá en
          contacto contigo por WhatsApp en menos de 24 horas.
        </p>

        <div className="bg-[#1f1f1f] border border-gray-800 rounded-lg p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold text-[#d97325] mb-4">
            Mientras tanto, prepárate para:
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <span>Recibir tu kit piloto en consignación</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <span>Ensamblar tu primer cono en menos de 20 segundos</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <span>Ver el margen del 73.4% en tu primera noche</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <span>Personalizar el kit de cata según tu carta</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-block bg-[#d97325] hover:bg-[#c4641f] text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
          >
            Volver al inicio
          </Link>

          <p className="text-sm text-gray-500">
            ¿Tienes preguntas urgentes? Escríbenos a{' '}
            <a
              href="mailto:hola@sighfood.com"
              className="text-[#d97325] hover:underline"
            >
              hola@sighfood.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}