'use client';

import { useState, useTransition } from 'react';
import { guardarInsumo } from '@/lib/acciones/inventario';

const UNIDADES = ['g', 'kg', 'ml', 'l', 'unidad'] as const;

export function EditorInsumo() {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [unidadMedida, setUnidadMedida] = useState<(typeof UNIDADES)[number]>('g');
  const [stockMinimo, setStockMinimo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  function guardar() {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    iniciar(async () => {
      const r = await guardarInsumo({
        nombre,
        unidadMedida,
        stockMinimo: stockMinimo ? Number(stockMinimo) : null,
      });
      if (r.ok) {
        setNombre('');
        setStockMinimo('');
        setError(null);
        setAbierto(false);
      } else {
        setError(r.error ?? 'No se pudo guardar');
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-md border borde-tema px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        + Nuevo insumo
      </button>
    );
  }

  return (
    <div className="rounded-md border borde-tema p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid flex-1 gap-1">
          <span className="texto-suave text-xs">Nombre</span>
          <input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setError(null); }}
            placeholder="Masa de cono"
            className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Unidad</span>
          <select
            value={unidadMedida}
            onChange={(e) => setUnidadMedida(e.target.value as (typeof UNIDADES)[number])}
            className="superficie rounded-md border borde-tema px-3 py-1.5 text-sm"
          >
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Stock mínimo (opcional)</span>
          <input
            type="number"
            min={0}
            value={stockMinimo}
            onChange={(e) => setStockMinimo(e.target.value)}
            className="superficie w-32 rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="button" onClick={guardar} disabled={enCurso}
          className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {enCurso ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button" onClick={() => { setAbierto(false); setError(null); }}
          className="texto-suave px-2 py-1.5 text-sm hover:underline"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
