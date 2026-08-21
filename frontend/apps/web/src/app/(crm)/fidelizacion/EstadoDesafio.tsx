'use client';

// =============================================================================
// Cambio de estado de un desafío
// =============================================================================
//
// Activar es lo único que se confirma. Es el paso que pone el desafío delante de
// comensales reales; pausar o finalizar solo dejan de mostrarlo, y pedir
// confirmación para parar algo hace que la gente dude justo cuando quiere parar.

import { useState, useTransition } from 'react';
import { cambiarEstadoDesafio } from '@/lib/acciones/desafios';

type Estado = 'borrador' | 'activo' | 'pausado' | 'finalizado';

export function EstadoDesafio({
  id,
  titulo,
  estado,
  puedeGestionar,
}: {
  id: string;
  titulo: string;
  estado: Estado;
  puedeGestionar: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  if (!puedeGestionar) return null;

  function cambiar(nuevo: Estado) {
    if (nuevo === 'activo') {
      const seguro = window.confirm(
        `¿Activar "${titulo}"?\n\n` +
        'A partir de ahora se le ofrecerá a los comensales que escaneen en la mesa, ' +
        'y los puntos que ganen son reales.'
      );
      if (!seguro) return;
    }

    iniciar(async () => {
      const r = await cambiarEstadoDesafio(id, nuevo);
      setError(r.ok ? null : r.error ?? 'No se pudo cambiar');
    });
  }

  const boton = 'rounded border borde-tema px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800';

  return (
    <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1.5">
      {estado !== 'activo' && estado !== 'finalizado' && (
        <button type="button" onClick={() => cambiar('activo')} disabled={enCurso} className={boton}>
          {enCurso ? '…' : 'Activar'}
        </button>
      )}
      {estado === 'activo' && (
        <button type="button" onClick={() => cambiar('pausado')} disabled={enCurso} className={boton}>
          {enCurso ? '…' : 'Pausar'}
        </button>
      )}
      {estado !== 'finalizado' && estado !== 'borrador' && (
        <button type="button" onClick={() => cambiar('finalizado')} disabled={enCurso} className={boton}>
          Finalizar
        </button>
      )}

      {error && (
        <p role="alert" className="w-full text-right text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
