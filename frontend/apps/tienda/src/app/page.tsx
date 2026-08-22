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
 * Revalidación corta a propósito: el catálogo cambia cuando la cocina se queda
 * sin algo, y una tarjeta que sigue diciendo "disponible" produce un pedido que
 * hay que cancelar. Sesenta segundos es el equilibrio entre eso y no consultar
 * la base en cada visita.
 */

import type { Metadata } from 'next';
import { catalogo } from '@/lib/consultas';
import TarjetaProducto from '@/componentes/TarjetaProducto';
import FiltroFamilia from '@/componentes/FiltroFamilia';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Pedir · Bocazo',
  description: 'Cinco sabores, preparados al momento. Pide en dos minutos.',
};

export default async function Portada() {
  const productos = await catalogo();

  const destacado = productos.find((p) => p.destacado && p.disponible) ?? productos[0];
  const disponibles = productos.filter((p) => p.disponible).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-3xl font-bold leading-tight text-[#f5f1ea]">
        ¿Qué se te antoja hoy?
      </h1>
      <p className="mt-2 text-[#8f8479]">
        {disponibles} {disponibles === 1 ? 'sabor disponible' : 'sabores disponibles'} · listos en
        minutos
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
          <FiltroFamilia productos={productos} destacado={destacado?.slug ?? null} />

          {/* Sin JavaScript, el filtro no funciona pero el catálogo sí: las
              tarjetas se pintan en el servidor dentro del propio filtro. */}
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
