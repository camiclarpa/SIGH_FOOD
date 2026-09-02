'use client';

// =============================================================================
// Generar un lote de QR para un local
// =============================================================================

import { useRef, useState, useTransition } from 'react';
import { crearLote } from '@/lib/acciones/qr';

interface Cuenta {
  id: string;
  nombre: string;
}

export function GenerarLote({ cuentas }: { cuentas: Cuenta[] }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ creados: number; omitidos: string[] } | null>(null);
  const [enCurso, iniciar] = useTransition();

  if (cuentas.length === 0) return null;

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    iniciar(async () => {
      const r = await crearLote({
        accountId: String(f.get('accountId')),
        desde: Number(f.get('desde')),
        hasta: Number(f.get('hasta')),
        prefijo: String(f.get('prefijo') ?? '') || undefined,
        campana: String(f.get('campana') ?? '') || undefined,
      });

      if (r.ok && r.datos) {
        setError(null);
        setResultado(r.datos);
      } else {
        setError(r.error ?? 'No se pudo generar el lote');
      }
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setResultado(null); dialogo.current?.showModal(); }}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        + Generar QR
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(28rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
      >
        <form onSubmit={enviar} className="p-5">
          <h2 className="mb-4 text-base font-semibold">Generar lote de QR</h2>

          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor="accountId">Local</label>
              <select id="accountId" name="accountId" required defaultValue={cuentas[0].id} className={campo}>
                {cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="desde">Mesa desde</label>
                <input id="desde" name="desde" type="number" min={1} required defaultValue={1} className={campo} />
              </div>
              <div>
                <label className={etiqueta} htmlFor="hasta">Mesa hasta</label>
                <input id="hasta" name="hasta" type="number" min={1} required defaultValue={10} className={campo} />
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="prefijo">Prefijo</label>
              <input id="prefijo" name="prefijo" defaultValue="Mesa" className={campo} />
            </div>

            <div>
              <label className={etiqueta} htmlFor="campana">Campaña (opcional)</label>
              <input id="campana" name="campana" placeholder="ej. lanzamiento-2026" className={campo} />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}
          {resultado && (
            <div role="status" className="mt-3 rounded-md border border-green-700/50 bg-green-950/30 px-3 py-2 text-xs text-green-200">
              <p>{resultado.creados} código{resultado.creados === 1 ? '' : 's'} nuevo{resultado.creados === 1 ? '' : 's'} creado{resultado.creados === 1 ? '' : 's'}.</p>
              {resultado.omitidos.length > 0 && (
                <p className="mt-1">Ya existían: {resultado.omitidos.join(', ')}</p>
              )}
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
              type="submit"
              disabled={enCurso}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {enCurso ? 'Generando…' : 'Generar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
