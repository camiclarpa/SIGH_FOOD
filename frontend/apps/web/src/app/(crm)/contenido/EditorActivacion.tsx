'use client';

// =============================================================================
// Alta y edición de una activación presencial
// =============================================================================
//
// Los campos de resultado —asistentes, comensales nuevos, ventas— solo aparecen
// cuando la activación ya está marcada como realizada. Antes del evento están
// necesariamente vacíos, y pedirlos en el momento de planificar invita a
// rellenarlos con una estimación que luego nadie distingue de un dato real.

import { useRef, useState, useTransition } from 'react';
import { guardarActivacion } from '@/lib/acciones/contenido';
import { TIPOS_ACTIVACION as _TIPOS_ACTIVACION, ESTADOS_ACTIVACION as _ESTADOS_ACTIVACION } from '@/lib/catalogo-contenido';

export interface Activacion {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  lugar: string;
  direccion?: string | null;
  fecha: Date | string;
  qrCodeId: string | null;
  aforoEstimado: number | null;
  asistentes: number | null;
  comensalesNuevos: number | null;
  ventasCOP: number | null;
  costeCOP: number | null;
  notas?: string | null;
}

const TIPOS_ACTIVACION = _TIPOS_ACTIVACION;
const ESTADOS_ACTIVACION = _ESTADOS_ACTIVACION;

/** Fecha en el formato que espera <input type="datetime-local">. */
function paraInput(fecha: Date | string | undefined): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  // El input no admite zona horaria: se le da la hora local ya desplazada.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function EditorActivacion({
  activacion,
  qrDisponibles,
}: {
  activacion?: Activacion;
  qrDisponibles: Array<{ id: string; etiqueta: string | null }>;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState(activacion?.estado ?? 'planificada');
  const [enCurso, iniciar] = useTransition();

  const editando = Boolean(activacion);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    iniciar(async () => {
      const r = await guardarActivacion({
        id: activacion?.id,
        nombre: String(f.get('nombre') ?? ''),
        tipo: String(f.get('tipo') ?? 'popup'),
        estado: String(f.get('estado') ?? 'planificada'),
        lugar: String(f.get('lugar') ?? ''),
        direccion: String(f.get('direccion') ?? ''),
        fecha: String(f.get('fecha') ?? ''),
        qrCodeId: String(f.get('qrCodeId') ?? ''),
        aforoEstimado: String(f.get('aforoEstimado') ?? ''),
        asistentes: String(f.get('asistentes') ?? ''),
        comensalesNuevos: String(f.get('comensalesNuevos') ?? ''),
        ventasCOP: String(f.get('ventasCOP') ?? ''),
        costeCOP: String(f.get('costeCOP') ?? ''),
        notas: String(f.get('notas') ?? ''),
      });

      if (r.ok) { setError(null); dialogo.current?.close(); }
      else setError(r.error ?? 'No se pudo guardar');
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setEstado(activacion?.estado ?? 'planificada'); dialogo.current?.showModal(); }}
        className={
          editando
            ? 'texto-suave text-xs hover:underline'
            : 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500'
        }
      >
        {editando ? 'Editar' : 'Nueva activación'}
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(34rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form onSubmit={enviar} className="p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? 'Editar activación' : 'Nueva activación'}
          </h2>

          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor="nombre">Nombre</label>
              <input id="nombre" name="nombre" required maxLength={200} defaultValue={activacion?.nombre} className={campo} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" defaultValue={activacion?.tipo ?? 'popup'} className={campo}>
                  {TIPOS_ACTIVACION.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="estado">Estado</label>
                <select
                  id="estado" name="estado" value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className={campo}
                >
                  {ESTADOS_ACTIVACION.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="lugar">Lugar</label>
                <input id="lugar" name="lugar" required maxLength={200} defaultValue={activacion?.lugar} className={campo} />
              </div>
              <div>
                <label className={etiqueta} htmlFor="fecha">Fecha y hora</label>
                <input
                  id="fecha" name="fecha" type="datetime-local" required
                  defaultValue={paraInput(activacion?.fecha)} className={campo}
                />
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="direccion">Dirección</label>
              <input id="direccion" name="direccion" maxLength={255} defaultValue={activacion?.direccion ?? ''} className={campo} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="qrCodeId">QR de la activación</label>
                <select id="qrCodeId" name="qrCodeId" defaultValue={activacion?.qrCodeId ?? ''} className={campo}>
                  <option value="">Sin QR</option>
                  {qrDisponibles.map((q) => (
                    <option key={q.id} value={q.id}>{q.etiqueta ?? q.id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="aforoEstimado">Aforo estimado</label>
                <input
                  id="aforoEstimado" name="aforoEstimado" type="number" min={0}
                  defaultValue={activacion?.aforoEstimado ?? ''} className={campo}
                />
              </div>
              <p className="texto-suave col-span-2 text-xs">
                Con un QR propio, el evento deja de ser un gasto que «salió bien» y pasa a ser un
                número: cuánta gente escaneó y cuántos acabaron pidiendo.
              </p>
            </div>

            {/* Los resultados solo cuando ya ocurrió. Ver la cabecera. */}
            {estado === 'realizada' && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border borde-tema p-3">
                <p className="texto-suave col-span-2 text-xs font-medium">Cómo salió</p>
                <div>
                  <label className={etiqueta} htmlFor="asistentes">Asistentes</label>
                  <input id="asistentes" name="asistentes" type="number" min={0} defaultValue={activacion?.asistentes ?? ''} className={campo} />
                </div>
                <div>
                  <label className={etiqueta} htmlFor="comensalesNuevos">Comensales nuevos</label>
                  <input id="comensalesNuevos" name="comensalesNuevos" type="number" min={0} defaultValue={activacion?.comensalesNuevos ?? ''} className={campo} />
                </div>
                <div>
                  <label className={etiqueta} htmlFor="ventasCOP">Ventas (COP)</label>
                  <input id="ventasCOP" name="ventasCOP" type="number" min={0} defaultValue={activacion?.ventasCOP ?? ''} className={campo} />
                </div>
                <div>
                  <label className={etiqueta} htmlFor="costeCOP">Coste (COP)</label>
                  <input id="costeCOP" name="costeCOP" type="number" min={0} defaultValue={activacion?.costeCOP ?? ''} className={campo} />
                </div>
              </div>
            )}

            <div>
              <label className={etiqueta} htmlFor="notas">Notas</label>
              <textarea id="notas" name="notas" rows={2} maxLength={2000} defaultValue={activacion?.notas ?? ''} className={campo} />
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
