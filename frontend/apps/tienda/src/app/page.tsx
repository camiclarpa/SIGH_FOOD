/**
 * ============================================================================
 * Portada de la tienda — el catálogo
 * ============================================================================
 *
 * No hay hero. En una web app la portada tiene que contestar "¿qué puedo hacer
 * aquí?" en el primer pantallazo, y la respuesta es: pedir. Un hero a pantalla
 * completa obligaría a bajar antes de ver un solo producto — bien para
 * convencer a quien no conoce la marca, mal para quien ya viene a pedir.
 *
 * CAPA PHYGITAL
 * -------------
 * El adhesivo de la mesa apunta a /mesa?qr=TOKEN, que es un route handler: ahí
 * se resuelve el token, se deja el contexto en una cookie y se redirige aquí.
 *
 * No se hace en esta página porque un componente de servidor NO puede escribir
 * cookies en Next — solo los route handlers y las server actions. Aquí solo se
 * LEE la cookie, que sí está permitido.
 *
 * Un `?qr=` que llegue directamente a la portada se reenvía a /mesa, para que
 * un adhesivo ya impreso con la URL antigua siga funcionando.
 */

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { catalogo } from '@/lib/consultas';
import { COOKIE_MESA, deserializar } from '@/lib/mesa';
import TarjetaProducto from '@/componentes/TarjetaProducto';
import Descubrir from '@/componentes/Descubrir';
import AvisoMesa from '@/componentes/AvisoMesa';
import Medir from '@/componentes/Medir';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pedir · Bocazo',
  description: 'Cinco sabores, preparados al momento. Pide en dos minutos.',
};

export default async function Portada({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const tarro = await cookies();

  // Un adhesivo antiguo que apunte a /?qr= sigue funcionando: se reenvía al
  // route handler, que es quien puede escribir la cookie.
  if (p.qr) redirect(`/mesa?qr=${encodeURIComponent(p.qr)}`);

  const mesa = deserializar(tarro.get(COOKIE_MESA)?.value);
  const productos = await catalogo();
  const disponibles = productos.filter((p) => p.disponible).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Medir evento="vio_catalogo" qrToken={mesa?.qrToken} />

      {mesa && <AvisoMesa local={mesa.local} mesa={mesa.mesa} />}

      <h1 className={`font-display text-3xl font-bold leading-tight text-[#f5f1ea] ${mesa ? 'mt-5' : ''}`}>
        ¿Qué se te antoja hoy?
      </h1>
      <p className="mt-2 text-[#8f8479]">
        {disponibles} {disponibles === 1 ? 'sabor disponible' : 'sabores disponibles'}
        {mesa ? ' · te lo llevamos a la mesa' : ' · listos en minutos'}
      </p>

      {productos.length === 0 ? (
        /* Catálogo vacío es un fallo de operación, no un estado normal. Se dice
           claramente en vez de enseñar una cuadrícula en blanco que parece que
           la página no cargó. */
        <div className="mt-10 rounded-2xl border border-white/10 bg-[#1c1812] p-8 text-center">
          <p className="text-[#c9bfb2]">
            No hay productos publicados todavía. Si crees que es un error, escríbenos.
          </p>
        </div>
      ) : (
        <>
          <Descubrir
            productos={productos}
            conos={productos.map((c) => ({
              slug: c.slug,
              nombre: c.nombre,
              gancho: c.gancho,
              familia: c.familia,
              intensidad: c.intensidad,
              disponible: c.disponible,
            }))}
          />

          {/* Sin JavaScript, el filtro y el cuestionario no funcionan, pero el
              catálogo sí: las tarjetas se pintan en el servidor. */}
          <noscript>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {productos.map((p) => (
                <TarjetaProducto key={p.id} producto={p} />
              ))}
            </div>
          </noscript>
        </>
      )}
    </div>
  );
}
