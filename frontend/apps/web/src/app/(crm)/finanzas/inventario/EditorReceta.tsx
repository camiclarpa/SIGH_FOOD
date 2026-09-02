'use client';

import { useState, useTransition } from 'react';
import { borrarRecetaItem, guardarRecetaItem } from '@/lib/acciones/inventario';
import { Vacio, moneda } from '@/components/ui';

interface Producto {
  id: string;
  nombre: string;
  precioCOP: number;
  costoRecetaCOP: number | null;
  margenCOP: number | null;
  completo: boolean;
}
interface Insumo { id: string; nombre: string; unidadMedida: string }
interface ItemReceta {
  id: string;
  insumoId: string;
  insumoNombre: string;
  unidadMedida: string;
  cantidad: string;
  notas: string | null;
}

export function EditorReceta({
  productos,
  insumos,
  recetasPorProducto,
}: {
  productos: Producto[];
  insumos: Insumo[];
  recetasPorProducto: Record<string, ItemReceta[]>;
}) {
  const [productoId, setProductoId] = useState(productos[0]?.id ?? '');
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const items = recetasPorProducto[productoId] ?? [];
  const unidad = insumos.find((i) => i.id === insumoId)?.unidadMedida ?? '';
  const producto = productos.find((p) => p.id === productoId);

  function agregar() {
    const cantidadNum = Number(cantidad);
    if (!insumoId) { setError('Elige un insumo'); return; }
    if (!(cantidadNum > 0)) { setError('La cantidad debe ser mayor que cero'); return; }

    iniciar(async () => {
      const r = await guardarRecetaItem({ productoId, insumoId, cantidad: cantidadNum });
      if (r.ok) {
        setInsumoId('');
        setCantidad('');
        setError(null);
      } else {
        setError(r.error ?? 'No se pudo guardar');
      }
    });
  }

  function quitar(id: string) {
    iniciar(async () => {
      await borrarRecetaItem(id);
    });
  }

  if (productos.length === 0) {
    return <Vacio>No hay productos activos en el catálogo todavía.</Vacio>;
  }

  return (
    <div>
      <label className="mb-3 grid gap-1">
        <span className="texto-suave text-xs">Producto</span>
        <select
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          className="superficie w-full max-w-sm rounded-md border borde-tema px-3 py-1.5 text-sm"
        >
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </label>

      {producto && producto.costoRecetaCOP != null && (
        <p className="texto-suave mb-3 text-xs">
          A precio de hoy: costo {moneda(producto.costoRecetaCOP)} · margen{' '}
          <span className={producto.margenCOP != null && producto.margenCOP < 0 ? 'text-red-500' : ''}>
            {moneda(producto.margenCOP)}
          </span>{' '}
          sobre {moneda(producto.precioCOP)}
          {!producto.completo && ' (parcial: algún insumo de la receta no tiene stock)'}
        </p>
      )}

      {items.length === 0 ? (
        <Vacio>Este producto todavía no tiene ficha técnica. No descuenta inventario al venderse.</Vacio>
      ) : (
        <ul className="mb-3 divide-y borde-tema">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>{it.insumoNombre}</span>
              <div className="flex items-center gap-3">
                <span className="cifras texto-suave text-xs">{Number(it.cantidad)} {it.unidadMedida}</span>
                <button
                  type="button" onClick={() => quitar(it.id)} disabled={enCurso}
                  className="text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-md border borde-tema p-3">
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Insumo</span>
          <select
            value={insumoId}
            onChange={(e) => { setInsumoId(e.target.value); setError(null); }}
            className="superficie rounded-md border borde-tema px-3 py-1.5 text-sm"
          >
            <option value="">— elige un insumo —</option>
            {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Cantidad {unidad && `(${unidad})`}</span>
          <input
            type="number" min={0} step="any"
            value={cantidad}
            onChange={(e) => { setCantidad(e.target.value); setError(null); }}
            className="superficie w-28 rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="button" onClick={agregar} disabled={enCurso}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {enCurso ? 'Guardando…' : 'Añadir a la ficha'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
