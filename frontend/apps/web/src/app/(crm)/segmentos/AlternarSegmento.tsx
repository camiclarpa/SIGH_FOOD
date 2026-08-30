'use client';

// =============================================================================
// Activar / desactivar un segmento
// =============================================================================
//
// alternarSegmento ya existía en lib/acciones/segmentos.ts —se necesitaba para
// poder retirar un segmento personalizado sin borrar su historial— pero no
// tenía ningún botón que la llamara. Un segmento desactivado deja de
// recalcularse y deja de poder recibir campañas, sin perder su definición.

import { useTransition } from 'react';
import { alternarSegmento } from '@/lib/acciones/segmentos';

export function AlternarSegmento({ id, activo }: { id: string; activo: boolean }) {
  const [enCurso, iniciar] = useTransition();

  return (
    <button
      type="button"
      onClick={() => iniciar(async () => { await alternarSegmento(id, !activo); })}
      disabled={enCurso}
      className="texto-suave text-xs hover:underline disabled:opacity-50"
    >
      {activo ? 'Desactivar' : 'Activar'}
    </button>
  );
}
