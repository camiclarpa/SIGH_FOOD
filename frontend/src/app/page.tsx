/**
 * ============================================================================
 * LANDING B2C — Bocazo
 * ============================================================================
 *
 * La página que ve el cliente final. La versión B2B —calculadora de ROI,
 * formulario para dueños de bar— sigue viva en /b2b: no se borró, se apartó,
 * porque la estrategia B2B está pausada hasta que la marca escale.
 *
 * El orden de las secciones no es decorativo. Cada una contesta la pregunta que
 * la persona tiene EN ESE MOMENTO, y contestarla antes de tiempo o después no
 * sirve:
 *
 *   Hero          ¿qué es esto?
 *   Antojo        ¿por qué debería importarme?
 *   Catálogo      ¿qué compro y cuánto vale?
 *   Dónde         ¿y dónde queda? — llega justo después del precio, que es
 *                 cuando aparece. Antes estaba solo en el pie, y quien venía
 *                 de Instagram con ganas de ir no encontraba una dirección.
 *   Diferencia    ¿por qué este y no otro?
 *   Experiencia   ¿es de verdad tan bueno?
 *   Prueba social ¿alguien más lo dice, o solo ellos?
 *   Confianza     ¿y si no me gusta?
 *   Preguntas     ¿qué más necesito saber?
 *   Cierre        lo pido.
 *
 * El precio va en el catálogo y no al final, al contrario de lo que suele
 * hacerse. En comida a $32.000 el precio no es una objeción que haya que
 * preparar: esconderlo genera más desconfianza que enseñarlo junto a la foto.
 *
 * ISR de una hora, como el resto del sitio: el contenido es casi estático y así
 * el 95% de las visitas se sirven desde el caché del edge.
 */

import type { Metadata } from 'next';
import Encabezado from '@/components/b2c/Encabezado';
import Hero from '@/components/b2c/Hero';
import Antojo from '@/components/b2c/Antojo';
import Catalogo from '@/components/b2c/Catalogo';
import Donde from '@/components/b2c/Donde';
import PorQueDiferente from '@/components/b2c/PorQueDiferente';
import Experiencia from '@/components/b2c/Experiencia';
import PruebaSocial from '@/components/b2c/PruebaSocial';
import Confianza from '@/components/b2c/Confianza';
import Preguntas from '@/components/b2c/Preguntas';
import CierreCta from '@/components/b2c/CierreCta';
import PieB2C from '@/components/b2c/PieB2C';
import BotonFlotante from '@/components/b2c/BotonFlotante';
import AvisoDemo from '@/components/b2c/AvisoDemo';
import { BOX, CONOS, HORARIOS, LOCAL, MARCA, PREGUNTAS, precio } from '@/components/b2c/datos';

export const revalidate = 3600;

const DESCRIPCION =
  'Conos crujientes rellenos al momento, con combinaciones que no encuentras en otro sitio. ' +
  `Cinco sabores a ${precio(CONOS[0].precioCOP)}. Pide por WhatsApp.`;

export const metadata: Metadata = {
  title: `${MARCA.nombre} — El antojo que no se te va hasta que lo pruebas`,
  description: DESCRIPCION,
  keywords: ['conos', 'snack gourmet', MARCA.ciudad, 'antojo', 'domicilio', MARCA.nombre],
  openGraph: {
    title: `${MARCA.nombre} — Conos rellenos al momento`,
    description: DESCRIPCION,
    type: 'website',
    locale: 'es_CO',
    // La foto del Volcano es la que mejor funciona como miniatura: se entiende
    // qué es a tamaño pequeño, que es como se ve al compartir un enlace.
    images: [{ url: '/conos/spicy-volcano-1100.webp', width: 1100, height: 1374 }],
  },
};

/**
 * Datos estructurados para Google.
 *
 * Sin esto, una búsqueda de "conos en Bogotá" no tiene forma de saber que esta
 * página es un menú con precios. Con esto, puede enseñar el producto y el
 * precio directamente en el resultado.
 *
 * Solo se declara lo que es cierto: no hay aggregateRating porque todavía no hay
 * reseñas reales, y un rating inventado en datos estructurados es motivo de
 * penalización manual además de ser mentira.
 */
function datosEstructurados() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: MARCA.nombre,
    description: DESCRIPCION,
    servesCuisine: 'Snacks gourmet',
    priceRange: '$$',
    telephone: `+${MARCA.whatsapp}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: LOCAL.direccion,
      addressLocality: LOCAL.ciudad,
      addressCountry: 'CO',
    },
    openingHours: HORARIOS.map((h) => `${h.dias} ${h.horas}`),
    hasMenu: {
      '@type': 'Menu',
      hasMenuSection: {
        '@type': 'MenuSection',
        name: 'Conos',
        hasMenuItem: [
          ...CONOS.map((c) => ({
            '@type': 'MenuItem',
            name: c.nombre,
            description: c.descripcion,
            offers: { '@type': 'Offer', price: c.precioCOP, priceCurrency: 'COP' },
          })),
          {
            '@type': 'MenuItem',
            name: BOX.nombre,
            description: `Los ${BOX.unidades} sabores en un solo pedido.`,
            offers: { '@type': 'Offer', price: BOX.precioCOP, priceCurrency: 'COP' },
          },
        ],
      },
    },
    mainEntityOfPage: {
      '@type': 'FAQPage',
      mainEntity: PREGUNTAS.map((q) => ({
        '@type': 'Question',
        name: q.p,
        acceptedAnswer: { '@type': 'Answer', text: q.r },
      })),
    },
  };
}

export default function LandingB2C() {
  return (
    <>
      <script
        type="application/ld+json"
        // El JSON lo generamos nosotros a partir de constantes propias: no hay
        // entrada de usuario que pueda escaparse de la etiqueta.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados()) }}
      />

      <AvisoDemo />
      <Encabezado />

      <main className="bg-[#12100e]">
        <Hero />
        <Antojo />
        <Catalogo />
        <Donde />
        <PorQueDiferente />
        <Experiencia />
        <PruebaSocial />
        <Confianza />
        <Preguntas />
        <CierreCta />
      </main>

      <PieB2C />
      <BotonFlotante />
    </>
  );
}
