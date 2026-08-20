'use client';

// =============================================================================
// Resolver una alerta de calidad
// =============================================================================
//
// La alerta la levanta la IA; quitarla es una decisión humana. Se pregunta si
// el fallo era real porque las dos respuestas significan cosas distintas: una
// tanda defectuosa que hay que perseguir, o un falso positivo del que el agente
// debería aprender.

import { useState, useTransition } from 'react';
import { resolverAlerta } from '@/lib/acciones/comensales';

export function ResolverAlerta({ id, puedeModerar }: { id: string; puedeModerar: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  if (!puedeModerar) return null;

  function resolver(esFalloReal: boolean) {
    iniciar(async () => {
      const r = await resolverAlerta({ id, esFalloReal, nota });
      if (r.ok) { setAbierto(false); setNota(''); setError(null); }
      else setError(r.error ?? 'No se pudo resolver');
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-md border borde-tema px-3 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Revisar
      </button>
    );
  }

  return (
    <div className="mt-2 w-full rounded-md border borde-tema p-3">
      <input
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota (opcional): lote, proveedor, qué se comprobó"
        className="superficie w-full rounded-md border borde-tema px-3 py-1.5 text-xs"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button" onClick={() => resolver(true)} disabled={enCurso}
          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          Sí, era un fallo real
        </button>
        <button
          type="button" onClick={() => resolver(false)} disabled={enCurso}
          className="rounded-md border borde-tema px-3 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          Falso positivo
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
