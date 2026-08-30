'use client';

// =============================================================================
// Lanzar una secuencia a un segmento, con un clic
// =============================================================================
//
// Antes, dirigir una campaña a un segmento dependía de que su disparador
// automático coincidiera con este grupo — y esperar al cron del día
// siguiente. Este botón manda la secuencia elegida a TODOS los miembros
// actuales del segmento, ahora mismo.

import { useRef, useState, useTransition } from 'react';
import { dispararCampanaASegmento } from '@/lib/acciones/campanas';

interface Secuencia {
  id: string;
  nombre: string;
  canal: string;
}

type Estado =
  | { tipo: 'inactivo' }
  | { tipo: 'ok'; enviados: number; miembros: number; frenadosPorTope: number; fallidos: number; yaHabianRecibido: number }
  | { tipo: 'error'; mensaje: string };

export function LanzarCampana({
  segmentId,
  segmentoNombre,
  comensales,
  secuencias,
}: {
  segmentId: string;
  segmentoNombre: string;
  comensales: number;
  secuencias: Secuencia[];
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [sequenceId, setSequenceId] = useState(secuencias[0]?.id ?? '');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inactivo' });
  const [enCurso, iniciar] = useTransition();

  if (secuencias.length === 0 || comensales === 0) return null;

  function lanzar() {
    if (!sequenceId) return;
    iniciar(async () => {
      const r = await dispararCampanaASegmento({ segmentId, segmentoNombre, sequenceId });
      if (r.ok && r.datos) {
        setEstado({ tipo: 'ok', ...r.datos });
      } else {
        setEstado({ tipo: 'error', mensaje: r.error ?? 'No se pudo lanzar la campaña' });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setEstado({ tipo: 'inactivo' }); dialogo.current?.showModal(); }}
        className="mt-3 rounded-md border border-orange-500/50 px-2.5 py-1 text-xs font-medium text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
      >
        Lanzar campaña
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(28rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
      >
        <div className="p-5">
          <h2 className="mb-1 text-base font-semibold">Lanzar campaña a &ldquo;{segmentoNombre}&rdquo;</h2>
          <p className="texto-suave mb-4 text-xs">
            Se manda ahora mismo a los {comensales} comensales de este segmento. A quien ya
            recibió esta secuencia, o superó el tope de frecuencia, no se le repite.
          </p>

          <label className="texto-suave mb-1 block text-xs font-medium" htmlFor="secuencia">Secuencia</label>
          <select
            id="secuencia"
            value={sequenceId}
            onChange={(e) => setSequenceId(e.target.value)}
            className="superficie w-full rounded-md border borde-tema px-3 py-2 text-sm"
          >
            {secuencias.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.canal}</option>)}
          </select>

          {estado.tipo === 'ok' && (
            <div role="status" className="mt-3 rounded-md border border-green-700/50 bg-green-950/30 px-3 py-2.5 text-xs text-green-200">
              <p className="font-semibold">Enviados: {estado.enviados} de {estado.miembros}</p>
              {estado.yaHabianRecibido > 0 && <p>{estado.yaHabianRecibido} ya la habían recibido</p>}
              {estado.frenadosPorTope > 0 && <p>{estado.frenadosPorTope} frenados por tope de frecuencia</p>}
              {estado.fallidos > 0 && <p>{estado.fallidos} fallaron al enviar</p>}
            </div>
          )}
          {estado.tipo === 'error' && (
            <div role="alert" className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2.5 text-xs text-red-200">
              {estado.mensaje}
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="rounded-md border borde-tema px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={lanzar}
              disabled={enCurso || !sequenceId}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {enCurso ? 'Enviando…' : 'Enviar ahora'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
