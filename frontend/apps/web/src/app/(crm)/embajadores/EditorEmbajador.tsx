'use client';

// =============================================================================
// Alta y edición de un embajador
// =============================================================================
//
// El código es el campo importante: va en el enlace que la persona comparte
// (bocazo.co/?ref=camilo) y es lo que después cruza con los pedidos para saber
// qué trajo. Por eso se propone uno a partir de su nombre en vez de dejar el
// campo vacío: un código tecleado a las prisas acaba siendo "emb1", y dentro de
// seis meses nadie sabe de quién era.

import { useRef, useState, useTransition } from 'react';
import { guardarEmbajador } from '@/lib/acciones/contenido';
import { ESTADOS_EMBAJADOR as _ESTADOS_EMBAJADOR } from '@/lib/catalogo-contenido';

export interface Embajador {
  id: string;
  consumerId: string;
  alias: string | null;
  codigo: string;
  estado: string;
  puntosPorPedido: number;
  comisionPorPedidoCop: number | null;
  seguidores: number | null;
}

const ESTADOS_EMBAJADOR = _ESTADOS_EMBAJADOR;

/** Sugiere un código legible a partir del nombre. */
function sugerir(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
}

export function EditorEmbajador({
  embajador,
  candidatos,
  nombreActual,
}: {
  embajador?: Embajador;
  /** Comensales que aún no son embajadores. Vacío al editar. */
  candidatos: Array<{ id: string; nombre: string | null; telefono: string; gasto: number }>;
  nombreActual?: string | null;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState(embajador?.codigo ?? '');
  const [enCurso, iniciar] = useTransition();

  const editando = Boolean(embajador);

  function alElegirComensal(e: React.ChangeEvent<HTMLSelectElement>) {
    // Solo se propone si el campo está vacío: si ya escribió algo, pisárselo
    // sería tirar su trabajo.
    if (codigo.trim()) return;
    const elegido = candidatos.find((c) => c.id === e.target.value);
    if (elegido?.nombre) setCodigo(sugerir(elegido.nombre));
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    iniciar(async () => {
      const r = await guardarEmbajador({
        id: embajador?.id,
        consumerId: embajador?.consumerId ?? String(f.get('consumerId') ?? ''),
        alias: String(f.get('alias') ?? ''),
        codigo: String(f.get('codigo') ?? ''),
        estado: String(f.get('estado') ?? 'activo'),
        puntosPorPedido: String(f.get('puntosPorPedido') ?? '0'),
        comisionPorPedidoCop: String(f.get('comisionPorPedidoCop') ?? ''),
        seguidores: String(f.get('seguidores') ?? ''),
        notas: String(f.get('notas') ?? ''),
      });

      if (r.ok) {
        setError(null);
        dialogo.current?.close();
        if (!editando) formulario.current?.reset();
      } else {
        setError(r.error ?? 'No se pudo guardar');
      }
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setCodigo(embajador?.codigo ?? '');
          if (!editando) formulario.current?.reset();
          dialogo.current?.showModal();
        }}
        disabled={!editando && candidatos.length === 0}
        className={
          editando
            ? 'texto-suave text-xs hover:underline'
            : 'rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50'
        }
      >
        {editando ? 'Editar' : 'Nuevo embajador'}
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(32rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form ref={formulario} onSubmit={enviar} className="p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? `Editar a ${nombreActual ?? 'este embajador'}` : 'Nuevo embajador'}
          </h2>

          <div className="space-y-3">
            {editando ? (
              <p className="texto-suave text-xs">
                Embajador: <strong>{nombreActual ?? 'sin nombre'}</strong>. La persona no se cambia:
                para pasar el programa a otra, retira esta y da de alta la nueva — así el histórico
                de lo que trajo cada una sigue cuadrando.
              </p>
            ) : (
              <div>
                <label className={etiqueta} htmlFor="consumerId">Comensal</label>
                <select id="consumerId" name="consumerId" required className={campo} onChange={alElegirComensal}>
                  <option value="">Elige a quién</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre ?? 'Sin nombre'} · {c.telefono}
                      {c.gasto > 0 ? ` · $${c.gasto.toLocaleString('es-CO')}` : ''}
                    </option>
                  ))}
                </select>
                <p className="texto-suave mt-1 text-xs">
                  Ordenados por lo que han gastado: quien más compra suele convencer mejor, porque
                  conoce el producto de verdad.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="alias">Alias público</label>
                <input
                  id="alias" name="alias" maxLength={80} defaultValue={embajador?.alias ?? ''}
                  placeholder="@arepamica" className={campo}
                />
              </div>
              <div>
                <label className={etiqueta} htmlFor="estado">Estado</label>
                <select id="estado" name="estado" defaultValue={embajador?.estado ?? 'activo'} className={campo}>
                  {ESTADOS_EMBAJADOR.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="codigo">Código del enlace</label>
              <input
                id="codigo" name="codigo" required maxLength={60}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className={`${campo} cifras`}
              />
              <p className="texto-suave mt-1 break-all text-xs">
                Su enlace será <code className="cifras">bocazo.co/?ref={codigo || '…'}</code>. Cada
                pedido que entre por ahí queda contado a su nombre.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="puntosPorPedido">Puntos por pedido</label>
                <input
                  id="puntosPorPedido" name="puntosPorPedido" type="number" min={0}
                  defaultValue={embajador?.puntosPorPedido ?? 0} className={campo}
                />
                <p className="texto-suave mt-1 text-xs">0 = solo visibilidad</p>
              </div>
              <div>
                <label className={etiqueta} htmlFor="comisionPorPedidoCop">Comisión (COP) por pedido</label>
                <input
                  id="comisionPorPedidoCop" name="comisionPorPedidoCop" type="number" min={0} step={100}
                  defaultValue={embajador?.comisionPorPedidoCop ?? ''} placeholder="Sin comisión en dinero"
                  className={campo}
                />
                <p className="texto-suave mt-1 text-xs">
                  Se calcula, no se paga aquí: el dinero se le entrega fuera del sistema.
                </p>
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="seguidores">Seguidores</label>
              <input
                id="seguidores" name="seguidores" type="number" min={0}
                defaultValue={embajador?.seguidores ?? ''} placeholder="Opcional" className={campo}
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="notas">Notas</label>
              <textarea id="notas" name="notas" rows={2} maxLength={2000} className={campo} />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="rounded-md border borde-tema px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enCurso}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {enCurso ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
