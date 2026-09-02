'use client';

import { useState, useTransition } from 'react';
import { cerrarCaja } from '@/lib/acciones/caja';
import { moneda } from '@/components/ui';

export function CerrarCaja({ id, efectivoEsperadoEnVivo }: { id: string; efectivoEsperadoEnVivo: number }) {
  const [contado, setContado] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ esperado: number; diferencia: number } | null>(null);
  const [enCurso, iniciar] = useTransition();

  function cerrar() {
    const efectivoContadoCOP = Number(contado);
    if (!Number.isInteger(efectivoContadoCOP) || efectivoContadoCOP < 0) {
      setError('Indica el efectivo contado');
      return;
    }
    iniciar(async () => {
      const r = await cerrarCaja({ id, efectivoContadoCOP, notas: notas || undefined });
      if (r.ok && r.datos) {
        setResultado(r.datos);
        setError(null);
      } else {
        setError(r.error ?? 'No se pudo cerrar la caja');
      }
    });
  }

  if (resultado) {
    return (
      <div className="rounded-md border border-green-700/50 bg-green-950/30 p-4 text-sm text-green-200">
        <p className="font-medium">Caja cerrada.</p>
        <p className="texto-suave mt-1 text-xs">
          Esperado {moneda(resultado.esperado)} · diferencia {moneda(resultado.diferencia)}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border borde-tema p-4">
      <p className="mb-1 text-sm font-medium">Cerrar caja</p>
      <p className="texto-suave mb-3 text-xs">
        Efectivo esperado ahora mismo: <span className="cifras">{moneda(efectivoEsperadoEnVivo)}</span> — cuenta el
        efectivo físico y regístralo abajo.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Efectivo contado (COP)</span>
          <input
            type="number"
            min={0}
            value={contado}
            onChange={(e) => { setContado(e.target.value); setError(null); }}
            className="superficie w-40 rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
        <label className="grid flex-1 gap-1">
          <span className="texto-suave text-xs">Notas (opcional)</span>
          <input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={cerrar}
          disabled={enCurso}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {enCurso ? 'Cerrando…' : 'Cerrar caja'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
