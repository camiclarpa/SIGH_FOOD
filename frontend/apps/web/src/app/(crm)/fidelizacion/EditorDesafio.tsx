'use client';

// =============================================================================
// Editor de desafíos en mesa
// =============================================================================
//
// Lo que hace distinto a este editor de los demás del CRM es que la respuesta
// correcta se marca aquí y no sale nunca hacia el comensal: el endpoint público
// devuelve las preguntas sin ese campo y corrige en el servidor. Por eso la
// pantalla puede enseñarla sin más.
//
// Marcar la correcta es opcional. Hay desafíos de opinión —"¿cuál te gustó
// más?"— donde no hay respuesta buena y todo el mundo puntúa; obligar a elegir
// una convertiría una encuesta en un examen.

import { useRef, useState, useTransition } from 'react';
import { guardarDesafio, type PreguntaEditable } from '@/lib/acciones/desafios';

interface Desafio {
  id: string;
  titulo: string;
  descripcion: string | null;
  preguntas: PreguntaEditable[];
  puntosPremio: number;
  premioDescripcion: string | null;
  lineaProducto: string | null;
  zona: string | null;
  empiezaEn: string | null;
  terminaEn: string | null;
}

const MAX_PREGUNTAS = 10;
const MAX_OPCIONES = 5;

function preguntaVacia(): PreguntaEditable {
  return { pregunta: '', opciones: ['', ''], correcta: undefined };
}

/** `datetime-local` necesita 'YYYY-MM-DDTHH:mm', sin zona ni segundos. */
function paraInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function EditorDesafio({
  desafio,
  lineas,
}: {
  desafio?: Desafio;
  lineas: Array<{ codigo: string; etiqueta: string }>;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);

  const [preguntas, setPreguntas] = useState<PreguntaEditable[]>(
    desafio?.preguntas?.length ? desafio.preguntas : [preguntaVacia()]
  );
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  const editando = Boolean(desafio);

  function cambiarPregunta(i: number, cambio: Partial<PreguntaEditable>) {
    setPreguntas(preguntas.map((p, j) => (i === j ? { ...p, ...cambio } : p)));
    setError(null);
  }

  function cambiarOpcion(i: number, j: number, texto: string) {
    cambiarPregunta(i, { opciones: preguntas[i]!.opciones.map((o, k) => (k === j ? texto : o)) });
  }

  function quitarOpcion(i: number, j: number) {
    const p = preguntas[i]!;
    // Si se quita la que estaba marcada como correcta, la marca desaparece; y si
    // se quita una anterior, el índice de la correcta se desplaza. Sin esto, la
    // marca acabaría señalando a otra opción sin que nadie lo note.
    const correcta =
      p.correcta === undefined ? undefined
        : p.correcta === j ? undefined
        : p.correcta > j ? p.correcta - 1
        : p.correcta;
    cambiarPregunta(i, { opciones: p.opciones.filter((_, k) => k !== j), correcta });
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await guardarDesafio({
        id: desafio?.id,
        titulo: String(f.get('titulo') ?? ''),
        descripcion: String(f.get('descripcion') ?? '') || null,
        preguntas,
        puntosPremio: Number(f.get('puntosPremio') ?? 0),
        premioDescripcion: String(f.get('premioDescripcion') ?? '') || null,
        lineaProducto: String(f.get('lineaProducto') ?? '') || null,
        zona: String(f.get('zona') ?? '') || null,
        // Los datetime-local vienen en hora local del navegador; toISOString los
        // pasa a UTC, que es como los guarda Postgres.
        empiezaEn: f.get('empiezaEn') ? new Date(String(f.get('empiezaEn'))).toISOString() : null,
        terminaEn: f.get('terminaEn') ? new Date(String(f.get('terminaEn'))).toISOString() : null,
      });
      if (r.ok) { setError(null); dialogo.current?.close(); }
      else setError(r.error ?? 'No se pudo guardar');
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';
  const boton = 'texto-suave rounded border borde-tema px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800';

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
        {editando ? 'Editar' : 'Nuevo desafío'}
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(44rem,94vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form onSubmit={enviar} className="max-h-[85vh] overflow-y-auto p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? 'Editar desafío' : 'Nuevo desafío'}
          </h2>

          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor="titulo">Título</label>
              <input id="titulo" name="titulo" required defaultValue={desafio?.titulo} className={campo} />
            </div>

            <div>
              <label className={etiqueta} htmlFor="descripcion">Descripción (opcional)</label>
              <input
                id="descripcion" name="descripcion" defaultValue={desafio?.descripcion ?? ''}
                placeholder="Se le enseña al comensal antes de empezar" className={campo}
              />
            </div>

            {/* --- Preguntas --- */}
            <div>
              <p className={etiqueta}>Preguntas</p>

              <ol className="space-y-4">
                {preguntas.map((p, i) => (
                  <li key={i} className="rounded-md border borde-tema p-3">
                    <div className="flex items-start gap-2">
                      <span className="texto-suave cifras mt-2 shrink-0 text-xs">{i + 1}</span>
                      <input
                        value={p.pregunta}
                        onChange={(e) => cambiarPregunta(i, { pregunta: e.target.value })}
                        placeholder="¿Qué nota te recordó más?"
                        className={campo}
                      />
                      {preguntas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPreguntas(preguntas.filter((_, j) => j !== i))}
                          aria-label={`Quitar la pregunta ${i + 1}`}
                          className={`${boton} mt-1 shrink-0`}
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="mt-2 space-y-1.5 pl-6">
                      {p.opciones.map((o, j) => (
                        <div key={j} className="flex items-center gap-2">
                          {/* El radio marca la correcta. Es un control por
                              pregunta, no por opción: solo puede haber una. */}
                          <input
                            type="radio"
                            name={`correcta-${i}`}
                            checked={p.correcta === j}
                            onChange={() => cambiarPregunta(i, { correcta: j })}
                            aria-label={`La opción ${j + 1} es la correcta`}
                            className="h-4 w-4 shrink-0 accent-orange-600"
                          />
                          <input
                            value={o}
                            onChange={(e) => cambiarOpcion(i, j, e.target.value)}
                            placeholder={`Opción ${j + 1}`}
                            className={campo}
                          />
                          {p.opciones.length > 2 && (
                            <button
                              type="button"
                              onClick={() => quitarOpcion(i, j)}
                              aria-label={`Quitar la opción ${j + 1}`}
                              className={`${boton} shrink-0`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {p.opciones.length < MAX_OPCIONES && (
                          <button
                            type="button"
                            onClick={() => cambiarPregunta(i, { opciones: [...p.opciones, ''] })}
                            className={boton}
                          >
                            Añadir opción
                          </button>
                        )}
                        {p.correcta !== undefined && (
                          <button
                            type="button"
                            onClick={() => cambiarPregunta(i, { correcta: undefined })}
                            className={boton}
                          >
                            Quitar la marca de correcta
                          </button>
                        )}
                        {p.correcta === undefined && (
                          <span className="texto-suave text-xs">
                            Sin correcta: cuenta como pregunta de opinión.
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {preguntas.length < MAX_PREGUNTAS && (
                <button
                  type="button"
                  onClick={() => setPreguntas([...preguntas, preguntaVacia()])}
                  className={`${boton} mt-2`}
                >
                  Añadir pregunta
                </button>
              )}
            </div>

            {/* --- Premio --- */}
            <div className="grid grid-cols-[8rem_1fr] gap-3">
              <div>
                <label className={etiqueta} htmlFor="puntosPremio">Puntos</label>
                <input
                  id="puntosPremio" name="puntosPremio" type="number" min={0}
                  defaultValue={desafio?.puntosPremio ?? 50} className={`${campo} cifras`}
                />
              </div>
              <div>
                <label className={etiqueta} htmlFor="premioDescripcion">Premio (opcional)</label>
                <input
                  id="premioDescripcion" name="premioDescripcion"
                  defaultValue={desafio?.premioDescripcion ?? ''}
                  placeholder="Un shot de cortesía" className={campo}
                />
              </div>
            </div>
            <p className="texto-suave text-xs">
              Los puntos se reparten según cuántas acierte. Si ninguna pregunta tiene respuesta
              correcta marcada, se dan enteros por participar.
            </p>

            {/* --- Alcance --- */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="lineaProducto">Línea (opcional)</label>
                <select
                  id="lineaProducto" name="lineaProducto"
                  defaultValue={desafio?.lineaProducto ?? ''} className={campo}
                >
                  <option value="">Cualquiera</option>
                  {lineas.map((l) => (
                    <option key={l.codigo} value={l.codigo}>{l.etiqueta}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="zona">Zona (opcional)</label>
                <input
                  id="zona" name="zona" defaultValue={desafio?.zona ?? ''}
                  placeholder="Todas" className={campo}
                />
              </div>
            </div>
            <p className="texto-suave text-xs">
              Con línea o zona, el desafío solo se le ofrece a quien acaba de escanear eso.
            </p>

            {/* --- Ventana --- */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="empiezaEn">Empieza (opcional)</label>
                <input
                  id="empiezaEn" name="empiezaEn" type="datetime-local"
                  defaultValue={paraInput(desafio?.empiezaEn ?? null)} className={campo}
                />
              </div>
              <div>
                <label className={etiqueta} htmlFor="terminaEn">Termina (opcional)</label>
                <input
                  id="terminaEn" name="terminaEn" type="datetime-local"
                  defaultValue={paraInput(desafio?.terminaEn ?? null)} className={campo}
                />
              </div>
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
