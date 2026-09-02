'use client';

// =============================================================================
// Alta y edición de una insignia
// =============================================================================
//
// Mismo patrón que EditorPremio: un <dialog> nativo, sin modal casero.

import { useRef, useState, useTransition } from 'react';
import { guardarInsignia, alternarInsignia } from '@/lib/acciones/insignias';

interface Insignia {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  criterio: string;
  umbral: number;
  parametro: string | null;
  puntosOtorgados: number;
  activa: boolean;
}

const CRITERIOS = [
  { valor: 'pedidos_totales', texto: 'Pedidos entregados' },
  { valor: 'gasto_acumulado', texto: 'Gasto acumulado (COP)' },
  { valor: 'lineas_pedidas', texto: 'Productos distintos pedidos' },
  { valor: 'escaneos_totales', texto: 'Momentos acumulados' },
  { valor: 'lineas_distintas', texto: 'Líneas probadas' },
  { valor: 'bares_distintos', texto: 'Bares visitados' },
  { valor: 'escaneos_en_franja', texto: 'Escaneos en una franja horaria' },
  { valor: 'racha_semanas', texto: 'Semanas seguidas activo' },
  { valor: 'referidos_convertidos', texto: 'Referidos convertidos' },
];

export function EditorInsignia({ insignia }: { insignia?: Insignia }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const editando = Boolean(insignia);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    iniciar(async () => {
      const r = await guardarInsignia({
        id: insignia?.id,
        codigo: String(f.get('codigo') ?? ''),
        nombre: String(f.get('nombre') ?? ''),
        descripcion: String(f.get('descripcion') ?? ''),
        icono: String(f.get('icono') ?? ''),
        criterio: String(f.get('criterio') ?? 'pedidos_totales'),
        umbral: Number(f.get('umbral')),
        parametro: String(f.get('parametro') ?? '') || null,
        puntosOtorgados: Number(f.get('puntosOtorgados')),
        activa: f.get('activa') === 'on',
      });

      if (r.ok) {
        setError(null);
        dialogo.current?.close();
        // El <dialog> sigue montado tras cerrarse — es el mismo elemento la
        // próxima vez que se abra "Nueva insignia" — y sin resetear el
        // formulario aquí, esa próxima apertura arrancaría con los datos de
        // esta insignia ya escritos en los campos.
        if (!editando) formulario.current?.reset();
      } else {
        setError(r.error ?? 'No se pudo guardar');
      }
    });
  }

  function alternar() {
    if (!insignia) return;
    iniciar(async () => {
      await alternarInsignia(insignia.id, !insignia.activa);
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <>
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            // Al crear (no al editar) se limpia el formulario ANTES de
            // abrir: es el mismo <dialog> de la última vez, y sin esto
            // "Nueva insignia" reabriría con los datos de la insignia
            // anterior todavía escritos.
            if (!editando) formulario.current?.reset();
            dialogo.current?.showModal();
          }}
          className={
            editando
              ? 'texto-suave text-xs hover:underline'
              : 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500'
          }
        >
          {editando ? 'Editar' : 'Nueva insignia'}
        </button>
        {editando && (
          <button
            type="button"
            onClick={alternar}
            disabled={enCurso}
            className="texto-suave text-xs hover:underline disabled:opacity-50"
          >
            {insignia?.activa ? 'Desactivar' : 'Activar'}
          </button>
        )}
      </span>

      <dialog
        ref={dialogo}
        className="superficie w-[min(32rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form ref={formulario} onSubmit={enviar} className="p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? 'Editar insignia' : 'Nueva insignia'}
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-[1fr,5rem] gap-3">
              <div>
                <label className={etiqueta} htmlFor="nombre">Nombre</label>
                <input id="nombre" name="nombre" required defaultValue={insignia?.nombre} className={campo} />
              </div>
              <div>
                <label className={etiqueta} htmlFor="icono">Icono</label>
                <input id="icono" name="icono" maxLength={16} defaultValue={insignia?.icono ?? '*'} className={campo} />
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="codigo">Código</label>
              <input
                id="codigo" name="codigo" required disabled={editando}
                defaultValue={insignia?.codigo}
                placeholder="ej. cliente_fiel"
                className={`${campo} ${editando ? 'opacity-60' : ''} cifras`}
              />
              <p className="texto-suave mt-1 text-xs">Minúsculas y guion bajo. No se puede cambiar después.</p>
            </div>

            <div>
              <label className={etiqueta} htmlFor="descripcion">Descripción</label>
              <input id="descripcion" name="descripcion" required defaultValue={insignia?.descripcion} className={campo} />
            </div>

            <div>
              <label className={etiqueta} htmlFor="criterio">Se gana por</label>
              <select id="criterio" name="criterio" defaultValue={insignia?.criterio ?? 'pedidos_totales'} className={campo}>
                {CRITERIOS.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={etiqueta} htmlFor="umbral">Umbral</label>
                <input
                  id="umbral" name="umbral" type="number" min={1} required
                  defaultValue={insignia?.umbral ?? 5} className={campo}
                />
              </div>
              <div>
                <label className={etiqueta} htmlFor="parametro">Parámetro</label>
                <input
                  id="parametro" name="parametro" defaultValue={insignia?.parametro ?? ''}
                  placeholder="opcional" className={campo}
                />
              </div>
              <div>
                <label className={etiqueta} htmlFor="puntosOtorgados">Puntos</label>
                <input
                  id="puntosOtorgados" name="puntosOtorgados" type="number" min={0} required
                  defaultValue={insignia?.puntosOtorgados ?? 50} className={campo}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activa" defaultChecked={insignia?.activa ?? true} className="h-4 w-4" />
              Activa
            </label>
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
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {enCurso ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
