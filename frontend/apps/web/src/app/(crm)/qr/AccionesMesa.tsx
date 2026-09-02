'use client';

// =============================================================================
// Redirigir y activar/desactivar un QR individual
// =============================================================================

import { useRef, useState, useTransition } from 'react';
import { redirigirQr, alternarQr } from '@/lib/acciones/qr';

export function AccionesMesa({
  id,
  mesa,
  activo,
  destinoUrl,
  campana,
}: {
  id: string;
  mesa: string;
  activo: boolean;
  destinoUrl: string | null;
  campana: string | null;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await redirigirQr({
        id,
        destinoUrl: String(f.get('destinoUrl') ?? '') || null,
        campana: String(f.get('campana') ?? '') || null,
      });
      if (r.ok) {
        setError(null);
        dialogo.current?.close();
      } else {
        setError(r.error ?? 'No se pudo redirigir');
      }
    });
  }

  function alternar() {
    iniciar(async () => { await alternarQr(id, !activo); });
  }

  return (
    <>
      <button type="button" onClick={() => { setError(null); dialogo.current?.showModal(); }} className="texto-suave text-xs hover:underline">
        Redirigir
      </button>
      {' · '}
      <button type="button" onClick={alternar} disabled={enCurso} className="texto-suave text-xs hover:underline disabled:opacity-50">
        {activo ? 'Desactivar' : 'Activar'}
      </button>

      <dialog ref={dialogo} className="superficie w-[min(26rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60">
        <form onSubmit={enviar} className="p-5">
          <h2 className="mb-1 text-base font-semibold">Redirigir {mesa}</h2>
          <p className="texto-suave mb-4 text-xs">
            Cambia a dónde lleva este adhesivo YA impreso, sin reemplazarlo físicamente.
            Déjalo vacío para volver al flujo normal de escaneo.
          </p>

          <label className="texto-suave mb-1 block text-xs font-medium" htmlFor="destinoUrl">URL de destino (https://)</label>
          <input
            id="destinoUrl" name="destinoUrl" type="url" defaultValue={destinoUrl ?? ''}
            placeholder="https://…"
            className="superficie w-full rounded-md border borde-tema px-3 py-2 text-sm"
          />

          <label className="texto-suave mb-1 mt-3 block text-xs font-medium" htmlFor="campana">Campaña</label>
          <input
            id="campana" name="campana" defaultValue={campana ?? ''}
            className="superficie w-full rounded-md border borde-tema px-3 py-2 text-sm"
          />

          {error && (
            <p role="alert" className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => dialogo.current?.close()} className="rounded-md border borde-tema px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={enCurso} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {enCurso ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
