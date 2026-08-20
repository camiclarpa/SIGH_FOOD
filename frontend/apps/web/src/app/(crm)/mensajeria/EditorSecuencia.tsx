'use client';

// =============================================================================
// Editor de secuencias con vista previa real
// =============================================================================
//
// La vista previa usa un comensal de verdad, no valores de relleno: es la única
// forma de ver que "{{bar}}" acaba diciendo "Bar La Esquina" y no un hueco.

import { useRef, useState, useTransition } from 'react';
import { guardarSecuencia, previsualizar } from '@/lib/acciones/campanas';
import { VARIABLES } from '@/lib/plantillas';

interface Secuencia {
  id: string;
  name: string;
  trigger: string;
  channel: string;
  template: string;
  delayHours: number;
  targetSegment: string | null;
}

const DISPARADORES = [
  { valor: 'signup', texto: 'Al registrarse' },
  { valor: 'first_purchase', texto: 'Tras el primer momento' },
  { valor: 'inactive_30_days', texto: 'Por inactividad' },
  { valor: 'churn_risk', texto: 'Riesgo de abandono' },
  { valor: 'birthday', texto: 'Cumpleaños' },
  { valor: 'referral_conversion', texto: 'Referido convertido' },
  { valor: 'abandoned_cart', texto: 'Flujo abandonado' },
];

const CANALES = [
  { valor: 'whatsapp', texto: 'WhatsApp' },
  { valor: 'email', texto: 'Email' },
  { valor: 'sms', texto: 'SMS' },
  { valor: 'push', texto: 'Push' },
];

export function EditorSecuencia({ secuencia }: { secuencia?: Secuencia }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const areaTexto = useRef<HTMLTextAreaElement>(null);

  const [plantilla, setPlantilla] = useState(secuencia?.template ?? '');
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<{ mensaje: string; comensal: string; avisos: string[] } | null>(null);
  const [enCurso, iniciar] = useTransition();

  const editando = Boolean(secuencia);

  /** Inserta la variable donde está el cursor, no al final. */
  function insertar(clave: string) {
    const area = areaTexto.current;
    if (!area) return;
    const marca = `{{${clave}}}`;
    const antes = plantilla.slice(0, area.selectionStart);
    const despues = plantilla.slice(area.selectionEnd);
    setPlantilla(antes + marca + despues);
    // Devolver el foco y colocar el cursor tras la variable evita tener que
    // volver a hacer clic para seguir escribiendo.
    queueMicrotask(() => {
      area.focus();
      const pos = antes.length + marca.length;
      area.setSelectionRange(pos, pos);
    });
  }

  function verPrevia() {
    iniciar(async () => {
      const r = await previsualizar({ plantilla });
      if (r.ok && r.datos) { setVista(r.datos); setError(null); }
      else setError(r.error ?? 'No se pudo previsualizar');
    });
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await guardarSecuencia({
        id: secuencia?.id,
        name: String(f.get('name') ?? ''),
        trigger: String(f.get('trigger') ?? 'signup'),
        channel: String(f.get('channel') ?? 'whatsapp'),
        template: plantilla,
        delayHours: Number(f.get('delayHours') ?? 0),
        targetSegment: String(f.get('targetSegment') ?? '') || null,
      });
      if (r.ok) { setError(null); setVista(null); dialogo.current?.close(); }
      else setError(r.error ?? 'No se pudo guardar');
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setVista(null); dialogo.current?.showModal(); }}
        className={
          editando
            ? 'texto-suave text-xs hover:underline'
            : 'rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500'
        }
      >
        {editando ? 'Editar' : 'Nueva secuencia'}
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(40rem,94vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => { setError(null); setVista(null); }}
      >
        <form onSubmit={enviar} className="max-h-[85vh] overflow-y-auto p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? 'Editar secuencia' : 'Nueva secuencia'}
          </h2>

          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor="name">Nombre</label>
              <input id="name" name="name" required defaultValue={secuencia?.name} className={campo} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="trigger">Cuándo se envía</label>
                <select id="trigger" name="trigger" defaultValue={secuencia?.trigger ?? 'signup'} className={campo}>
                  {DISPARADORES.map((d) => <option key={d.valor} value={d.valor}>{d.texto}</option>)}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="channel">Canal</label>
                <select id="channel" name="channel" defaultValue={secuencia?.channel ?? 'whatsapp'} className={campo}>
                  {CANALES.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="delayHours">Espera (horas)</label>
                <input
                  id="delayHours" name="delayHours" type="number" min={0}
                  defaultValue={secuencia?.delayHours ?? 0} className={campo}
                />
                <p className="texto-suave mt-1 text-xs">0 = inmediato</p>
              </div>
              <div>
                <label className={etiqueta} htmlFor="targetSegment">Segmento (opcional)</label>
                <input
                  id="targetSegment" name="targetSegment"
                  defaultValue={secuencia?.targetSegment ?? ''} placeholder="Todos" className={campo}
                />
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="template">Mensaje</label>
              <textarea
                id="template" ref={areaTexto} value={plantilla}
                onChange={(e) => { setPlantilla(e.target.value); setVista(null); }}
                rows={4} required className={`${campo} resize-y`}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v.clave}
                    type="button"
                    onClick={() => insertar(v.clave)}
                    title={v.descripcion}
                    className="texto-suave cifras rounded border borde-tema px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {`{{${v.clave}}}`}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={verPrevia}
              disabled={enCurso || !plantilla.trim()}
              className="rounded-md border borde-tema px-3 py-1.5 text-xs hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              {enCurso ? 'Calculando…' : 'Ver cómo queda'}
            </button>

            {vista && (
              <div className="rounded-md border borde-tema p-3">
                <p className="texto-suave text-xs">Con los datos de {vista.comensal}:</p>
                <p className="mt-2 rounded bg-green-950/30 px-3 py-2 text-sm text-green-100">
                  {vista.mensaje}
                </p>
                {vista.avisos.map((a) => (
                  <p key={a} className="mt-1.5 text-xs text-amber-400">· {a}</p>
                ))}
              </div>
            )}
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
