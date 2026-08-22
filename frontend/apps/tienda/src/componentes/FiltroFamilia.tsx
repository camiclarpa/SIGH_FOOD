'use client';

/**
 * Filtro por familia de sabor.
 *
 * Existe porque la primera pregunta real es "¿son dulces o salados?".
 * Contestarla con un toque evita recorrer todo el catálogo para descubrirlo.
 *
 * El filtro es de cliente y el listado se pinta con los datos que ya llegaron
 * del servidor: filtrar cinco productos no justifica un viaje de red, y hacerlo
 * en el servidor añadiría un parpadeo a cada toque.
 */

import { useMemo, useState } from 'react';
import type { ProductoTienda } from '@/lib/consultas';
import TarjetaProducto from './TarjetaProducto';

const FAMILIAS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'salado', etiqueta: 'Salados' },
  { id: 'dulce', etiqueta: 'Dulces' },
  { id: 'fresco', etiqueta: 'Frescos' },
] as const;

export default function FiltroFamilia({
  productos,
  destacado,
}: {
  productos: ProductoTienda[];
  destacado: string | null;
}) {
  const [familia, setFamilia] = useState<string>('todos');

  // Solo se ofrecen las familias que existen en el catálogo: un filtro que
  // siempre devuelve cero resultados parece un fallo.
  const disponibles = useMemo(() => {
    const presentes = new Set(productos.map((p) => p.familia));
    return FAMILIAS.filter((f) => f.id === 'todos' || presentes.has(f.id));
  }, [productos]);

  const visibles = familia === 'todos' ? productos : productos.filter((p) => p.familia === familia);

  return (
    <>
      {disponibles.length > 2 && (
        <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {disponibles.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFamilia(f.id)}
              aria-pressed={familia === f.id}
              className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-medium transition-colors ${
                familia === f.id
                  ? 'bg-[#d97325] text-[#12100e]'
                  : 'border border-white/15 text-[#c9bfb2]'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {visibles.map((p) => (
          <TarjetaProducto key={p.id} producto={p} />
        ))}
      </div>

      {visibles.length === 0 && (
        <p className="mt-8 text-center text-[#8f8479]">
          Nada en esa familia por ahora.
        </p>
      )}

      {destacado && familia === 'todos' && (
        <p className="mt-6 text-center text-xs text-[#8f8479]">
          ¿Primera vez? Casi todo el mundo empieza por el que más le llama a la vista.
        </p>
      )}
    </>
  );
}
