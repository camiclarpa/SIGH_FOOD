'use client';

/**
 * Filtro por familia + cuestionario de paladar.
 *
 * El cuestionario se ofrece SOLO a quien no lo ha hecho ya, y como una tarjeta
 * discreta encima del catálogo — no como una pantalla que hay que superar.
 * Interponerlo entre la persona y los productos convertiría una ayuda en un
 * peaje, y el catálogo son cinco cosas: quien quiera mirarlas directamente
 * tiene derecho a hacerlo.
 */

import { useMemo, useState } from 'react';
import type { ProductoTienda } from '@/lib/consultas';
import { useAlmacen } from '@/lib/almacen';
import type { Perfil } from '@/lib/paladar';
import Paladar, { ALMACEN_PALADAR } from './Paladar';
import TarjetaProducto from './TarjetaProducto';

const FAMILIAS = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'salado', etiqueta: 'Salados' },
  { id: 'dulce', etiqueta: 'Dulces' },
  { id: 'fresco', etiqueta: 'Frescos' },
] as const;

interface ConoMinimo {
  slug: string;
  nombre: string;
  gancho: string | null;
  familia: string | null;
  intensidad: number;
  disponible: boolean;
}

export default function Descubrir({
  productos,
  conos,
}: {
  productos: ProductoTienda[];
  conos: ConoMinimo[];
}) {
  const [familia, setFamilia] = useState<string>('todos');
  const yaRespondio = useAlmacen<Perfil>(ALMACEN_PALADAR);
  const [cerrado, setCerrado] = useState(false);

  const mostrarCuestionario = !yaRespondio && !cerrado;

  // Solo se ofrecen las familias que existen: un filtro que siempre devuelve
  // cero resultados parece un fallo.
  const disponibles = useMemo(() => {
    const presentes = new Set(productos.map((p) => p.familia));
    return FAMILIAS.filter((f) => f.id === 'todos' || presentes.has(f.id));
  }, [productos]);

  const visibles = familia === 'todos' ? productos : productos.filter((p) => p.familia === familia);

  return (
    <>
      {mostrarCuestionario && (
        <div className="mt-6">
          <Paladar conos={conos} alCerrar={() => setCerrado(true)} />
        </div>
      )}

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
        <p className="mt-8 text-center text-[#8f8479]">Nada en esa familia por ahora.</p>
      )}
    </>
  );
}
