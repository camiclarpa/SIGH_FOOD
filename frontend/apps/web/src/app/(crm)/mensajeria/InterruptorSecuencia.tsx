'use client';

// =============================================================================
// Interruptor de activación de una secuencia
// =============================================================================
//
// Activar pide confirmación; pausar no. No es simetría rota: encender empieza a
// mandar mensajes a móviles reales y no se puede deshacer para quien ya lo
// recibió. Apagar solo detiene, y detener nunca hace daño.

import { useState, useTransition } from 'react';
import { alternarSecuencia } from '@/lib/acciones/campanas';

export function InterruptorSecuencia({
  id,
  nombre,
  activa,
  puedeActivar,
  puedeEditar,
}: {
  id: string;
  nombre: string;
  activa: boolean;
  puedeActivar: boolean;
  puedeEditar: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const permitido = activa ? puedeEditar : puedeActivar;
  if (!permitido) return null;

  function alternar() {
    if (!activa) {
      const seguro = window.confirm(
        `Vas a activar "${nombre}".\n\n` +
        `A partir de ahora se enviarán mensajes reales a los comensales que ` +
        `cumplan su disparador. ¿Seguro?`
      );
      if (!seguro) return;
    }

    iniciar(async () => {
      const r = await alternarSecuencia(id, !activa);
      setError(r.ok ? null : r.error ?? 'No se pudo cambiar');
    });
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={alternar}
        disabled={enCurso}
        aria-pressed={activa}
        className={`rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 ${
          activa
            ? 'bg-green-600 text-white hover:bg-green-500'
            : 'border borde-tema hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        {enCurso ? '…' : activa ? 'Activa' : 'Activar'}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
