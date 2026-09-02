'use client';

import { useState, useTransition } from 'react';
import { abrirCaja } from '@/lib/acciones/caja';

export function AbrirCaja() {
  const [monto, setMonto] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  function abrir() {
    const montoInicialCOP = Number(monto);
    if (!Number.isInteger(montoInicialCOP) || montoInicialCOP < 0) {
      setError('Indica un monto inicial válido');
      return;
    }
    iniciar(async () => {
      const r = await abrirCaja({ montoInicialCOP, notas: notas || undefined });
      if (r.ok) {
        setMonto('');
        setNotas('');
        setError(null);
      } else {
        setError(r.error ?? 'No se pudo abrir la caja');
      }
    });
  }

  return (
    <div className="rounded-md border borde-tema p-4">
      <p className="mb-3 text-sm font-medium">Abrir caja</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">
          <span className="texto-suave text-xs">Monto inicial (COP)</span>
          <input
            type="number"
            min={0}
            value={monto}
            onChange={(e) => { setMonto(e.target.value); setError(null); }}
            placeholder="100000"
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
          onClick={abrir}
          disabled={enCurso}
          className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {enCurso ? 'Abriendo…' : 'Abrir caja'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
