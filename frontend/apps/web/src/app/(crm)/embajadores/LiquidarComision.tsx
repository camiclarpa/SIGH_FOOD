'use client';

// =============================================================================
// Marcar como pagada la comisión de un embajador
// =============================================================================
//
// No mueve dinero: el pago real ocurre fuera del sistema (transferencia,
// efectivo). Esto solo deja constancia de que ya se hizo, para que la
// próxima liquidación no vuelva a contar lo mismo.

import { useState, useTransition } from 'react';
import { liquidarComisionEmbajador } from '@/lib/acciones/contenido';

export function LiquidarComision({ id, pendienteCop }: { id: string; pendienteCop: number }) {
  const [enCurso, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (pendienteCop <= 0) return null;

  function liquidar() {
    if (!window.confirm(`¿Confirmas que ya le pagaste $${pendienteCop.toLocaleString('es-CO')} a este embajador fuera del sistema?`)) {
      return;
    }
    iniciar(async () => {
      const r = await liquidarComisionEmbajador(id);
      setError(r.ok ? null : r.error ?? 'No se pudo liquidar');
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={liquidar}
        disabled={enCurso}
        className="texto-suave text-xs hover:underline disabled:opacity-50"
      >
        {enCurso ? 'Marcando…' : 'Marcar liquidada'}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
