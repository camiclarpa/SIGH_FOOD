/**
 * Ficha de producto.
 *
 * Se prerenderiza cada slug publicado: el catálogo son cinco productos y
 * cambian poco, así que generar las cinco páginas en el build sale gratis y las
 * sirve el borde sin tocar la base.
 *
 * La revalidación corta cubre lo que sí cambia a menudo: la disponibilidad.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { producto, slugsPublicados } from '@/lib/consultas';
import Personalizar from '@/componentes/Personalizar';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await slugsPublicados();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await producto(slug);
  if (!p) return { title: 'Producto no encontrado · Bocazo' };

  return {
    title: `${p.producto.nombre} · Bocazo`,
    description: p.producto.gancho ?? p.producto.descripcion ?? undefined,
    openGraph: p.producto.imagen
      ? { images: [{ url: p.producto.imagen.replace('.webp', '-1100.webp') }] }
      : undefined,
  };
}

export default async function PaginaProducto({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const datos = await producto(slug);

  if (!datos) notFound();

  return <Personalizar producto={datos.producto} opciones={datos.opciones} />;
}
