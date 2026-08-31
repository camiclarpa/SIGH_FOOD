'use client';

// =============================================================================
// Crear un cupón de compensación desde una alerta de calidad
// =============================================================================
//
// No lo paga el comensal: emitirCompensacion() no toca su saldo de puntos. Es
// la casa reconociendo que algo salió mal, no un canje más.

import { useState, useTransition } from 'react';
import { emitirCompensacion } from '@/lib/acciones/canjes';

export function CompensarComensal({
  reviewId,
  consumerId,
  puedeModerar,
}: {
  reviewId: string;
  consumerId: string | null;
  puedeModerar: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [resultado, setResultado] = useState<{ codigo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  if (!puedeModerar || !consumerId) return null;

  function emitir() {
    if (!motivo.trim()) { setError('Indica el motivo'); return; }
    iniciar(async () => {
      const r = await emitirCompensacion({ consumerId: consumerId!, motivo, reviewId });
      if (r.ok && r.datos) { setResultado({ codigo: r.datos.codigo }); setError(null); }
      else setError(r.error ?? 'No se pudo emitir');
    });
  }

  if (resultado) {
    return (
      <p className="mt-1 rounded-md border border-green-700/50 bg-green-950/30 px-2 py-1 text-xs text-green-200">
        Cupón <span className="cifras font-medium">{resultado.codigo}</span> emitido.
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-md border borde-tema px-3 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Compensar
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-md border borde-tema p-3">
      <input
        value={motivo}
        onChange={(e) => { setMotivo(e.target.value); setError(null); }}
        placeholder="Motivo de la compensación (obligatorio)"
        className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-xs"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button" onClick={emitir} disabled={enCurso}
          className="rounded-md bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50"
        >
          {enCurso ? 'Emitiendo…' : 'Emitir cupón'}
        </button>
        <button
          type="button" onClick={() => { setAbierto(false); setError(null); }}
          className="texto-suave px-2 py-1 text-xs hover:underline"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
