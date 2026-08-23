/**
 * Ficha de producto.
 *
 * NO se prerenderiza en el build, y es deliberado.
 *
 * Generar las cinco páginas al compilar exige credenciales de base de datos
 * DURANTE el build, y ahí está el problema: opennextjs-cloudflare serializa
 * todo process.env dentro del bundle del Worker. Cualquier credencial que exista
 * en el momento de compilar acaba en texto plano en el paquete desplegado —
 * DATABASE_URL, AUTH_SECRET, tokens de terceros, todo.
 *
 * Se descubrió con este proyecto: los tres Workers llevaban el juego completo
 * de secretos horneado dentro, lo que hacía decorativo todo el `wrangler secret
 * put` que se había hecho.
 *
 * Con ISR bajo demanda, la primera visita a cada producto genera la página y el
 * resto se sirven del caché durante el tiempo de revalidación. Se pierde una
 * optimización de arranque; se gana no publicar las llaves de la casa.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { producto } from '@/lib/consultas';
import Personalizar from '@/componentes/Personalizar';
import Medir from '@/componentes/Medir';
import Maridaje from '@/componentes/Maridaje';

export const revalidate = 60;

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

  return (
    <>
      <Medir evento="vio_producto" productoId={datos.producto.id} />
      <Personalizar producto={datos.producto} opciones={datos.opciones} />
      {/*
        Solo se pinta si hay mesa: el propio endpoint lo comprueba y devuelve
        204 a domicilio. Ver lib/maridaje.ts.
      */}
      <Maridaje slug={slug} />
    </>
  );
}
