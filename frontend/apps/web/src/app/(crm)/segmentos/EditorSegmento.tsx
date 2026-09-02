'use client';

// =============================================================================
// Constructor de un segmento personalizado
// =============================================================================
//
// Cada condición es una casilla que se marca y rellena: al guardar, solo entran
// en la regla las que están marcadas, combinadas siempre con Y. No hay opción
// de O ni de paréntesis porque el motor que evalúa la regla —segmentacion.ts—
// no sabe resolver eso; un selector de O que no filtrara nada sería peor que
// no tenerlo.

import { useRef, useState, useTransition } from 'react';
import { crearSegmentoPersonalizado } from '@/lib/acciones/segmentos';
import { LINEAS_PRODUCTO, NIVELES } from '@/lib/catalogo-b2c';

const SEGMENTOS_RFM = [
  { valor: 'campeon', texto: 'Campeón (compra mucho y hace poco)' },
  { valor: 'leal', texto: 'Leal (vuelve con regularidad)' },
  { valor: 'prometedor', texto: 'Prometedor (pocos pedidos, recientes)' },
  { valor: 'nuevo', texto: 'Nuevo (sin historial aún)' },
  { valor: 'en_riesgo', texto: 'En riesgo (tarda más de lo suyo)' },
  { valor: 'dormido', texto: 'Dormido (hace mucho que no vuelve)' },
];

export function EditorSegmento() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  // Cada condición se activa con su propia casilla; el valor solo cuenta si
  // la casilla está marcada.
  const [usaRfm, setUsaRfm] = useState(false);
  const [usaPedidos, setUsaPedidos] = useState(false);
  const [usaGasto, setUsaGasto] = useState(false);
  const [usaEscaneos, setUsaEscaneos] = useState(false);
  const [usaInactivo, setUsaInactivo] = useState(false);
  const [usaLinea, setUsaLinea] = useState(false);
  const [usaNivel, setUsaNivel] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    const regla: Record<string, unknown> = {};
    if (usaRfm) regla.segmentoRfm = String(f.get('segmentoRfm'));
    if (usaPedidos) regla.minPedidos = Number(f.get('minPedidos'));
    if (usaGasto) regla.minGasto = Number(f.get('minGasto'));
    if (usaEscaneos) regla.minEscaneos = Number(f.get('minEscaneos'));
    if (usaInactivo) regla.diasInactivo = Number(f.get('diasInactivo'));
    if (usaLinea) regla.lineaProducto = String(f.get('lineaProducto'));
    if (usaNivel) regla.nivel = String(f.get('nivel'));

    iniciar(async () => {
      const r = await crearSegmentoPersonalizado({
        nombre: String(f.get('nombre') ?? ''),
        descripcion: String(f.get('descripcion') ?? ''),
        color: String(f.get('color') ?? 'slate'),
        regla,
      });

      if (r.ok) {
        setError(null);
        dialogo.current?.close();
        /*
          e.currentTarget.reset() — que es lo que había aquí antes — rompía la
          pantalla entera con "Cannot read properties of null (reading
          'reset')". React limpia el SyntheticEvent en cuanto el manejador
          síncrono termina, y esto se ejecuta DESPUÉS, dentro del callback
          async de iniciar(): para entonces e.currentTarget ya es null. Por
          eso el formulario se referencia aparte, con su propia ref, en vez de
          leerlo del evento.
        */
        formulario.current?.reset();
        setUsaRfm(false); setUsaPedidos(false); setUsaGasto(false);
        setUsaEscaneos(false); setUsaInactivo(false); setUsaLinea(false); setUsaNivel(false);
      } else {
        setError(r.error ?? 'No se pudo crear el segmento');
      }
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-2.5 py-1.5 text-sm';
  const fila = 'flex items-center gap-2';

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); dialogo.current?.showModal(); }}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Nuevo segmento
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(34rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form ref={formulario} onSubmit={enviar} className="max-h-[85vh] overflow-y-auto p-5">
          <h2 className="mb-1 text-base font-semibold">Nuevo segmento</h2>
          <p className="texto-suave mb-4 text-xs">
            Marca las condiciones que quieres combinar. Todas las marcadas deben cumplirse a la vez.
          </p>

          <div className="space-y-3">
            <input name="nombre" required placeholder="Nombre del segmento" className={campo} />
            <input name="descripcion" placeholder="Descripción (opcional)" className={campo} />

            <div className="space-y-2 rounded-md border borde-tema p-3">
              <label className={fila}>
                <input type="checkbox" checked={usaRfm} onChange={(e) => setUsaRfm(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Valor del comensal (RFM)</span>
              </label>
              {usaRfm && (
                <select name="segmentoRfm" defaultValue="campeon" className={campo}>
                  {SEGMENTOS_RFM.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                </select>
              )}

              <label className={fila}>
                <input type="checkbox" checked={usaPedidos} onChange={(e) => setUsaPedidos(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Mínimo de pedidos entregados</span>
              </label>
              {usaPedidos && (
                <input name="minPedidos" type="number" min={1} required defaultValue={5} className={campo} />
              )}

              <label className={fila}>
                <input type="checkbox" checked={usaGasto} onChange={(e) => setUsaGasto(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Gasto acumulado mínimo (COP)</span>
              </label>
              {usaGasto && (
                <input name="minGasto" type="number" min={1000} step={1000} required defaultValue={100000} className={campo} />
              )}

              <label className={fila}>
                <input type="checkbox" checked={usaEscaneos} onChange={(e) => setUsaEscaneos(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Mínimo de momentos escaneados</span>
              </label>
              {usaEscaneos && (
                <input name="minEscaneos" type="number" min={1} required defaultValue={3} className={campo} />
              )}

              <label className={fila}>
                <input type="checkbox" checked={usaInactivo} onChange={(e) => setUsaInactivo(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Días sin actividad</span>
              </label>
              {usaInactivo && (
                <input name="diasInactivo" type="number" min={1} required defaultValue={15} className={campo} />
              )}

              <label className={fila}>
                <input type="checkbox" checked={usaLinea} onChange={(e) => setUsaLinea(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Ha probado una línea de producto</span>
              </label>
              {usaLinea && (
                <select name="lineaProducto" defaultValue={LINEAS_PRODUCTO[0].codigo} className={campo}>
                  {LINEAS_PRODUCTO.map((l) => <option key={l.codigo} value={l.codigo}>{l.etiqueta}</option>)}
                </select>
              )}

              <label className={fila}>
                <input type="checkbox" checked={usaNivel} onChange={(e) => setUsaNivel(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm">Nivel de fidelización</span>
              </label>
              {usaNivel && (
                <select name="nivel" defaultValue={NIVELES[0].nivel} className={campo}>
                  {NIVELES.map((n) => <option key={n.nivel} value={n.nivel}>{n.etiqueta}</option>)}
                </select>
              )}
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
              {enCurso ? 'Creando…' : 'Crear segmento'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
