'use client';

// =============================================================================
// Alta y edición de una pieza de contenido
// =============================================================================
//
// Un <dialog> nativo, igual que el editor de premios: trae el foco atrapado, el
// cierre con Escape y el fondo inerte sin escribir una línea de eso.

import { useRef, useState, useTransition } from 'react';
import { guardarContenido } from '@/lib/acciones/contenido';
import { LINEAS_PRODUCTO } from '@/lib/catalogo-b2c';
import { TIPOS_CONTENIDO, CANALES_CONTENIDO, ESTADOS_CONTENIDO } from '@/lib/catalogo-contenido';

export interface Pieza {
  id: string;
  titulo: string;
  tipo: string;
  canal: string;
  lineaProducto: string | null;
  estado: string;
  gancho: string | null;
  notas: string | null;
  url: string | null;
  alcance: number | null;
  interacciones: number | null;
  loteId: string | null;
  mediaKey: string | null;
  mediaTipo: string | null;
}

const TIPOS = TIPOS_CONTENIDO;
const CANALES = CANALES_CONTENIDO;
const ESTADOS = ESTADOS_CONTENIDO;

export function EditorContenido({
  pieza,
  lotesDisponibles = [],
}: {
  pieza?: Pieza;
  lotesDisponibles?: Array<{ id: string; codigo: string }>;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState(pieza?.estado ?? 'idea');
  const [enCurso, iniciar] = useTransition();

  // El archivo se sube ANTES de guardar la pieza, al elegirlo: así el botón
  // Guardar solo tiene que mandar la clave que ya quedó en R2, no el archivo
  // entero como parte del formulario.
  const [subiendo, setSubiendo] = useState(false);
  const [media, setMedia] = useState<{ key: string; tipo: string } | null>(
    pieza?.mediaKey ? { key: pieza.mediaKey, tipo: pieza.mediaTipo ?? '' } : null
  );

  const editando = Boolean(pieza);

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      const r = await fetch('/api/contenido/subir', { method: 'POST', body: form });
      const d = (await r.json()) as { ok: boolean; key?: string; tipo?: string; error?: string };
      if (!r.ok || !d.ok || !d.key) throw new Error(d.error ?? 'No se pudo subir el archivo');
      setMedia({ key: d.key, tipo: d.tipo ?? archivo.type });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el archivo');
      e.target.value = '';
    } finally {
      setSubiendo(false);
    }
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    iniciar(async () => {
      const r = await guardarContenido({
        id: pieza?.id,
        titulo: String(f.get('titulo') ?? ''),
        tipo: String(f.get('tipo') ?? 'video'),
        canal: String(f.get('canal') ?? 'instagram'),
        lineaProducto: String(f.get('lineaProducto') ?? ''),
        estado: String(f.get('estado') ?? 'idea'),
        gancho: String(f.get('gancho') ?? ''),
        notas: String(f.get('notas') ?? ''),
        url: String(f.get('url') ?? ''),
        alcance: String(f.get('alcance') ?? ''),
        interacciones: String(f.get('interacciones') ?? ''),
        loteId: String(f.get('loteId') ?? ''),
        mediaKey: media?.key,
        mediaTipo: media?.tipo,
      });

      if (r.ok) {
        setError(null);
        dialogo.current?.close();
        if (!editando) { formulario.current?.reset(); setMedia(null); }
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
          setEstado(pieza?.estado ?? 'idea');
          if (!editando) { formulario.current?.reset(); setMedia(null); }
          dialogo.current?.showModal();
        }}
        className={
          editando
            ? 'texto-suave text-xs hover:underline'
            : 'rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500'
        }
      >
        {editando ? 'Editar' : 'Nueva pieza'}
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(34rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => setError(null)}
      >
        <form ref={formulario} onSubmit={enviar} className="p-5">
          <h2 className="mb-4 text-base font-semibold">
            {editando ? 'Editar pieza' : 'Nueva pieza de contenido'}
          </h2>

          <div className="space-y-3">
            <div>
              <label className={etiqueta} htmlFor="titulo">Título</label>
              <input id="titulo" name="titulo" required maxLength={200} defaultValue={pieza?.titulo} className={campo} />
            </div>

            <div>
              <label className={etiqueta} htmlFor="gancho">Gancho</label>
              <input
                id="gancho" name="gancho" maxLength={500} defaultValue={pieza?.gancho ?? ''}
                placeholder="La primera frase, la que decide si paran de deslizar"
                className={campo}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="tipo">Tipo</label>
                <select id="tipo" name="tipo" defaultValue={pieza?.tipo ?? 'video'} className={campo}>
                  {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="canal">Canal</label>
                <select id="canal" name="canal" defaultValue={pieza?.canal ?? 'instagram'} className={campo}>
                  {CANALES.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={etiqueta} htmlFor="lineaProducto">Línea</label>
                <select id="lineaProducto" name="lineaProducto" defaultValue={pieza?.lineaProducto ?? ''} className={campo}>
                  <option value="">Transversal a la marca</option>
                  {LINEAS_PRODUCTO.map((l) => (
                    <option key={l.codigo} value={l.codigo}>{l.etiqueta}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={etiqueta} htmlFor="estado">Estado</label>
                <select
                  id="estado" name="estado" value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className={campo}
                >
                  {ESTADOS.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                </select>
              </div>
            </div>

            {lotesDisponibles.length > 0 && (
              <div>
                <label className={etiqueta} htmlFor="loteId">Lote del que habla</label>
                <select id="loteId" name="loteId" defaultValue={pieza?.loteId ?? ''} className={campo}>
                  <option value="">Sin lote específico</option>
                  {lotesDisponibles.map((l) => (
                    <option key={l.id} value={l.id}>{l.codigo}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={etiqueta} htmlFor="archivo">Archivo</label>
              <input
                id="archivo" type="file" accept="image/*,video/mp4,video/quicktime,video/webm"
                onChange={alElegirArchivo} disabled={subiendo}
                className={`${campo} file:mr-3 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-white`}
              />
              {subiendo && <p className="texto-suave mt-1 text-xs">Subiendo…</p>}
              {media && !subiendo && (
                <div className="mt-2 flex items-center gap-2">
                  {media.tipo.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/contenido/media/${media.key}`}
                      alt="" className="h-14 w-14 rounded-md border borde-tema object-cover"
                    />
                  ) : (
                    <span className="texto-suave text-xs">Vídeo subido ✓</span>
                  )}
                  <button
                    type="button" onClick={() => setMedia(null)}
                    className="texto-suave text-xs hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              )}
              <p className="texto-suave mt-1 text-xs">Imagen o vídeo corto, hasta 25 MB. Opcional.</p>
            </div>

            <div>
              <label className={etiqueta} htmlFor="url">Enlace</label>
              <input
                id="url" name="url" type="url" maxLength={500} defaultValue={pieza?.url ?? ''}
                placeholder="Donde vive la pieza ya publicada (el reel, el post)"
                className={campo}
              />
            </div>

            {/*
              Los resultados solo se piden una vez publicado. Antes de eso el
              campo estaría siempre vacío y solo añadiría ruido al formulario.
            */}
            {estado === 'publicado' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={etiqueta} htmlFor="alcance">Alcance</label>
                  <input
                    id="alcance" name="alcance" type="number" min={0}
                    defaultValue={pieza?.alcance ?? ''} placeholder="Sin medir" className={campo}
                  />
                </div>
                <div>
                  <label className={etiqueta} htmlFor="interacciones">Interacciones</label>
                  <input
                    id="interacciones" name="interacciones" type="number" min={0}
                    defaultValue={pieza?.interacciones ?? ''} placeholder="Sin medir" className={campo}
                  />
                </div>
                <p className="texto-suave col-span-2 text-xs">
                  Se teclean a mano. No se conectan con Instagram: una integración así se rompe cada
                  vez que Meta cambia algo, y una cifra congelada engaña más que una casilla vacía.
                </p>
              </div>
            )}

            <div>
              <label className={etiqueta} htmlFor="notas">Notas</label>
              <textarea id="notas" name="notas" rows={2} maxLength={2000} defaultValue={pieza?.notas ?? ''} className={campo} />
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
              disabled={enCurso || subiendo}
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
