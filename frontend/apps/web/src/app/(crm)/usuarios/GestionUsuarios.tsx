'use client';

// =============================================================================
// Alta y gestión de usuarios del equipo
// =============================================================================
//
// Las salvaguardas de "no dejar el sistema sin administrador" viven en el
// servidor, no aquí: ocultar un botón no impide invocar la Server Action. Esto
// solo evita que alguien lo intente y reciba un error innecesario.

import { useRef, useState, useTransition } from 'react';
import { alternarUsuario, cambiarRol, invitarUsuario } from '@/lib/acciones/comensales';
import { ETIQUETAS_ROL, type Rol } from '@/lib/roles';

const ROLES: Rol[] = ['admin', 'comercial', 'lectura'];

export function NuevoUsuario() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    iniciar(async () => {
      const r = await invitarUsuario({
        email: String(f.get('email') ?? ''),
        fullName: String(f.get('fullName') ?? ''),
        rol: String(f.get('rol') ?? 'lectura') as Rol,
      });

      if (r.ok && r.datos) {
        setError(null);
        // El enlace se arma aquí, no en el servidor: la Server Action no
        // conoce el dominio desde el que se está sirviendo esta pestaña.
        setEnlace(`${window.location.origin}/activar?token=${r.datos.token}`);
      } else {
        setError(r.error ?? 'No se pudo invitar');
      }
    });
  }

  const campo = 'superficie w-full rounded-md border borde-tema px-3 py-2 text-sm';
  const etiqueta = 'texto-suave mb-1 block text-xs font-medium';

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setEnlace(null); dialogo.current?.showModal(); }}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Nuevo usuario
      </button>

      <dialog
        ref={dialogo}
        className="superficie w-[min(28rem,92vw)] rounded-xl border borde-tema p-0 backdrop:bg-black/60"
        onClose={() => { setError(null); setEnlace(null); }}
      >
        {enlace ? (
          <div className="p-5">
            <h2 className="text-base font-semibold">Invitación creada</h2>
            <p className="texto-suave mt-2 text-sm">
              Comparte este enlace por un canal privado. Vale por {' '}
              7 días, y solo sirve una vez: al entrar y poner su contraseña, deja de
              funcionar. Nadie en el equipo —ni tú— llega a ver esa contraseña.
            </p>
            <p className="cifras mt-3 break-all select-all rounded-md border borde-tema px-3 py-2 text-xs">
              {enlace}
            </p>
            <button
              type="button"
              onClick={() => dialogo.current?.close()}
              className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Ya lo copié
            </button>
          </div>
        ) : (
          <form onSubmit={enviar} className="p-5">
            <h2 className="mb-4 text-base font-semibold">Nuevo usuario</h2>

            <div className="space-y-3">
              <div>
                <label className={etiqueta} htmlFor="fullName">Nombre</label>
                <input id="fullName" name="fullName" required className={campo} />
              </div>
              <div>
                <label className={etiqueta} htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required className={campo} />
              </div>
              <div>
                <label className={etiqueta} htmlFor="rol">Rol</label>
                <select id="rol" name="rol" defaultValue="lectura" className={campo}>
                  {ROLES.map((r) => <option key={r} value={r}>{ETIQUETAS_ROL[r]}</option>)}
                </select>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button" onClick={() => dialogo.current?.close()}
                className="rounded-md border borde-tema px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit" disabled={enCurso}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {enCurso ? 'Invitando…' : 'Invitar'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

export function ControlesUsuario({
  id,
  rol,
  activo,
  esUnoMismo,
}: {
  id: string;
  rol: Rol;
  activo: boolean;
  esUnoMismo: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        value={rol}
        disabled={enCurso || esUnoMismo}
        onChange={(e) => {
          const nuevo = e.target.value as Rol;
          iniciar(async () => {
            const r = await cambiarRol({ id, rol: nuevo });
            setError(r.ok ? null : r.error ?? 'No se pudo cambiar');
          });
        }}
        className="superficie rounded-md border borde-tema px-2 py-1 text-xs disabled:opacity-50"
        title={esUnoMismo ? 'No puedes cambiar tu propio rol' : undefined}
      >
        {ROLES.map((r) => <option key={r} value={r}>{ETIQUETAS_ROL[r]}</option>)}
      </select>

      <button
        type="button"
        disabled={enCurso || esUnoMismo}
        onClick={() => {
          iniciar(async () => {
            const r = await alternarUsuario(id, !activo);
            setError(r.ok ? null : r.error ?? 'No se pudo cambiar');
          });
        }}
        className={`rounded-md px-3 py-1 text-xs disabled:opacity-50 ${
          activo
            ? 'border borde-tema hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'bg-green-600 text-white hover:bg-green-500'
        }`}
        title={esUnoMismo ? 'No puedes desactivarte a ti mismo' : undefined}
      >
        {activo ? 'Desactivar' : 'Activar'}
      </button>

      {error && <p className="w-full text-right text-xs text-red-400">{error}</p>}
    </div>
  );
}
