'use client';

// =============================================================================
// Alta y edición de un premio
// =============================================================================
//
// Un <dialog> nativo en vez de un modal a mano: trae el foco atrapado, el cierre
// con Escape y el fondo inerte sin escribir una línea de eso, y son justo las
// tres cosas que casi siempre faltan en un modal casero.

import { useRef, useState, useTransition } from 'react';
import { guardarPremio } from '@/lib/acciones/canjes';
import { NIVELES } from '@/lib/catalogo-b2c';

interface Premio {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  costePuntos: number;
  stock: number | null;
  nivelMinimo: string | null;
  diasValidez: number;
  activo: boolean;
}

const TIPOS = [
  { valor: 'producto', texto: 'Producto' },
  { valor: 'descuento', texto: 'Descuento' },
  { valor: 'experiencia', texto: 'Experiencia' },
  { valor: 'acceso_vip', texto: 'Acceso VIP' },
];

export function EditorPremio({ premio }: { premio?: Premio }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const editando = Boolean(premio);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const stockCrudo = String(f.get('stock') ?? '').trim();

    iniciar(async () => {
      const r = await guardarPremio({
        id: premio?.id,
        nombre: String(f.get('nombre') ?? ''),
        descripcion: String(f.get('descripcion') ?? ''),
        tipo: String(f.get('tipo') ?? 'producto'),
        costePuntos: Number(f.get('costePuntos')),
        // Vacío significa "sin límite", que no es lo mismo que cero.
        stock: stockCrudo === '' ? null : Number(stockCrudo),
        nivelMinimo: String(f.get('nivelMinimo') ?? '') || null,
        diasValidez: Number(f.get('diasValidez')),
        activo: f.get('activo') === 'on',
      });

      if (r.ok) {
        setError(null);
        dialogo.current?.close();
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
        onClick={() => { setError(null); dialogo.current?.showModal(); }}
        className={
          editando
            ? 'texto-suave text-xs hover:underline'
            : 'rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-500'
        }
      >
        {editando ? 'Editar' : 'Nuevo premio'}
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(32rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form onSubmit={enviar} className="p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? 'Editar premio' : 'Nuevo premio'}
          </h2>

          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor="nombre">Nombre</label>
              <input id="nombre" name="nombre" required defaultValue={premio?.nombre} className={campo} />
            </div>

            <div>
              <label className={etiqueta} htmlFor="descripcion">Descripción</label>
              <input id="descripcion" name="descripcion" defaultValue={premio?.descripcion} className={campo} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" defaultValue={premio?.tipo ?? 'producto'} className={campo}>
                  {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="costePuntos">Coste en puntos</label>
                <input
                  id="costePuntos" name="costePuntos" type="number" min={1} required
                  defaultValue={premio?.costePuntos ?? 100} className={campo}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="stock">Stock</label>
                <input
                  id="stock" name="stock" type="number" min={0}
                  defaultValue={premio?.stock ?? ''} placeholder="Sin límite" className={campo}
                />
                <p className="texto-suave mt-1 text-xs">Vacío = sin límite</p>
              </div>
              <div>
                <label className={etiqueta} htmlFor="diasValidez">Días de validez</label>
                <input
                  id="diasValidez" name="diasValidez" type="number" min={1} required
                  defaultValue={premio?.diasValidez ?? 30} className={campo}
                />
              </div>
            </div>

            <div>
              <label className={etiqueta} htmlFor="nivelMinimo">Nivel mínimo</label>
              <select id="nivelMinimo" name="nivelMinimo" defaultValue={premio?.nivelMinimo ?? ''} className={campo}>
                <option value="">Cualquiera</option>
                {NIVELES.map((n) => <option key={n.nivel} value={n.nivel}>{n.etiqueta}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="activo" defaultChecked={premio?.activo ?? true} className="h-4 w-4" />
              Disponible para canjear
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
